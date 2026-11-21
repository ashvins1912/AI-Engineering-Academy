import os,tempfile,unittest
from data_pipeline_production import LineageCatalog,LineageConflict
class LineageTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"lineage.db")
  self.store=LineageCatalog(self.path,clock=lambda:100.0)
  self.manifest={"raw_hash":"abc","contract":"v1","feature_spec":{"mean":2},"code":"commit1"}
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_register_dataset_and_pipeline_run(self):
  digest=self.store.register_dataset("tenant-a","customers","v1",self.manifest)
  self.store.start_run("tenant-a","run-1","customers","v1","commit1")
  self.store.finish_run("tenant-a","run-1","succeeded",{"rows":100})
  self.assertEqual(self.store.get_dataset("tenant-a","customers","v1")["manifest_hash"],digest)
  self.assertEqual(self.store.get_run("tenant-a","run-1")["status"],"succeeded")
 def test_dataset_version_is_immutable(self):
  self.store.register_dataset("tenant-a","customers","v1",self.manifest)
  with self.assertRaises(LineageConflict):self.store.register_dataset("tenant-a","customers","v1",{**self.manifest,"raw_hash":"changed"})
 def test_tenant_scope(self):
  self.store.register_dataset("tenant-a","customers","v1",self.manifest)
  self.assertIsNone(self.store.get_dataset("tenant-b","customers","v1"))
  with self.assertRaises(KeyError):self.store.start_run("tenant-b","r","customers","v1","c")
 def test_unknown_dataset_cannot_start_run(self):
  with self.assertRaises(KeyError):self.store.start_run("tenant-a","r","missing","v1","c")
 def test_run_can_finish_once(self):
  self.store.register_dataset("tenant-a","customers","v1",self.manifest)
  self.store.start_run("tenant-a","r","customers","v1","c")
  self.store.finish_run("tenant-a","r","failed",{"error":"schema"})
  with self.assertRaises(LineageConflict):self.store.finish_run("tenant-a","r","succeeded",{})
 def test_reopen_catalog(self):
  self.store.register_dataset("tenant-a","customers","v1",self.manifest);self.store.close()
  self.store=LineageCatalog(self.path,clock=lambda:101.0)
  self.assertEqual(self.store.get_dataset("tenant-a","customers","v1")["manifest"],self.manifest)
if __name__=="__main__":unittest.main()
