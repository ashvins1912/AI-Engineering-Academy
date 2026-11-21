import unittest
from durable_workflows import *

class DurableWorkflowTests(unittest.TestCase):
 def test_replay_does_not_reschedule_completed_activity(self):
  w=ReplayWorkflow("loan-42",3)
  self.assertTrue(w.schedule_activity("verify",{"id":"A1"},"k1")["dispatch"])
  w.complete_activity("verify","k1",{"verified":True})
  restarted=ReplayWorkflow("loan-42",3,w.history)
  result=restarted.schedule_activity("verify",{"id":"A1"},"k1")
  self.assertFalse(result["dispatch"]);self.assertEqual(result["result"],{"verified":True})
 def test_activity_key_and_completed_result_are_immutable(self):
  w=ReplayWorkflow("loan-42");w.schedule_activity("charge",{"amount":100},"k1");w.complete_activity("charge","k1",{"provider":"p1"})
  with self.assertRaises(DurableWorkflowError):w.schedule_activity("charge",{"amount":100},"k2")
  with self.assertRaises(DurableWorkflowError):w.complete_activity("charge","k1",{"provider":"p2"})
 def test_duplicate_signal_is_deduplicated(self):
  w=ReplayWorkflow("loan-42")
  self.assertFalse(w.signal("approval-1",{"approved":True})["duplicate"])
  self.assertTrue(w.signal("approval-1",{"approved":False})["duplicate"])
  self.assertEqual(w.state["signals"]["approval-1"],{"approved":True})
 def test_version_marker_is_stable(self):
  w=ReplayWorkflow("loan-42");self.assertEqual(w.version_marker("refund-flow",2),2)
  replay=ReplayWorkflow("loan-42",3,w.history);self.assertEqual(replay.version_marker("refund-flow",2),2)
  with self.assertRaises(DurableWorkflowError):replay.version_marker("refund-flow",3)
 def test_continue_as_new_compacts_state_and_links_runs(self):
  w=ReplayWorkflow("loan-42");new=w.continue_as_new("loan-42-run-2",{"application":"A1","status":"awaiting_review"})
  self.assertEqual(w.state["status"],"continued_as_new")
  self.assertEqual(w.state["continued_to"],"loan-42-run-2")
  self.assertEqual(new.state["status"],"running")
 def test_lease_claim_heartbeat_expiry_and_fencing(self):
  now=[0];clock=lambda:now[0];leases=LeaseManager(clock)
  first=leases.claim("task-1","worker-A",10);leases.heartbeat("task-1","worker-A",first["fence"],10)
  with self.assertRaises(LeaseBusy):leases.claim("task-1","worker-B",10)
  now[0]=11;second=leases.claim("task-1","worker-B",10)
  self.assertGreater(second["fence"],first["fence"])
  with self.assertRaises(StaleWorker):leases.validate("task-1","worker-A",first["fence"])
  self.assertTrue(leases.validate("task-1","worker-B",second["fence"]))
if __name__=="__main__":unittest.main()
