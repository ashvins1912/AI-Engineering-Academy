import os,tempfile,unittest
from graph_orchestration_production import SQLiteGraphCheckpoints

class SQLiteCheckpointTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.store=SQLiteGraphCheckpoints(os.path.join(self.tmp.name,"g.db"),clock=lambda:100.0)
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_save_load_and_event_history(self):
  state={"values":{"x":1},"next_node":"b","status":"running","steps":1}
  self.assertEqual(self.store.save("tenant-a","thread-1",0,state,"a",{"x":1}),1)
  self.assertEqual(self.store.load("tenant-a","thread-1")["state"],state)
  self.assertEqual(len(self.store.events("tenant-a","thread-1")),1)
 def test_optimistic_version_conflict(self):
  self.store.save("tenant-a","t",0,{"n":1},"a",{})
  with self.assertRaises(RuntimeError):self.store.save("tenant-a","t",0,{"n":2},"b",{})
 def test_tenant_isolation(self):
  self.store.save("tenant-a","t",0,{"secret":"a"},"a",{})
  self.assertIsNone(self.store.load("tenant-b","t"))
  self.assertEqual(self.store.events("tenant-b","t"),[])
 def test_reopen_persistence(self):
  path=self.store.db.execute("PRAGMA database_list").fetchone()[2]
  self.store.save("tenant-a","t",0,{"v":1},"a",{});self.store.close()
  self.store=SQLiteGraphCheckpoints(path,clock=lambda:101.0)
  self.assertEqual(self.store.load("tenant-a","t")["state"],{"v":1})
if __name__=="__main__":unittest.main()
