import unittest
from a2a_protocol import A2AServer,A2AClient,A2AError,agent_card

class A2ATests(unittest.TestCase):
 def setUp(self):self.card=agent_card();self.server=A2AServer(self.card);self.client=A2AClient(self.card)
 def message(self,text="Review order ORD-7"):return {"role":"user","parts":[{"kind":"text","text":text}]}
 def test_agent_card_discovery_and_interface_selection(self):
  selected=self.client.select_interface()
  self.assertEqual(selected["protocolBinding"],"JSONRPC")
  self.assertTrue(self.client.can_stream());self.assertFalse(self.client.can_push())
 def test_send_task_complete_and_artifact(self):
  task=self.server.send(self.message())["task"]
  self.assertEqual(task["status"],"working")
  complete=self.server.complete(task["id"],"Eligible; approval required.")
  self.assertEqual(complete["status"],"completed")
  self.assertEqual(complete["artifacts"][0]["parts"][0]["kind"],"text")
 def test_context_and_task_continuity(self):
  task=self.server.send(self.message(),context_id="ctx-1")["task"]
  continued=self.server.send(self.message("Clarify the refund"),context_id="ctx-1",task_id=task["id"])["task"]
  self.assertEqual(len(continued["history"]),2)
  with self.assertRaises(A2AError):self.server.send(self.message(),context_id="wrong",task_id=task["id"])
 def test_terminal_task_rejects_followup(self):
  task=self.server.send(self.message())["task"];self.server.complete(task["id"],"done")
  with self.assertRaises(A2AError):self.server.send(self.message(),task_id=task["id"])
 def test_cancel_and_get_history_limit(self):
  task=self.server.send(self.message())["task"]
  self.assertEqual(self.server.cancel(task["id"])["status"],"canceled")
  task2=self.server.send(self.message())["task"]
  self.assertEqual(self.server.get_task(task2["id"],0)["history"],[])
 def test_auth_required_is_not_authorization(self):
  task=self.server.send({"role":"user","parts":[{"kind":"text","text":"Refund"}],"metadata":{"requiresAuth":True}})["task"]
  self.assertEqual(task["status"],"auth-required")
  self.assertEqual(task["artifacts"],[])
 def test_streaming_task_and_artifact_events(self):
  events=list(self.server.stream(self.message()))
  self.assertEqual(events[0]["kind"],"task")
  self.assertEqual(events[1]["kind"],"status-update")
  self.assertEqual(events[2]["kind"],"artifact-update")
 def test_streaming_capability_enforced(self):
  card=agent_card();card["capabilities"]["streaming"]=False
  with self.assertRaises(A2AError):list(A2AServer(card).stream(self.message()))
if __name__=="__main__":unittest.main()
