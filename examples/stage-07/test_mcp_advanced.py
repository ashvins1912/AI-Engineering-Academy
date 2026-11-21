import unittest
from mcp_advanced import RequestStateSigner,RequestStateError,MultiRoundTripEngine,TaskManager,ProgressReporter,deprecated_capability_guidance

class MCPAdvancedTests(unittest.TestCase):
 def setUp(self):self.signer=RequestStateSigner("test-secret-that-is-long-enough");self.engine=MultiRoundTripEngine(self.signer)
 def test_multi_round_trip_accepted(self):
  first=self.engine.start("c1","ORD-7",12500,100)
  self.assertEqual(first["resultType"],"input_required")
  result=self.engine.resume(first["requestState"],{"refund_approval":{"kind":"elicit","action":"accept","content":{"approved":True}}},101)
  self.assertEqual(result["status"],"APPROVED_FOR_REVIEW")
  self.assertIn("does not itself execute",result["note"])
 def test_decline_cancel_and_invalid_content(self):
  first=self.engine.start("c1","ORD-7",1000,100)
  self.assertEqual(self.engine.resume(first["requestState"],{"refund_approval":{"kind":"elicit","action":"decline"}},101)["status"],"CANCELLED")
  first=self.engine.start("c2","ORD-8",1000,100)
  with self.assertRaises(RequestStateError):self.engine.resume(first["requestState"],{"refund_approval":{"kind":"elicit","action":"accept","content":{"approved":"yes"}}},101)
 def test_multi_round_trip_limit(self):
  engine=MultiRoundTripEngine(self.signer,max_rounds=2)
  first=engine.start("c1","ORD-7",1000,100)
  second=engine.resume(first["requestState"],{},101)
  with self.assertRaises(RequestStateError):engine.resume(second["requestState"],{},102)
 def test_request_state_tamper_and_expiry(self):
  first=self.engine.start("c1","ORD-7",1000,100)
  token=first["requestState"][:-1]+("A" if first["requestState"][-1]!="A" else "B")
  with self.assertRaises(RequestStateError):self.engine.resume(token,{},101)
  with self.assertRaises(RequestStateError):self.engine.resume(first["requestState"],{},500)
 def test_task_tenant_isolation_and_terminal_state(self):
  tasks=TaskManager();tasks.create("task-1","tenant-a")
  with self.assertRaises(KeyError):tasks.get("task-1","tenant-b")
  tasks.update("task-1","tenant-a","completed",{"ok":True})
  with self.assertRaises(ValueError):tasks.update("task-1","tenant-a","working")
 def test_task_subscription_and_cooperative_cancel(self):
  tasks=TaskManager();tasks.create("task-2","tenant-a");tasks.subscribe("client-1",["task-2"])
  self.assertEqual(len(tasks.notifications("client-1")),1)
  self.assertTrue(tasks.cancel("task-2","tenant-a")["cancelRequested"])
 def test_progress_monotonic(self):
  p=ProgressReporter();self.assertEqual(p.update(.4)["params"]["progress"],.4);p.update(.8)
  with self.assertRaises(ValueError):p.update(.7)
  with self.assertRaises(ValueError):p.update(1.1)
 def test_deprecated_capabilities_have_migrations(self):
  d=deprecated_capability_guidance()
  self.assertTrue(d["roots"]["deprecated"]);self.assertIn("provider",d["sampling"]["replacement"])
if __name__=="__main__":unittest.main()
