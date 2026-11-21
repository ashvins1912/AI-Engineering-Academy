import os,tempfile,unittest,sqlite3
from human_loop_production import ApprovalStore

class ApprovalStoreTests(unittest.TestCase):
    def setUp(self):
        self.now=100; self.tmp=tempfile.TemporaryDirectory(); self.path=os.path.join(self.tmp.name,"approval.sqlite")
        self.store=ApprovalStore(self.path,clock=lambda:self.now)
        self.action={"order_id":"ORD-42","amount":12500,"currency":"INR"}
        self.store.create_request("APR-1","WF-1",tenant_id="acme",requester="agent-1",action=self.action,workflow_version=12,policy_version="refund-v3",allowed_roles={"finance"},quorum=2,expires_at=200)
    def tearDown(self): self.store.close(); self.tmp.cleanup()
    def quorum(self):
        self.store.decide("APR-1",tenant_id="acme",reviewer="f-1",verified_roles={"finance"},decision="APPROVE",current_action=self.action,current_version=12)
        return self.store.decide("APR-1",tenant_id="acme",reviewer="f-2",verified_roles={"finance"},decision="APPROVE",current_action=self.action,current_version=12)
    def test_quorum_and_idempotent_execution(self):
        self.quorum(); calls=[]
        provider=lambda action,key:(calls.append(key) or {"refund_id":"rf-1"})
        a=self.store.execute_once("APR-1",tenant_id="acme",current_action=self.action,current_version=12,idempotency_key="refund:ORD-42:v12",provider=provider)
        b=self.store.execute_once("APR-1",tenant_id="acme",current_action=self.action,current_version=12,idempotency_key="refund:ORD-42:v12",provider=provider)
        self.assertEqual(a,b); self.assertEqual(len(calls),1)
    def test_self_approval_wrong_role_and_tenant(self):
        with self.assertRaises(PermissionError): self.store.decide("APR-1",tenant_id="acme",reviewer="agent-1",verified_roles={"finance"},decision="APPROVE")
        with self.assertRaises(PermissionError): self.store.decide("APR-1",tenant_id="acme",reviewer="x",verified_roles={"support"},decision="APPROVE")
        with self.assertRaises(KeyError): self.store.get_request("APR-1",tenant_id="other")
    def test_duplicate_reviewer_rejected(self):
        self.store.decide("APR-1",tenant_id="acme",reviewer="f-1",verified_roles={"finance"},decision="APPROVE")
        with self.assertRaises(sqlite3.IntegrityError): self.store.decide("APR-1",tenant_id="acme",reviewer="f-1",verified_roles={"finance"},decision="APPROVE")
    def test_payload_and_version_binding(self):
        with self.assertRaises(ValueError): self.store.decide("APR-1",tenant_id="acme",reviewer="f-1",verified_roles={"finance"},decision="APPROVE",current_action={**self.action,"amount":80000})
        with self.assertRaises(ValueError): self.store.decide("APR-1",tenant_id="acme",reviewer="f-1",verified_roles={"finance"},decision="APPROVE",current_version=13)
    def test_expiry(self):
        self.now=201
        with self.assertRaises(PermissionError): self.store.decide("APR-1",tenant_id="acme",reviewer="f-1",verified_roles={"finance"},decision="APPROVE")
    def test_rejection_and_audit(self):
        result=self.store.decide("APR-1",tenant_id="acme",reviewer="f-1",verified_roles={"finance"},decision="REJECT",reason="evidence mismatch")
        self.assertEqual(result["status"],"REJECTED"); self.assertEqual(len(self.store.events("APR-1",tenant_id="acme")),2)
    def test_persistence(self):
        self.store.decide("APR-1",tenant_id="acme",reviewer="f-1",verified_roles={"finance"},decision="APPROVE")
        self.store.close(); self.store=ApprovalStore(self.path,clock=lambda:self.now)
        self.assertEqual(self.store.get_request("APR-1",tenant_id="acme")["status"],"PENDING")
if __name__=="__main__": unittest.main()
