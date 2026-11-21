import unittest
from automation_tools import *

class AutomationToolTests(unittest.TestCase):
 def setUp(self):
  self.vault=CredentialRegistry();self.vault.register("cred-a","tenant-a",{"documents:read"})
  self.principal=Principal("tenant-a","user-1",frozenset({"documents:read"}))
  self.api=APIConnector(self.vault);self.calls=[]
  self.api.register_action("document.get","documents:read",lambda args,user:self.calls.append(args) or {"id":args["id"],"status":"ready"})
 def test_connector_uses_scoped_credential_reference(self):
  result=self.api.execute("document.get",{"id":"doc-1"},self.principal,"cred-a","run-1:doc")
  self.assertEqual(result["status"],"ready")
  self.assertNotIn("token",str(self.vault.refs))
 def test_connector_rejects_scope_or_tenant_mismatch(self):
  with self.assertRaises(ScopeDenied):self.api.execute("document.get",{"id":"doc-1"},Principal("tenant-b","u",frozenset({"documents:read"})),"cred-a","k")
  with self.assertRaises(ScopeDenied):self.api.execute("document.get",{"id":"doc-1"},Principal("tenant-a","u",frozenset()),"cred-a","k")
  self.assertEqual(self.calls,[])
 def test_connector_idempotency_and_payload_conflict(self):
  args={"id":"doc-1"};self.api.execute("document.get",args,self.principal,"cred-a","k1")
  self.api.execute("document.get",args,self.principal,"cred-a","k1")
  self.assertEqual(len(self.calls),1)
  with self.assertRaises(IdempotencyConflict):self.api.execute("document.get",{"id":"doc-2"},self.principal,"cred-a","k1")
 def test_browser_origin_allowlist_and_https(self):
  policy=BrowserPolicy({"https://portal.example"})
  self.assertTrue(policy.validate_navigation("https://portal.example/orders"))
  with self.assertRaises(OriginDenied):policy.validate_navigation("https://evil.example")
  with self.assertRaises(OriginDenied):policy.validate_navigation("http://portal.example")
 def test_browser_uses_accessible_locators_and_sandbox_downloads(self):
  policy=BrowserPolicy({"https://portal.example"})
  self.assertEqual(policy.validate_locator("button","Review")["name"],"Review")
  with self.assertRaises(AutomationError):policy.validate_locator("css",".primary")
  self.assertIn("/sandbox/downloads/",policy.validate_download("contract.pdf"))
  with self.assertRaises(OriginDenied):policy.validate_download("../secrets.txt")
 def test_approval_binds_exact_action_approver_expiry_and_single_use(self):
  gate=ApprovalGate();action={"recipient":"manager@example","body":"Review complete","document":"doc-1"}
  gate.request("approval-1","tenant-a","run-1",action,{"manager-1"},100)
  with self.assertRaises(ApprovalDenied):gate.decide("approval-1","tenant-a","manager-2",action,"approved",50)
  with self.assertRaises(ApprovalDenied):gate.decide("approval-1","tenant-a","manager-1",{**action,"recipient":"attacker@example"},"approved",50)
  gate.decide("approval-1","tenant-a","manager-1",action,"approved",50)
  self.assertTrue(gate.consume("approval-1","tenant-a",action,60))
  with self.assertRaises(ApprovalDenied):gate.consume("approval-1","tenant-a",action,60)
 def test_expired_approval_rejected(self):
  gate=ApprovalGate();action={"delete":"doc-1"}
  gate.request("a","tenant-a","run",action,{"m1"},10)
  with self.assertRaises(ApprovalDenied):gate.decide("a","tenant-a","m1",action,"approved",10)
 def test_duplicate_trigger_is_accepted_once(self):
  run=AutomationRun("tenant-a","run-1")
  self.assertTrue(run.accept_trigger("evt-1"));self.assertFalse(run.accept_trigger("evt-1"))
if __name__=="__main__":unittest.main()
