import os,tempfile,unittest
from automation_tools_production import AutomationJournal,AutomationConflict,ApprovalDenied

class AutomationJournalTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"automation.db")
  self.now=[100.0];self.clock=lambda:self.now[0]
  self.store=AutomationJournal(self.path,clock=self.clock)
  self.store.start_run("tenant-a","run-1","document-review")
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_step_commit_replay_and_payload_conflict(self):
  self.assertFalse(self.store.record_step("tenant-a","run-1","fetch","run-1:fetch",{"id":"doc-1"},{"status":"ready"},0)["duplicate"])
  self.assertTrue(self.store.record_step("tenant-a","run-1","fetch","run-1:fetch",{"id":"doc-1"},{"status":"ready"},0)["duplicate"])
  with self.assertRaises(AutomationConflict):self.store.record_step("tenant-a","run-1","fetch","run-1:fetch",{"id":"doc-2"},{"status":"ready"},1)
 def test_approval_requires_exact_payload_authorized_person_and_expiry(self):
  action={"recipient":"manager@example","body":"Review complete"}
  self.store.request_approval("tenant-a","run-1","approval-1",action,"notification",["manager-1"],150)
  with self.assertRaises(ApprovalDenied):self.store.decide_approval("tenant-a","approval-1","manager-1",{**action,"body":"Changed"},"approved")
  with self.assertRaises(ApprovalDenied):self.store.decide_approval("tenant-a","approval-1","other",action,"approved")
  self.store.decide_approval("tenant-a","approval-1","manager-1",action,"approved")
  self.assertTrue(self.store.consume_approval("tenant-a","approval-1",action))
  with self.assertRaises(ApprovalDenied):self.store.consume_approval("tenant-a","approval-1",action)
 def test_expired_approval_cannot_be_decided(self):
  action={"delete":"doc-1"}
  self.store.request_approval("tenant-a","run-1","approval-2",action,"document",["manager"],105)
  self.now[0]=105
  with self.assertRaises(ApprovalDenied):self.store.decide_approval("tenant-a","approval-2","manager",action,"approved")
 def test_tenant_isolation(self):
  with self.assertRaises(KeyError):self.store.snapshot("tenant-b","run-1")
  with self.assertRaises(KeyError):self.store.decide_approval("tenant-b","approval-x","manager",{},"approved")
 def test_reopen_persists_steps_approvals_and_audit(self):
  action={"send":"doc-1"}
  self.store.record_step("tenant-a","run-1","review","k1",{"doc":"doc-1"},{"status":"done"},0)
  self.store.request_approval("tenant-a","run-1","approval-1",action,"notification",["manager"],150)
  self.store.close();self.store=AutomationJournal(self.path,clock=self.clock)
  snap=self.store.snapshot("tenant-a","run-1")
  self.assertEqual(snap["steps"][0]["status"],"completed")
  self.assertEqual(snap["approvals"][0]["status"],"pending")
  self.assertGreaterEqual(len(snap["audit"]),3)
if __name__=="__main__":unittest.main()
