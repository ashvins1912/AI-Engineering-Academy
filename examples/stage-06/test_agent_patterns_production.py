import unittest
from agent_patterns_production import BoundedFanout,IdempotentEventProcessor,aggregate_or_fail

class ProductionPatternTests(unittest.TestCase):
 def test_fanout_limits_and_order(self):
  fan=BoundedFanout(max_workers=2,max_items=3,timeout_seconds=2)
  self.assertEqual(fan.run([2,1],lambda x:x*x),[4,1])
  with self.assertRaises(ValueError): fan.run([1,2,3,4],lambda x:x)
 def test_event_processor_is_tenant_scoped_and_idempotent(self):
  calls=[]
  p=IdempotentEventProcessor({"created":lambda x:(calls.append(x["id"]) or x["id"])})
  e={"event_id":"1","type":"created","payload":{"id":"o1"}}
  self.assertEqual(p.process(e,"tenant-a")["status"],"processed")
  self.assertEqual(p.process(e,"tenant-a")["status"],"duplicate")
  self.assertEqual(p.process(e,"tenant-b")["status"],"processed")
  self.assertEqual(calls,["o1","o1"])
 def test_aggregate_partial_failure_is_explicit(self):
  self.assertEqual(aggregate_or_fail([{"ok":1},{"error":"timeout"}])["status"],"partial_failure")
if __name__=="__main__": unittest.main()
