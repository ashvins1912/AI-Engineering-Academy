import unittest
from experiment_tracking import *

class ExperimentTrackingTests(unittest.TestCase):
 def setUp(self):
  self.records=[{"id":str(i),"x":float(i-6),"y":int(i>=6)} for i in range(12)]
  self.splits={"train":[str(i) for i in range(8)],"validation":["8","9"],"test":["10","11"]}
  self.manifest=DatasetManifest.create("toy","v1",self.records,self.splits,{"x":"float","y":"binary"})
  self.tracker=LocalTracker()
  self.tracker.start_run("demo","run-1",{"git_commit":"abc","seed":42},self.manifest,"accuracy-v1")
 def test_split_overlap_and_unknown_rows_rejected(self):
  with self.assertRaises(ExperimentError):validate_splits(["a"],["a"],["c"])
  with self.assertRaises(ExperimentError):validate_splits(["unknown"],["b"],["c"],["a","b","c"])
 def test_dataset_hash_changes_when_content_changes(self):
  changed=[*self.records];changed[0]={**changed[0],"x":99.0}
  other=DatasetManifest.create("toy","v2",changed,self.splits,{"x":"float","y":"binary"})
  self.assertNotEqual(self.manifest.content_hash,other.content_hash)
 def test_params_are_immutable(self):
  self.tracker.log_param("learning_rate",0.01)
  with self.assertRaises(ExperimentError):self.tracker.log_param("learning_rate",0.02)
 def test_metric_history_requires_increasing_steps(self):
  self.tracker.log_metric("val_accuracy",0.8,1);self.tracker.log_metric("val_accuracy",0.9,2)
  with self.assertRaises(ExperimentError):self.tracker.log_metric("val_accuracy",0.7,2)
 def test_artifact_sha256_and_size(self):
  artifact=self.tracker.log_artifact("model.bin",b"model-bytes")
  # log_artifact stores metadata in the run record
  record=self.tracker.runs["run-1"]["artifacts"]["model.bin"]
  self.assertEqual(record["size"],11);self.assertEqual(len(record["sha256"]),64)
 def test_run_comparison_requires_same_dataset_and_protocol(self):
  self.tracker.log_metric("accuracy",0.9,1);self.tracker.finish_run("run-1")
  self.tracker.start_run("demo","run-2",{"git_commit":"def"},self.manifest,"accuracy-v1")
  self.tracker.log_metric("accuracy",0.92,1)
  self.assertAlmostEqual(self.tracker.compare("run-1","run-2","accuracy")["delta"],0.02)
  other=DatasetManifest.create("toy","v2",[{**self.records[0],"x":123}],{"train":["0"],"validation":[],"test":[]},{"x":"float"})
  self.tracker.start_run("demo","run-3",{},other,"accuracy-v1")
  self.tracker.log_metric("accuracy",0.99,1)
  with self.assertRaises(ExperimentError):self.tracker.compare("run-1","run-3","accuracy")
 def test_secret_metadata_is_rejected(self):
  with self.assertRaises(ExperimentError):safe_metadata({"nested":{"access_token":"do-not-log"}})
 def test_training_is_reproducible_for_same_seed(self):
  a=train_logistic_regression(self.records,seed=42,learning_rate=0.1,epochs=5)
  b=train_logistic_regression(self.records,seed=42,learning_rate=0.1,epochs=5)
  self.assertEqual(a,b)
if __name__=="__main__":unittest.main()
