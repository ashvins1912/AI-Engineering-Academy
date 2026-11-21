import unittest
from a2a_protocol import AgentCard,Artifact,TaskRegistry,PROTOCOL_VERSION,validate_agent_card,select_interface,validate_artifact,validate_push_callback

class A2AProtocolTests(unittest.TestCase):
 def card(self,version=PROTOCOL_VERSION,url="https://agents.example.com/a2a"):
  return AgentCard("Refund specialist","Refund review",url,version,[{"transport":"JSONRPC","url":url,"protocolVersion":version},{"transport":"HTTP+JSON","url":url,"protocolVersion":version}],{"streaming":True},[{"id":"refund-review"}])
 def artifact(self):
  return Artifact("artifact-1","Review","application/json",[{"kind":"data","content":'{"eligible":true}'}],["policy/refunds-v3"])
 def test_card_validation_and_interface_selection(self):
  card=self.card()
  self.assertTrue(validate_agent_card(card,{"agents.example.com"}))
  self.assertEqual(select_interface(card)["transport"],"JSONRPC")
 def test_card_version_mismatch_rejected(self):
  with self.assertRaises(ValueError):validate_agent_card(self.card("0.3.0"),{"agents.example.com"})
 def test_card_endpoint_must_be_allowlisted_https(self):
  with self.assertRaises(PermissionError):validate_agent_card(self.card(url="http://agents.example.com/a2a"),{"agents.example.com"})
  with self.assertRaises(PermissionError):validate_agent_card(self.card(url="https://evil.example/a2a"),{"agents.example.com"})
 def test_task_context_and_tenant_are_bound(self):
  registry=TaskRegistry();tid=registry.create_task("tenant-a","ctx-1",{"parts":[{"kind":"text","content":"review"}]})
  self.assertEqual(registry.get_task("tenant-a",tid,"ctx-1").context_id,"ctx-1")
  with self.assertRaises(KeyError):registry.get_task("tenant-b",tid)
  with self.assertRaises(KeyError):registry.get_task("tenant-a",tid,"ctx-2")
 def test_lifecycle_version_and_terminal_guard(self):
  registry=TaskRegistry();tid=registry.create_task("tenant-a","ctx",{"parts":[{"kind":"text"}]})
  registry.transition("tenant-a",tid,"working",0)
  registry.transition("tenant-a",tid,"completed",1)
  with self.assertRaises(ValueError):registry.transition("tenant-a",tid,"working",2)
  with self.assertRaises(RuntimeError):registry.transition("tenant-a",tid,"failed",1)
 def test_artifact_validation(self):
  registry=TaskRegistry();tid=registry.create_task("tenant-a","ctx",{"parts":[{"kind":"text"}]})
  registry.transition("tenant-a",tid,"working",0)
  registry.add_artifact("tenant-a",tid,self.artifact())
  with self.assertRaises(ValueError):validate_artifact(Artifact("bad","Bad","text/html",[{"kind":"text","content":"x"}],["source"]))
  with self.assertRaises(ValueError):validate_artifact(Artifact("big","Big","text/plain",[{"kind":"text","content":"x"*100}],["source"]),max_bytes=10)
 def test_event_sequence_and_stream_replay(self):
  registry=TaskRegistry();tid=registry.create_task("tenant-a","ctx",{"parts":[{"kind":"text"}]})
  registry.transition("tenant-a",tid,"working",0)
  registry.add_artifact("tenant-a",tid,self.artifact())
  events=registry.events_after("tenant-a",tid,1)
  self.assertEqual([x["sequence"] for x in events],[2,3])
 def test_push_callback_allowlist_and_dedup(self):
  registry=TaskRegistry();tid=registry.create_task("tenant-a","ctx",{"parts":[{"kind":"text"}]})
  args=("tenant-a",tid,"evt-1","https://callbacks.example.com/a2a",{"callbacks.example.com"},{"status":"working"})
  self.assertFalse(registry.receive_push(*args)["duplicate"])
  self.assertTrue(registry.receive_push(*args)["duplicate"])
  with self.assertRaises(PermissionError):validate_push_callback("https://127.0.0.1/admin",{"127.0.0.1"})
if __name__=="__main__":unittest.main()
