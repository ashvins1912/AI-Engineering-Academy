import unittest
from state import Workflow, demo

class WorkflowStateTests(unittest.TestCase):
    def test_happy_path_and_recovery(self):
        flow = demo()
        self.assertEqual(flow.state, "COMPLETED")
        self.assertEqual(flow.version, 5)
        self.assertEqual(flow.operations["pay:ORD-1042:v1"]["charge_id"], "ch_1042")

    def test_illegal_transition_rejected(self):
        flow = Workflow("o1")
        with self.assertRaises(ValueError):
            flow.transition("COMPLETED", expected_version=0, actor="worker")

    def test_stale_version_rejected(self):
        flow = Workflow("o1")
        flow.transition("VALIDATED", expected_version=0, actor="api")
        with self.assertRaises(RuntimeError):
            flow.transition("PAYMENT_PENDING", expected_version=0, actor="worker")

    def test_idempotency_key_returns_original_result(self):
        flow = Workflow("o1")
        first = flow.record_operation("charge:o1:v1", {"charge_id": "c1"})
        second = flow.record_operation("charge:o1:v1", {"charge_id": "c2"})
        self.assertEqual(first, second)
        self.assertEqual(second["charge_id"], "c1")

if __name__ == "__main__":
    unittest.main()
