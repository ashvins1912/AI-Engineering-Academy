import os,tempfile,unittest,sqlite3
from framework_comparison_production import BenchmarkLedger

class BenchmarkLedgerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"bench.db")
  self.ledger=BenchmarkLedger(self.path,clock=lambda:123.0)
  self.fixture={"task":"refund","tenant":"tenant-a"}
  self.hash=self.ledger.create_run("run-1",self.fixture,{"model":"fixed","policy":"refund-v3"})
 def tearDown(self):self.ledger.close();self.tmp.cleanup()
 def test_reproducible_hash_and_persisted_result(self):
  self.assertEqual(self.hash,BenchmarkLedger.canonical_hash({"tenant":"tenant-a","task":"refund"}))
  row=self.ledger.record("run-1","PydanticAI","1.0.0",{"answer":"ok"},{"latency_ms":30},True)
  self.assertTrue(row["hard_gates_passed"]);self.assertEqual(row["version"],"1.0.0")
 def test_hard_gate_failure_excluded(self):
  self.ledger.record("run-1","Unsafe","0.1",{"answer":"oops"},{"score":5},False)
  self.assertFalse(self.ledger.decision_candidates("run-1")[0]["eligible"])
 def test_requires_run_and_pinned_version(self):
  with self.assertRaises(KeyError):self.ledger.record("missing","x","1",{}, {},True)
  with self.assertRaises(ValueError):self.ledger.record("run-1","x","",{}, {},True)
 def test_duplicate_candidate_record_rejected(self):
  self.ledger.record("run-1","CrewAI","1.2",{}, {},True)
  with self.assertRaises(sqlite3.IntegrityError):self.ledger.record("run-1","CrewAI","1.2",{}, {},True)
 def test_hard_gate_requires_boolean_not_truthy_string(self):
  with self.assertRaises(TypeError):self.ledger.record("run-1","Unsafe","1.0",{}, {}, "false")
 def test_result_and_metrics_must_be_objects(self):
  with self.assertRaises(TypeError):self.ledger.record("run-1","Unsafe","1.0",[], {}, False)
 def test_persistence_after_reopen(self):
  self.ledger.record("run-1","Haystack","2.0",{"answer":"cited"},{"latency":10},True)
  self.ledger.close();self.ledger=BenchmarkLedger(self.path,clock=lambda:124.0)
  self.assertEqual(self.ledger.get("run-1","Haystack")["metrics"],{"latency":10})
if __name__=="__main__":unittest.main()
