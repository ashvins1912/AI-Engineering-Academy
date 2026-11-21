import unittest
from agent_patterns import router,supervisor,parallel_map,hierarchical,reflection,EventAgent

class PatternTests(unittest.TestCase):
 def test_router_allowlist_and_dispatch(self):
  h={"billing":lambda t:t["amount"]}
  self.assertEqual(router({"route":"billing","amount":10},h)["result"],10)
  with self.assertRaises(ValueError): router({"route":"admin"},h)
 def test_supervisor_delegation_budget_and_worker_allowlist(self):
  workers={"lookup":lambda x:x.upper()}
  self.assertEqual(supervisor({"delegations":[{"worker":"lookup","input":"sku"}]},workers)["results"][0]["result"],"SKU")
  with self.assertRaises(ValueError): supervisor({"delegations":[{"worker":"bad","input":"x"}]},workers)
  with self.assertRaises(ValueError): supervisor({"delegations":[{}]*4},workers,max_delegations=3)
 def test_parallel_preserves_input_order(self):
  self.assertEqual(parallel_map([3,1,2],lambda x:x*x,max_workers=2),[9,1,4])
 def test_hierarchical_decomposes_and_rejects_empty(self):
  self.assertEqual(hierarchical("x",lambda _:["a","b"],str.upper)["results"],["A","B"])
  with self.assertRaises(ValueError): hierarchical("x",lambda _:[],str)
 def test_reflection_is_bounded_and_stops_on_pass(self):
  calls=[]
  result=reflection("x",lambda _:"draft",lambda _,d:{"pass":d=="fixed"},lambda *_:(calls.append(1) or "fixed"),max_revisions=3)
  self.assertEqual(result["draft"],"fixed"); self.assertEqual(len(calls),1)
  limited=reflection("x",lambda _:"draft",lambda *_:{"pass":False},lambda *_:"still draft",max_revisions=2)
  self.assertEqual(limited["revisions"],2)
 def test_event_idempotency_and_unknown_event(self):
  bus=EventAgent({"created":lambda p:{"id":p["id"]}})
  event={"event_id":"e1","type":"created","payload":{"id":"o1"}}
  self.assertEqual(bus.consume(event)["status"],"processed")
  self.assertEqual(bus.consume(event)["status"],"duplicate")
  with self.assertRaises(ValueError): bus.consume({"event_id":"e2","type":"missing","payload":{}})
if __name__=="__main__": unittest.main()
