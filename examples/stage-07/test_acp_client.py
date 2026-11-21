import unittest
from acp_client import ACPConnection

class ACPClientTests(unittest.TestCase):
 def connection(self,fs=True,terminal=True):
  c=ACPConnection()
  c.initialize({"name":"ide","version":"1"},{"fs":{"readTextFile":fs,"writeTextFile":fs},"terminal":terminal},{"session":{}},2)
  return c
 def test_initialize_required_and_version_negotiation(self):
  c=ACPConnection()
  with self.assertRaises(ValueError):c.session_new("/w","s",["/w"])
  result=c.initialize({"name":"ide"},{"fs":{}},{"session":{}},2)
  self.assertEqual(result["result"]["protocolVersion"],2)
  with self.assertRaises(ValueError):c.initialize({"name":"ide"},{},{"session":{}},2)
 def test_session_new_prompt_and_resume(self):
  c=self.connection();c.session_new("/workspace/app","s1",["/workspace/app"])
  c.session_prompt("s1",[{"type":"text","text":"fix tests"}])
  c.session_update("s1",{"sessionUpdate":"state_update","state":"idle"})
  self.assertEqual(c.session_resume("s1")["history"],[])
  self.assertEqual(len(c.session_resume("s1",{"type":"start"})["history"]),1)
 def test_capability_gates_filesystem_and_terminal(self):
  c=self.connection(fs=False,terminal=False);c.session_new("/workspace/app","s1",["/workspace/app"])
  with self.assertRaises(PermissionError):c.read_text_file("s1","/workspace/app/a.py",{})
  with self.assertRaises(PermissionError):c.create_terminal("s1","t1","pytest","/workspace/app")
 def test_workspace_roots_are_enforced(self):
  c=self.connection();c.session_new("/workspace/app","s1",["/workspace/app"])
  files={"/workspace/app/a.py":"print(1)"}
  self.assertEqual(c.read_text_file("s1","/workspace/app/a.py",files),"print(1)")
  with self.assertRaises(PermissionError):c.read_text_file("s1","/etc/passwd",files)
  with self.assertRaises(PermissionError):c.write_text_file("s1","/workspace-other/x","x",files)
 def test_parent_traversal_is_rejected_for_file_and_terminal_paths(self):
  c=self.connection();c.session_new("/workspace/app","s1",["/workspace/app"])
  files={"/workspace/app/a.py":"ok"}
  with self.assertRaises(PermissionError):c.read_text_file("s1","/workspace/app/../secrets.txt",files)
  with self.assertRaises(PermissionError):c.write_text_file("s1","/workspace/app/../../tmp/x","bad",files)
  with self.assertRaises(PermissionError):c.create_terminal("s1","term-x","pytest","/workspace/app/../../tmp")
 def test_permission_reject_or_unknown_never_approves(self):
  c=self.connection();c.session_new("/w","s1",["/w"]);c.session_prompt("s1",[{"type":"text","text":"run"}])
  opts=[{"optionId":"yes","kind":"allow_once"},{"optionId":"no","kind":"reject_once"}]
  self.assertTrue(c.request_permission("s1","Run?",opts,"yes")["approved"])
  self.assertFalse(c.request_permission("s1","Run?",opts,"unknown")["approved"])
  self.assertFalse(c.request_permission("s1","Run?",opts,"no")["approved"])
 def test_tool_cancel_requires_advertised_capability_and_final_update(self):
  c=self.connection();c.session_new("/w","s1",["/w"])
  c.tool_call_update("s1","call-1","in_progress",False)
  with self.assertRaises(PermissionError):c.tool_call_cancel("s1","call-1")
  c.tool_call_update("s1","call-1","in_progress",True)
  self.assertTrue(c.tool_call_cancel("s1","call-1")["accepted"])
  c.tool_call_update("s1","call-1","cancelled")
  with self.assertRaises(ValueError):c.tool_call_update("s1","call-1","in_progress")
 def test_session_cancel_is_distinct_from_tool_cancel(self):
  c=self.connection();c.session_new("/w","s1",["/w"]);c.session_prompt("s1",[{"type":"text","text":"work"}])
  self.assertTrue(c.session_cancel("s1")["accepted"])
 def test_terminal_cancel_requires_negotiated_terminal(self):
  c=self.connection();c.session_new("/w","s1",["/w"]);c.create_terminal("s1","term-1","pytest","/w")
  self.assertTrue(c.terminal_cancel("s1","term-1")["accepted"])
if __name__=="__main__":unittest.main()
