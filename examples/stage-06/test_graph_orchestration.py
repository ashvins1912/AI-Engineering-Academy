import unittest
from graph_orchestration import StateGraph,InMemoryCheckpoints,build_support_graph

class GraphTests(unittest.TestCase):
 def test_conditional_route_and_trace(self):
  r=build_support_graph().invoke({"question":"Where is my invoice?"})
  self.assertEqual(r["state"].values["intent"],"billing")
  self.assertEqual(r["state"].values["answer"],"Invoice help: check the billing portal.")
  self.assertEqual([x["node"] for x in r["trace"]],["classify","billing"])
 def test_general_route(self):
  r=build_support_graph().invoke({"question":"Hello"})
  self.assertEqual(r["state"].values["intent"],"general")
 def test_checkpoint_resume(self):
  g=StateGraph().add_node("a",lambda s:{"a":1}).add_node("b",lambda s:{"b":2}).set_entry_point("a").add_edge("a","b").add_edge("b","END").add_end("END").compile()
  cp=InMemoryCheckpoints()
  first=g.invoke({},thread_id="t1",max_steps=1,checkpoints=cp)
  self.assertEqual(first["state"].status,"step_limit")
  second=g.invoke({},thread_id="t1",max_steps=5,checkpoints=cp,resume=True)
  self.assertEqual(second["state"].status,"completed")
  self.assertEqual(second["state"].values,{"a":1,"b":2})
 def test_step_budget_stops_cycle(self):
  g=StateGraph().add_node("loop",lambda s:{"n":s.get("n",0)+1}).set_entry_point("loop").add_edge("loop","loop").compile()
  r=g.invoke({},max_steps=3)
  self.assertEqual(r["state"].status,"step_limit")
  self.assertEqual(r["state"].steps,3)
 def test_compile_rejects_unknown_target(self):
  g=StateGraph().add_node("a",lambda s:{}).set_entry_point("a").add_edge("a","missing")
  with self.assertRaises(ValueError): g.compile()
 def test_node_update_must_be_dict(self):
  g=StateGraph().add_node("a",lambda s:"bad").set_entry_point("a").add_edge("a","END").add_end("END").compile()
  with self.assertRaises(TypeError): g.invoke({})
 def test_unmapped_conditional_route_fails_closed(self):
  g=StateGraph().add_node("a",lambda s:{"x":"danger"}).set_entry_point("a").add_conditional_edges("a",lambda s:s["x"],{"safe":"END"}).add_end("END").compile()
  with self.assertRaises(ValueError): g.invoke({})
if __name__=="__main__": unittest.main()
