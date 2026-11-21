import unittest
from mcp_lifecycle import MCPClient,MCPServer,Tool,RpcError,build_demo_server

class MCPLifecycleTests(unittest.TestCase):
 def setUp(self):self.server=build_demo_server();self.client=MCPClient(self.server)
 def test_initialize_capabilities_and_list_tools(self):
  result=self.client.initialize()
  self.assertEqual(result["protocolVersion"],"2025-06-18")
  self.assertIn("tools",self.client.capabilities)
  self.assertEqual(self.client.list_tools()[0]["name"],"lookup_order")
 def test_tools_require_initialized_session(self):
  with self.assertRaises(RpcError):self.client.list_tools()
 def test_call_requires_host_consent_and_schema(self):
  self.client.initialize()
  with self.assertRaises(PermissionError):self.client.call_tool("lookup_order",{"order_id":"ORD-7"},set())
  with self.assertRaises(RpcError):self.client.call_tool("lookup_order",{"unknown":"x"},{"lookup_order"})
  self.assertIn("shipped",self.client.call_tool("lookup_order",{"order_id":"ORD-7"},{"lookup_order"})["content"][0]["text"])
 def test_unsupported_protocol_rejected(self):
  c=MCPClient(self.server,protocol_version="unsupported")
  with self.assertRaises(RpcError):c.initialize()
 def test_shutdown_closes_client_and_server_session(self):
  self.client.initialize();self.client.shutdown()
  self.assertEqual(self.client.state,"CLOSED")
  self.assertNotIn(self.client.session_id,self.server.initialized_sessions)
 def test_duplicate_tool_registration_rejected(self):
  with self.assertRaises(ValueError):self.server.register_tool(Tool("lookup_order","duplicate",{},lambda _:None))
 def test_json_rpc_unknown_method(self):
  self.client.initialize()
  with self.assertRaises(RpcError) as e:self.client.request("tools/delete")
  self.assertEqual(e.exception.code,-32601)
if __name__=="__main__":unittest.main()
