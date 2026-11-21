import os,tempfile,unittest,sqlite3
from agent_evaluation_production import EvaluationLedger
class EvaluationLedgerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"eval.db")
  self.store=EvaluationLedger(self.path,clock=lambda:123)
  self.meta=self.store.start("run-1","candidate-a","v1",{"cases":["a","b"]},{"temperature":0})
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_fingerprints_and_results_persist(self):
  self.store.record_case("run-1","case-a",{"success":True})
  self.assertEqual(len(self.store.results("run-1")),1)
  self.assertEqual(self.meta["dataset_hash"],EvaluationLedger.fingerprint({"cases":["a","b"]}))
 def test_unknown_run_rejected(self):
  with self.assertRaises(KeyError):self.store.record_case("missing","a",{})
 def test_duplicate_case_rejected(self):
  self.store.record_case("run-1","case-a",{"success":True})
  with self.assertRaises(sqlite3.IntegrityError):self.store.record_case("run-1","case-a",{"success":False})
 def test_reopen_preserves_run_and_results(self):
  self.store.record_case("run-1","case-a",{"score":99});self.store.close()
  self.store=EvaluationLedger(self.path,clock=lambda:124)
  self.assertEqual(self.store.results("run-1")[0],{"score":99})
if __name__=="__main__":unittest.main()
