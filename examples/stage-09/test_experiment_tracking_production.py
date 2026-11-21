import os,tempfile,unittest
from experiment_tracking_production import ExperimentStore,TrackingConflict

class ExperimentStoreTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"tracking.db")
  self.store=ExperimentStore(self.path,clock=lambda:100.0)
  self.store.create_experiment("tenant-a","exp-1","sentiment")
  self.dataset={"name":"reviews","version":"v3","content_hash":"datahash","split_hash":"splithash"}
  self.store.start_run("tenant-a","exp-1","run-1",self.dataset,"accuracy-v1",{"git_commit":"abc","seed":42})
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_params_are_immutable_and_same_value_is_idempotent(self):
  self.assertTrue(self.store.log_param("tenant-a","run-1","lr",0.01))
  self.assertFalse(self.store.log_param("tenant-a","run-1","lr",0.01))
  with self.assertRaises(TrackingConflict):self.store.log_param("tenant-a","run-1","lr",0.02)
 def test_metric_time_series_is_ordered(self):
  self.store.log_metric("tenant-a","run-1","val_accuracy",0.8,1)
  self.store.log_metric("tenant-a","run-1","val_accuracy",0.9,2)
  with self.assertRaises(TrackingConflict):self.store.log_metric("tenant-a","run-1","val_accuracy",0.7,2)
  self.assertEqual(len(self.store.snapshot("tenant-a","run-1")["metrics"]),2)
 def test_artifact_checksum_and_immutable_name(self):
  result=self.store.log_artifact("tenant-a","run-1","model.bin",b"model","application/octet-stream","s3://bucket/model.bin")
  self.assertEqual(len(result["sha256"]),64)
  self.assertTrue(self.store.log_artifact("tenant-a","run-1","model.bin",b"model","application/octet-stream","s3://bucket/model.bin")["duplicate"])
  with self.assertRaises(TrackingConflict):self.store.log_artifact("tenant-a","run-1","model.bin",b"changed","application/octet-stream","s3://bucket/model.bin")
 def test_run_comparison_requires_same_dataset_split_and_protocol(self):
  self.store.log_metric("tenant-a","run-1","accuracy",0.9,1)
  self.store.start_run("tenant-a","exp-1","run-2",self.dataset,"accuracy-v1",{})
  self.store.log_metric("tenant-a","run-2","accuracy",0.92,1)
  self.assertAlmostEqual(self.store.compare_runs("tenant-a","run-1","run-2","accuracy")["delta"],0.02)
  other={**self.dataset,"version":"v4","content_hash":"newhash"}
  self.store.start_run("tenant-a","exp-1","run-3",other,"accuracy-v1",{})
  with self.assertRaises(TrackingConflict):self.store.compare_runs("tenant-a","run-1","run-3","accuracy")
 def test_tenant_isolation(self):
  with self.assertRaises(KeyError):self.store.snapshot("tenant-b","run-1")
  with self.assertRaises(KeyError):self.store.start_run("tenant-b","exp-1","run-x",self.dataset,"accuracy-v1",{})
 def test_run_lifecycle_and_reopen_persistence(self):
  self.store.log_param("tenant-a","run-1","seed",42)
  self.store.log_metric("tenant-a","run-1","loss",0.2,1)
  self.store.log_artifact("tenant-a","run-1","checkpoint",b"weights","application/octet-stream","s3://weights")
  self.store.finish_run("tenant-a","run-1")
  self.store.close();self.store=ExperimentStore(self.path,clock=lambda:101.0)
  snap=self.store.snapshot("tenant-a","run-1")
  self.assertEqual(snap["status"],"finished");self.assertEqual(snap["params"]["seed"],42)
  self.assertEqual(snap["metrics"][0]["value"],0.2);self.assertEqual(len(snap["artifacts"]),1)
if __name__=="__main__":unittest.main()
