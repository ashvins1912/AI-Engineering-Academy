import os,tempfile,unittest
from mcp_advanced_production import MCPTaskStore
class MCPTaskStoreTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"tasks.db");self.store=MCPTaskStore(self.path,clock=lambda:100)
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_durable_task_and_tenant_scope(self):
  self.store.create("t1","tenant-a")
  with self.assertRaises(KeyError):self.store.get("t1","tenant-b")
  self.store.update("t1","tenant-a","completed",{"answer":42})
  self.store.close();self.store=MCPTaskStore(self.path,clock=lambda:101)
  self.assertEqual(self.store.get("t1","tenant-a")["result"],{"answer":42})
 def test_cooperative_cancel_is_flag_not_false_completion(self):
  self.store.create("t2","tenant-a")
  result=self.store.cancel("t2","tenant-a")
  self.assertEqual(result["status"],"working");self.assertEqual(result["cancel_requested"],1)
 def test_terminal_task_not_cancelled_again(self):
  self.store.create("t3","tenant-a");self.store.update("t3","tenant-a","completed",{"ok":True})
  result=self.store.cancel("t3","tenant-a")
  self.assertEqual(result["cancel_requested"],0)
if __name__=="__main__":unittest.main()
