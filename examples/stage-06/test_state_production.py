import os
import tempfile
import unittest
from state_production import DurableWorkflowStore

class DurableWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.now = 100
        self.temp = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.temp.name, "workflow.sqlite")
        self.store = DurableWorkflowStore(self.path, clock=lambda: self.now)
        self.store.create("ORD-1", "acme", {"order_id": "ORD-1"})

    def tearDown(self):
        self.store.close()
        self.temp.cleanup()

    def claim(self, worker):
        return self.store.claim("ORD-1", tenant_id="acme", worker_id=worker, lease_seconds=10)

    def transition(self, target, lease, version, worker):
        return self.store.transition("ORD-1", target, tenant_id="acme", worker_id=worker,
            fence=lease["fence"], expected_version=version, actor=worker)

    def test_checkpoint_and_event_survive_reopen(self):
        lease = self.claim("worker-A")
        self.transition("VALIDATED", lease, 0, "worker-A")
        self.store.close()
        reopened = DurableWorkflowStore(self.path, clock=lambda: self.now)
        self.assertEqual(reopened.load("ORD-1", tenant_id="acme")["state"], "VALIDATED")
        self.assertEqual(len(reopened.events("ORD-1", tenant_id="acme")), 2)
        reopened.close()
        self.store = DurableWorkflowStore(self.path, clock=lambda: self.now)

    def test_crash_after_provider_success_retries_same_key_once(self):
        lease = self.claim("worker-A")
        self.transition("VALIDATED", lease, 0, "worker-A")
        self.transition("PAYMENT_PENDING", lease, 1, "worker-A")
        key = "pay:ORD-1:v1"
        first = self.store.record_operation("ORD-1", key, {"charge_id": "ch_1"}, tenant_id="acme")
        # Worker crashes here: provider result exists, workflow state is still PAYMENT_PENDING.
        self.now += 11
        next_lease = self.claim("worker-B")
        retry = self.store.record_operation("ORD-1", key, {"charge_id": "duplicate"}, tenant_id="acme")
        self.assertEqual(first, retry)
        result = self.transition("PAYMENT_CONFIRMED", next_lease, 2, "worker-B")
        self.assertEqual(result["state"], "PAYMENT_CONFIRMED")
        self.assertEqual(retry["charge_id"], "ch_1")

    def test_stale_worker_fence_rejected(self):
        first = self.claim("worker-A")
        self.now += 11
        second = self.claim("worker-B")
        with self.assertRaises(PermissionError):
            self.transition("VALIDATED", first, 0, "worker-A")
        self.assertGreater(second["fence"], first["fence"])

    def test_lease_prevents_concurrent_owner(self):
        self.claim("worker-A")
        with self.assertRaises(RuntimeError):
            self.claim("worker-B")

    def test_version_conflict_and_illegal_transition_rejected(self):
        lease = self.claim("worker-A")
        with self.assertRaises(ValueError):
            self.transition("COMPLETED", lease, 0, "worker-A")
        self.transition("VALIDATED", lease, 0, "worker-A")
        with self.assertRaises(RuntimeError):
            self.transition("PAYMENT_PENDING", lease, 0, "worker-A")

    def test_event_and_checkpoint_are_atomic_on_invalid_transition(self):
        lease = self.claim("worker-A")
        before = len(self.store.events("ORD-1", tenant_id="acme"))
        with self.assertRaises(ValueError):
            self.transition("COMPLETED", lease, 0, "worker-A")
        self.assertEqual(len(self.store.events("ORD-1", tenant_id="acme")), before)
        self.assertEqual(self.store.load("ORD-1", tenant_id="acme")["version"], 0)

    def test_tenant_scope_is_enforced(self):
        with self.assertRaises(KeyError):
            self.store.load("ORD-1", tenant_id="other")
        with self.assertRaises(KeyError):
            self.store.record_operation("ORD-1", "x", {}, tenant_id="other")

    def test_approval_is_authenticated_bound_and_single_use(self):
        lease = self.claim("worker-A")
        self.transition("VALIDATED", lease, 0, "worker-A")
        self.transition("PAYMENT_PENDING", lease, 1, "worker-A")
        self.transition("PAYMENT_CONFIRMED", lease, 2, "worker-A")
        self.transition("PAUSED_FOR_APPROVAL", lease, 3, "worker-A")
        self.store.request_approval("approval-1", "ORD-1", tenant_id="acme",
            action="book_shipment", expected_version=4, expires_at=200)
        with self.assertRaises(PermissionError):
            self.store.decide_approval("approval-1", tenant_id="acme", approver="agent",
                allowed_approvers={"finance"}, decision="approved", action="book_shipment")
        result = self.store.decide_approval("approval-1", tenant_id="acme", approver="finance",
            allowed_approvers={"finance"}, decision="approved", action="book_shipment")
        self.assertEqual(result["decision"], "approved")
        with self.assertRaises(PermissionError):
            self.store.decide_approval("approval-1", tenant_id="acme", approver="finance",
                allowed_approvers={"finance"}, decision="approved", action="book_shipment")

    def test_expired_approval_rejected(self):
        lease = self.claim("worker-A")
        for version, state in enumerate(["VALIDATED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PAUSED_FOR_APPROVAL"]):
            self.transition(state, lease, version, "worker-A")
        self.store.request_approval("approval-exp", "ORD-1", tenant_id="acme",
            action="book_shipment", expected_version=4, expires_at=105)
        self.now = 106
        with self.assertRaises(PermissionError):
            self.store.decide_approval("approval-exp", tenant_id="acme", approver="finance",
                allowed_approvers={"finance"}, decision="approved", action="book_shipment")

if __name__ == "__main__":
    unittest.main()
