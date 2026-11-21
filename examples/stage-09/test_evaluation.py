import unittest
from evaluation import EvaluationCase,EvaluationPolicy,evaluate_suite,compare_candidate_to_baseline,dataset_hash

class EvaluationTests(unittest.TestCase):
 def setUp(self):
  self.cases=[EvaluationCase("a","question",("alpha","beta"),("secret",)),EvaluationCase("b","question",("gamma",),("unsafe",)),EvaluationCase("c","question",("delta",))]
  self.outputs={"a":"alpha beta","b":"gamma","c":"delta"}
 def test_deterministic_golden_set_metrics(self):
  report=evaluate_suite(self.cases,self.outputs)
  self.assertTrue(report["passed"])
  self.assertEqual(report["metrics"]["task_success_rate"],1.0)
  self.assertEqual(report["metrics"]["safety_violations"],0)
  self.assertEqual(report["dataset_hash"],dataset_hash(self.cases))
 def test_missing_fact_fails_task_success_gate(self):
  outputs={**self.outputs,"a":"alpha only"}
  report=evaluate_suite(self.cases,outputs,EvaluationPolicy(min_task_success=0.9))
  self.assertFalse(report["passed"])
  self.assertFalse(report["gates"]["task_success"])
  self.assertEqual(report["case_results"][0]["missing_facts"],["beta"])
 def test_safety_violation_fails_closed(self):
  outputs={**self.outputs,"b":"gamma; unsafe"}
  report=evaluate_suite(self.cases,outputs)
  self.assertFalse(report["gates"]["safety"])
  self.assertEqual(report["metrics"]["safety_violations"],1)
 def test_latency_and_cost_budgets(self):
  report=evaluate_suite(self.cases,self.outputs,EvaluationPolicy(max_p95_latency_ms=100,max_cost_per_case_usd=0.01),{"a":10,"b":20,"c":500},{"a":0.001,"b":0.001,"c":0.1})
  self.assertFalse(report["gates"]["latency"])
  self.assertFalse(report["gates"]["cost"])
 def test_paired_regression_gate(self):
  baseline=evaluate_suite(self.cases,self.outputs)
  candidate=evaluate_suite(self.cases,{**self.outputs,"c":"missing"})
  comparison=compare_candidate_to_baseline(candidate,baseline,EvaluationPolicy(max_regression=0.2))
  self.assertFalse(comparison["passed"])
  self.assertLess(comparison["task_success_delta"],0)
 def test_different_dataset_or_evaluator_rejected(self):
  baseline=evaluate_suite(self.cases,self.outputs)
  other=evaluate_suite(self.cases[:2],{k:self.outputs[k] for k in ("a","b")})
  with self.assertRaises(ValueError):compare_candidate_to_baseline(other,baseline)
  changed={**baseline,"evaluator_version":"v2"}
  with self.assertRaises(ValueError):compare_candidate_to_baseline(baseline,changed)
 def test_duplicate_case_and_incomplete_outputs_rejected(self):
  with self.assertRaises(ValueError):evaluate_suite([self.cases[0],self.cases[0]],{"a":"alpha beta"})
  with self.assertRaises(ValueError):evaluate_suite(self.cases,{"a":"alpha beta"})
 def test_negative_resource_metrics_rejected(self):
  with self.assertRaises(ValueError):evaluate_suite(self.cases,self.outputs,latencies={"a":-1})
if __name__=="__main__":unittest.main()
