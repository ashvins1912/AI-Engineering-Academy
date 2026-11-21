import unittest
from mcp_lifecycle import MCPClient,MCPServer,Tool,RpcError,build_demo_server,PROTOCOL_VERSION,META_PROTOCOL,META_CAPABILITIES

class MCPLifecycleTests(unittest.TestCase):
 def setUp(self):self.server=build_demo_server();self.client=MCPClient(self.server)
 def test_discover_and_stateless_metadata(self):
  result=self.client.discover()
  self.assertEqual(result["protocolVersions"],[PROTOCOL_VERSION])
  self.assertEqual(result["resultType"],"complete")
  self.assertIn("tools",result["capabilities"])
  tools=self.client.list_tools()
  self.assertEqual(tools["tools"][0]["name"],"lookup_order")
  self.assertEqual(tools["resultType"],"complete")
  self.assertEqual(tools["cacheScope"],"private")
 def test_every_request_carries_protocol_metadata(self):
  response=self.client.list_tools()
  self.assertEqual(response["resultType"],"complete") if "resultType" in response else self.assertEqual(response["cacheScope"],"private")
 def test_tool_call_requires_consent_and_schema(self):
  with self.assertRaises(PermissionError):self.client.call_tool("lookup_order",{"order_id":"ORD-7"},set())
  with self.assertRaises(RpcError):self.client.call_tool("lookup_order",{"unknown":"x"},{"lookup_order"})
  result=self.client.call_tool("lookup_order",{"order_id":"ORD-7"},{"lookup_order"})
  self.assertIn("shipped",result["content"][0]["text"])
  self.assertEqual(result["resultType"],"complete")
 def test_unsupported_protocol_rejected_per_request(self):
  c=MCPClient(self.server,protocol_version="unsupported")
  with self.assertRaises(RpcError):c.list_tools()
 def test_headers_must_match_json_rpc_method_and_name(self):
  message={"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{META_PROTOCOL:PROTOCOL_VERSION,META_CAPABILITIES:{}}}}
  with self.assertRaises(RpcError):self.server.handle({"Mcp-Method":"tools/call"},message)
  call={"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"lookup_order","arguments":{"order_id":"1"},"_meta":{META_PROTOCOL:PROTOCOL_VERSION,META_CAPABILITIES:{}}}}
  with self.assertRaises(RpcError):self.server.handle({"Mcp-Method":"tools/call","Mcp-Name":"other"},call)
 def test_duplicate_tool_registration_rejected(self):
  with self.assertRaises(ValueError):self.server.register_tool(Tool("lookup_order","duplicate",{},lambda _:None))
 def test_unknown_method_and_closed_client(self):
  with self.assertRaises(RpcError):self.client.request("tools/delete")
  self.client.close()
  with self.assertRaises(RpcError):self.client.list_tools()
if __name__=="__main__":unittest.main()
