import unittest
from workflow_patterns import *

class WorkflowPatternTests(unittest.TestCase):
 def test_topological_execution_and_parallel_independent_nodes(self):
  graph=WorkflowGraph([WorkflowNode("b",("a",),lambda s:s["a"]+1),WorkflowNode("a",(),lambda s:2)])
  result=graph.execute(max_workers=2)
  self.assertEqual(result["status"],"completed")
  self.assertEqual(result["results"]["b"],3)
  self.assertEqual(result["order"],["a","b"])
 def test_unknown_dependency_and_cycle_rejected(self):
  with self.assertRaises(WorkflowDefinitionError):WorkflowGraph([WorkflowNode("a",("missing",),lambda s:1)])
  with self.assertRaises(WorkflowDefinitionError):WorkflowGraph([WorkflowNode("a",("b",),lambda s:1),WorkflowNode("b",("a",),lambda s:2)])
 def test_branch_target_must_be_registered(self):
  self.assertEqual(choose_branch("approved",{"approved":"pay","review":"human"}),"pay")
  with self.assertRaises(WorkflowDefinitionError):choose_branch("admin",{"approved":"pay"})
 def test_fan_out_fan_in_preserves_input_order_and_partial_failure(self):
  def worker(x):
   if x==2:raise ValueError("bad row")
   return x*2
  result=fan_out_fan_in([1,2,3],worker,2)
  self.assertEqual(result["results"],[2,6])
  self.assertEqual(result["status"],"partial_failure")
  self.assertIn(1,result["failures"])
 def test_map_reduce_aggregates_only_when_all_mapped(self):
  result=map_reduce([1,2,3],lambda x:x*x,sum,2)
  self.assertEqual(result["aggregate"],14)
  failed=map_reduce([1,2],lambda x:(_ for _ in ()).throw(ValueError()) if x==2 else x,sum,2)
  self.assertIsNone(failed["aggregate"])
 def test_dag_partial_failure_blocks_dependents_but_keeps_independent_work(self):
  graph=WorkflowGraph([WorkflowNode("a",(),lambda s:1),WorkflowNode("b",(),lambda s:(_ for _ in ()).throw(RuntimeError("fail"))),WorkflowNode("c",("b",),lambda s:3),WorkflowNode("d",("a",),lambda s:4)])
  result=graph.execute(max_workers=2)
  self.assertEqual(result["status"],"partial_failure")
  self.assertEqual(result["results"]["d"],4)
  self.assertIn("c",result["blocked"])
 def test_saga_compensates_in_reverse_order(self):
  order=[]
  result=run_saga([{"name":"reserve","run":lambda:"r","compensate":lambda r:order.append("release")},{"name":"payment","run":lambda:"p","compensate":lambda p:order.append("void")},{"name":"shipping","run":lambda:(_ for _ in ()).throw(RuntimeError("down"))}])
  self.assertEqual(result["status"],"compensated")
  self.assertEqual(order,["void","release"])
 def test_missing_compensator_is_not_reported_as_rollback(self):
  result=run_saga([{'name':'charge','run':lambda:'p-1'},{'name':'shipping','run':lambda:(_ for _ in ()).throw(RuntimeError('down'))}])
  self.assertEqual(result['status'],'compensation_required')
 def test_compensation_failure_requires_recovery(self):
  result=run_saga([{"name":"reserve","run":lambda:"r","compensate":lambda r:(_ for _ in ()).throw(RuntimeError("release failed"))},{"name":"shipping","run":lambda:(_ for _ in ()).throw(RuntimeError("down"))}])
  self.assertEqual(result["status"],"compensation_required")
if __name__=="__main__":unittest.main()
