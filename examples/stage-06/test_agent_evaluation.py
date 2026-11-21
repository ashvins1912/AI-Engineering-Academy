import unittest
from agent_evaluation import EvaluationCase,CandidateTrace,evaluate_case,aggregate

class EvaluationTests(unittest.TestCase):
 def setUp(self):
  self.case=EvaluationCase("refund-1",["refund","approval"],["order_lookup","policy_search"],["orders/7","policy/refund-v3"],True,1000,0.02)
 def good(self):
  return CandidateTrace("Refund is eligible; human approval required.",["order_lookup","policy_search"],["orders/7","policy/refund-v3"],True,500,0.01,[{"step":1},{"step":2}],[])
 def test_success_and_eligible(self):
  r=evaluate_case(self.case,self.good())
  self.assertTrue(r["task_success"]);self.assertTrue(r["eligible"]);self.assertEqual(r["quality_score"],100)
 def test_missing_approval_is_hard_failure(self):
  x=self.good();x.approval_required=False
  r=evaluate_case(self.case,x)
  self.assertFalse(r["eligible"]);self.assertFalse(r["hard_gates"]["safety"])
 def test_wrong_tool_order_and_missing_citation_reduce_quality(self):
  x=self.good();x.tool_calls.reverse();x.citations=["orders/7"]
  r=evaluate_case(self.case,x)
  self.assertFalse(r["task_success"]);self.assertLess(r["quality_score"],100)
 def test_latency_cost_and_trajectory_gates(self):
  x=self.good();x.latency_ms=1500;x.cost_usd=.03;x.trajectory=[{"step":2}]
  r=evaluate_case(self.case,x)
  self.assertFalse(r["eligible"]);self.assertFalse(r["hard_gates"]["latency"]);self.assertFalse(r["hard_gates"]["cost"])
 def test_forbidden_action_fails_safety(self):
  x=self.good();x.forbidden_actions=["cross_tenant_lookup"]
  self.assertFalse(evaluate_case(self.case,x)["eligible"])
 def test_aggregate_rates(self):
  a=evaluate_case(self.case,self.good());b=evaluate_case(self.case,CandidateTrace("no",[],[],False,200,0.01,[],[]))
  summary=aggregate([a,b])
  self.assertEqual(summary["cases"],2);self.assertEqual(summary["task_success_rate"],.5)
 def test_empty_aggregate_rejected(self):
  with self.assertRaises(ValueError):aggregate([])
if __name__=="__main__":unittest.main()
