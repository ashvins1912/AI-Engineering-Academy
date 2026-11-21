import os,tempfile,unittest
from workflow_patterns_production import WorkflowJournal,WorkflowConflict

class WorkflowJournalTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"workflow.db")
  self.store=WorkflowJournal(self.path,clock=lambda:100.0)
  self.store.create_run("tenant-a","run-1","order-fulfillment",{"order_id":"ORD-7"})
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_step_commit_idempotent_replay_and_event_order(self):
  first=self.store.record_step("tenant-a","run-1","reserve","run-1:reserve",0,{"reservation":"r-1"})
  self.assertFalse(first["duplicate"])
  retry=self.store.record_step("tenant-a","run-1","reserve","run-1:reserve",0,{"reservation":"r-1"})
  self.assertTrue(retry["duplicate"])
  self.assertEqual([e["sequence"] for e in retry["run"]["events"]],[1,2])
 def test_same_step_different_payload_or_key_conflicts(self):
  self.store.record_step("tenant-a","run-1","reserve","key-1",0,{"reservation":"r-1"})
  with self.assertRaises(WorkflowConflict):self.store.record_step("tenant-a","run-1","reserve","key-2",1,{"reservation":"r-1"})
  with self.assertRaises(WorkflowConflict):self.store.record_step("tenant-a","run-1","reserve","key-1",1,{"reservation":"r-2"})
 def test_tenant_isolation(self):
  with self.assertRaises(KeyError):self.store.get_run("tenant-b","run-1")
  with self.assertRaises(KeyError):self.store.record_step("tenant-b","run-1","x","k",0,{})
 def test_optimistic_version_and_compensation(self):
  self.store.record_step("tenant-a","run-1","reserve","k1",0,{"reservation":"r1"})
  self.store.record_compensation("tenant-a","run-1","reserve",1,"compensated")
  run=self.store.get_run("tenant-a","run-1")
  self.assertEqual(run["steps"][0]["compensation_state"],"compensated")
  with self.assertRaises(WorkflowConflict):self.store.finish_run("tenant-a","run-1",1,"compensated")
  self.store.finish_run("tenant-a","run-1",2,"compensated")
 def test_compensation_failure_can_be_recorded(self):
  self.store.record_step("tenant-a","run-1","payment","k1",0,{"provider_id":"p1"})
  run=self.store.record_compensation("tenant-a","run-1","payment",1,"failed","provider unavailable")
  self.assertEqual(run["steps"][0]["compensation_state"],"failed")
 def test_terminal_run_rejects_new_steps(self):
  self.store.finish_run("tenant-a","run-1",0,"completed")
  with self.assertRaises(WorkflowConflict):self.store.record_step("tenant-a","run-1","late","k1",0,{"x":1})
 def test_compensated_terminal_requires_every_step_compensated(self):
  self.store.record_step("tenant-a","run-1","reserve","k1",0,{"reservation":"r1"})
  with self.assertRaises(WorkflowConflict):self.store.finish_run("tenant-a","run-1",1,"compensated")
  self.store.record_compensation("tenant-a","run-1","reserve",1,"compensated")
  self.store.finish_run("tenant-a","run-1",2,"compensated")
 def test_reopen_persistence(self):
  self.store.record_step("tenant-a","run-1","reserve","k1",0,{"reservation":"r1"})
  self.store.close();self.store=WorkflowJournal(self.path,clock=lambda:101.0)
  self.assertEqual(self.store.get_run("tenant-a","run-1")["steps"][0]["result"],{"reservation":"r1"})
if __name__=="__main__":unittest.main()
