import unittest
from mcp_primitives import PrimitiveClient,demo_server
class MCPPrimitiveTests(unittest.TestCase):
 def setUp(self):self.client=PrimitiveClient(demo_server())
 def test_tools_list_and_call(self):
  tools=self.client.request("tools/list")
  self.assertEqual(tools["tools"][0]["name"],"calculate_refund")
  self.assertEqual(self.client.request("tools/call",{"name":"calculate_refund","arguments":{"amount":900}},"calculate_refund")["resultType"],"complete")
 def test_resources_list_read_and_templates(self):
  self.assertEqual(len(self.client.request("resources/list")["resources"]),1)
  content=self.client.request("resources/read",{"uri":"policy://refunds/v3"})["contents"][0]["text"]
  self.assertIn("high-value approval",content)
  self.assertIn("{tenant_id}",self.client.request("resources/templates/list")["resourceTemplates"][0]["uriTemplate"])
 def test_prompts_list_and_get(self):
  self.assertEqual(self.client.request("prompts/list")["prompts"][0]["name"],"refund_review")
  msg=self.client.request("prompts/get",{"name":"refund_review","arguments":{"order_id":"ORD-7"}})["messages"][0]
  self.assertIn("Do not execute",msg["content"]["text"])
 def test_prompt_requires_argument(self):
  with self.assertRaises(ValueError):self.client.request("prompts/get",{"name":"refund_review","arguments":{}})
 def test_unknown_resource_and_prompt(self):
  with self.assertRaises(KeyError):self.client.request("resources/read",{"uri":"policy://missing"})
  with self.assertRaises(KeyError):self.client.request("prompts/get",{"name":"unknown"})
 def test_tool_schema_rejects_unknown_fields(self):
  with self.assertRaises(ValueError):self.client.request("tools/call",{"name":"calculate_refund","arguments":{"amount":2,"execute":True}},"calculate_refund")
if __name__=="__main__":unittest.main()
