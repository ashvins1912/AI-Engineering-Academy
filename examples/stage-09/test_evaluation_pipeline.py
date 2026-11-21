import os,tempfile,unittest
from evaluation import EvaluationCase,EvaluationPolicy,evaluate_suite
from evaluation_pipeline import EvaluationReportStore,EvaluationConflict,run_release_gate

class EvaluationStoreTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"eval.db")
  self.store=EvaluationReportStore(self.path,clock=lambda:100.0)
  self.cases=[EvaluationCase("a","question",("alpha",)),EvaluationCase("b","question",("beta",))]
  self.outputs={"a":"alpha result","b":"beta result"}
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_report_persists_and_is_idempotent(self):
  result=run_release_gate(self.cases,self.outputs,"tenant-a","run-1","bundle-h",self.store)
  self.assertEqual(result["exit_code"],0)
  again=run_release_gate(self.cases,self.outputs,"tenant-a","run-1","bundle-h",self.store)
  self.assertTrue(again["persisted"]["duplicate"])
  self.assertEqual(self.store.get("tenant-a","run-1")["report"]["metrics"]["task_success_rate"],1.0)
 def test_same_run_id_with_changed_report_rejected(self):
  run_release_gate(self.cases,self.outputs,"tenant-a","run-1","bundle-h",self.store)
  changed={"a":"wrong","b":"beta result"}
  with self.assertRaises(EvaluationConflict):
   run_release_gate(self.cases,changed,"tenant-a","run-1","bundle-h",self.store)
 def test_failed_gate_returns_nonzero_and_persists(self):
  result=run_release_gate(self.cases,{"a":"wrong","b":"beta result"},"tenant-a","run-fail","bundle-h",self.store,EvaluationPolicy(min_task_success=1.0))
  self.assertEqual(result["exit_code"],1)
  self.assertFalse(self.store.get("tenant-a","run-fail")["passed"])
 def test_baseline_regression_blocks_release(self):
  baseline=evaluate_suite(self.cases,self.outputs)
  candidate={"a":"wrong","b":"beta result"}
  result=run_release_gate(self.cases,candidate,"tenant-a","run-regress","bundle-h",self.store,EvaluationPolicy(max_regression=0.0),baseline)
  self.assertEqual(result["exit_code"],1)
  self.assertFalse(result["report"]["comparison"]["passed"])
 def test_tenant_isolation(self):
  run_release_gate(self.cases,self.outputs,"tenant-a","run-1","bundle-h",self.store)
  self.assertIsNone(self.store.get("tenant-b","run-1"))
 def test_reopen_persistence(self):
  run_release_gate(self.cases,self.outputs,"tenant-a","run-1","bundle-h",self.store)
  self.store.close();self.store=EvaluationReportStore(self.path,clock=lambda:101.0)
  self.assertEqual(self.store.get("tenant-a","run-1")["bundle_digest"],"bundle-h")
if __name__=="__main__":unittest.main()
