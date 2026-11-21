import os,tempfile,unittest
from durable_workflows_production import DurableWorkflowStore,LeaseBusy,StaleWorker,WorkflowConflict

class DurableWorkflowStoreTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"durable.db")
  self.now=[100.0];self.clock=lambda:self.now[0]
  self.store=DurableWorkflowStore(self.path,clock=self.clock)
  self.store.start("tenant-a","loan-1","loan-approval",3,{"application":"A1"})
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def schedule_and_claim(self,max_attempts=3):
  self.store.schedule_activity("tenant-a","loan-1","verify","loan-1:verify",{"app":"A1"},max_attempts)
  return self.store.claim_activity("tenant-a","loan-1","verify","worker-A",10)
 def test_activity_claim_heartbeat_and_completion(self):
  claim=self.schedule_and_claim()
  self.store.heartbeat("tenant-a","loan-1","verify","worker-A",claim["fence"],10)
  result=self.store.complete_activity("tenant-a","loan-1","verify","worker-A",claim["fence"],{"verified":True})
  self.assertEqual(result["status"],"completed")
 def test_expired_lease_fences_stale_worker(self):
  first=self.schedule_and_claim()
  self.now[0]=111
  second=self.store.claim_activity("tenant-a","loan-1","verify","worker-B",10)
  self.assertGreater(second["fence"],first["fence"])
  with self.assertRaises(StaleWorker):self.store.complete_activity("tenant-a","loan-1","verify","worker-A",first["fence"],{"verified":True})
  self.store.complete_activity("tenant-a","loan-1","verify","worker-B",second["fence"],{"verified":True})
 def test_active_lease_blocks_second_worker(self):
  self.schedule_and_claim()
  with self.assertRaises(LeaseBusy):self.store.claim_activity("tenant-a","loan-1","verify","worker-B",10)
 def test_failed_activity_retries_with_same_key_and_budget(self):
  first=self.schedule_and_claim(max_attempts=2)
  self.assertEqual(self.store.fail_activity("tenant-a","loan-1","verify","worker-A",first["fence"],"temporary")["status"],"pending")
  second=self.store.claim_activity("tenant-a","loan-1","verify","worker-B",10)
  self.assertEqual(second["attempt"],2)
  self.assertEqual(self.store.fail_activity("tenant-a","loan-1","verify","worker-B",second["fence"],"again")["status"],"failed")
  with self.assertRaises(WorkflowConflict):self.store.claim_activity("tenant-a","loan-1","verify","worker-C",10)
 def test_duplicate_activity_schedule_replays_completed_result(self):
  claim=self.schedule_and_claim()
  self.store.complete_activity("tenant-a","loan-1","verify","worker-A",claim["fence"],{"ok":True})
  replay=self.store.schedule_activity("tenant-a","loan-1","verify","loan-1:verify",{"app":"A1"})
  self.assertEqual(replay["status"],"completed");self.assertEqual(replay["result"],{"ok":True})
 def test_signal_is_durable_and_deduplicated(self):
  self.assertFalse(self.store.signal("tenant-a","loan-1","approval-1",{"decision":"approved"})["duplicate"])
  self.assertTrue(self.store.signal("tenant-a","loan-1","approval-1",{"decision":"approved"})["duplicate"])
  with self.assertRaises(WorkflowConflict):self.store.signal("tenant-a","loan-1","approval-1",{"decision":"rejected"})
 def test_continue_as_new_links_runs(self):
  new=self.store.continue_as_new("tenant-a","loan-1","loan-1-v2",{"application":"A1","status":"review"})
  old=self.store.snapshot("tenant-a","loan-1")
  self.assertEqual(old["state"],"continued_as_new");self.assertEqual(old["continued_to"],"loan-1-v2")
  self.assertEqual(new["compact_state"]["status"],"review")
 def test_tenant_isolation_and_reopen_persistence(self):
  with self.assertRaises(KeyError):self.store.snapshot("tenant-b","loan-1")
  claim=self.schedule_and_claim()
  self.store.close();self.store=DurableWorkflowStore(self.path,clock=self.clock)
  snap=self.store.snapshot("tenant-a","loan-1")
  self.assertEqual(snap["activities"][0]["fence"],claim["fence"])
if __name__=="__main__":unittest.main()
