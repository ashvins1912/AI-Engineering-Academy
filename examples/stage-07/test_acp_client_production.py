import os,tempfile,unittest,sqlite3
from acp_client_production import ACPSessionStore

class ACPSessionStoreTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"acp.db")
  self.store=ACPSessionStore(self.path,clock=lambda:100.0)
  self.store.create_session("user-a","workspace-a","session-1","/workspace/app",["/workspace/app"])
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_session_state_and_updates_persist(self):
  self.store.update_state("user-a","workspace-a","session-1",0,"running",{"role":"user","text":"fix bug"})
  self.store.append_update("user-a","workspace-a","session-1",{"sessionUpdate":"agent_message","text":"Inspecting"})
  self.assertEqual(self.store.get_session("user-a","workspace-a","session-1")["state"],"running")
  self.assertEqual(self.store.updates("user-a","workspace-a","session-1")[0]["sequence"],1)
 def test_owner_and_workspace_scope(self):
  with self.assertRaises(KeyError):self.store.get_session("user-b","workspace-a","session-1")
  with self.assertRaises(KeyError):self.store.get_session("user-a","workspace-b","session-1")
 def test_optimistic_version_conflict(self):
  self.store.update_state("user-a","workspace-a","session-1",0,"running")
  with self.assertRaises(RuntimeError):self.store.update_state("user-a","workspace-a","session-1",0,"idle")
 def test_permission_decision_is_audited_and_idempotency_key_unique(self):
  self.store.record_permission("user-a","workspace-a","session-1","perm-1","call-1","selected","allow-once","once")
  self.assertEqual(self.store.permission("user-a","workspace-a","session-1","perm-1")["option_id"],"allow-once")
  with self.assertRaises(sqlite3.IntegrityError):self.store.record_permission("user-a","workspace-a","session-1","perm-1","call-1","selected","allow-always","always")
 def test_cancel_requires_advertised_capability(self):
  self.store.record_tool_call("user-a","workspace-a","session-1","call-1","in_progress",False)
  with self.assertRaises(PermissionError):self.store.accept_tool_cancel("user-a","workspace-a","session-1","call-1")
  self.store.record_tool_call("user-a","workspace-a","session-1","call-1","in_progress",True)
  self.assertTrue(self.store.accept_tool_cancel("user-a","workspace-a","session-1","call-1")["accepted"])
 def test_terminal_tool_call_cannot_be_reopened(self):
  self.store.record_tool_call("user-a","workspace-a","session-1","call-1","completed")
  with self.assertRaises(ValueError):self.store.record_tool_call("user-a","workspace-a","session-1","call-1","in_progress")
 def test_reopen_persistence(self):
  self.store.update_state("user-a","workspace-a","session-1",0,"idle",{"x":1})
  self.store.close();self.store=ACPSessionStore(self.path,clock=lambda:101.0)
  self.assertEqual(self.store.get_session("user-a","workspace-a","session-1")["version"],1)
if __name__=="__main__":unittest.main()
