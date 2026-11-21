import json,unittest
from mcp_transports import StreamableHTTPGateway,TransportError,parse_stdio_lines
from mcp_lifecycle import build_demo_server, MCPServer, Tool, PROTOCOL_VERSION,META_PROTOCOL,META_CAPABILITIES

def message(method="tools/list",params=None):
 p=dict(params or {});p["_meta"]={META_PROTOCOL:PROTOCOL_VERSION,META_CAPS:{}}
 return {"jsonrpc":"2.0","id":1,"method":method,"params":p}

class TransportTests(unittest.TestCase):
 def setUp(self):
  self.a=build_demo_server();self.a.name="instance-a"
  self.b=build_demo_server();self.b.name="instance-b"
  self.gateway=StreamableHTTPGateway([self.a,self.b],{"https://app.example.com"},{"mcp.example.com"})
  self.headers={"Content-Type":"application/json","Host":"mcp.example.com","Origin":"https://app.example.com","Mcp-Method":"tools/list"}
 def call(self,msg=None,headers=None):
  return self.gateway.handle("POST","/mcp",headers or self.headers,json.dumps(msg or message()))
 def test_stateless_http_round_robin_no_session_affinity(self):
  a=self.call();b=self.call()
  self.assertEqual(a["status"],200);self.assertNotEqual(a["server_instance"],b["server_instance"])
 def test_method_and_path_restricted(self):
  with self.assertRaises(TransportError):self.gateway.handle("GET","/mcp",self.headers,"{}")
  with self.assertRaises(TransportError):self.gateway.handle("POST","/other",self.headers,"{}")
 def test_content_type_host_origin_and_body_limits(self):
  for h in [{"Content-Type":"text/plain","Host":"mcp.example.com"},{"Content-Type":"application/json","Host":"evil.example"},{"Content-Type":"application/json","Host":"mcp.example.com","Origin":"https://evil.example"}]:
   with self.assertRaises(TransportError):self.call(headers=h)
  tiny=StreamableHTTPGateway([self.a],{"https://app.example.com"},{"mcp.example.com"},max_body_bytes=5)
  with self.assertRaises(TransportError):tiny.handle("POST","/mcp",self.headers,"123456")
 def test_header_body_consistency(self):
  h={**self.headers,"Mcp-Method":"tools/call","Mcp-Name":"lookup_order"}
  with self.assertRaises(TransportError):self.call(message("tools/list"),h)
  bad=message("tools/call",{"name":"lookup_order","arguments":{"order_id":"ORD-1"}})
  with self.assertRaises(TransportError):self.call(bad,{**self.headers,"Mcp-Method":"tools/call","Mcp-Name":"other"})
 def test_bearer_required_when_verifier_configured(self):
  g=StreamableHTTPGateway([self.a],{"https://app.example.com"},{"mcp.example.com"},token_verifier=lambda t:{"sub":"u1"} if t=="ok" else (_ for _ in ()).throw(ValueError()))
  with self.assertRaises(TransportError):g.handle("POST","/mcp",self.headers,json.dumps(message()))
  r=g.handle("POST","/mcp",{**self.headers,"Authorization":"Bearer ok"},json.dumps(message()))
  self.assertEqual(r["authenticated_subject"],"u1")
 def test_stdio_jsonl_parser(self):
  parsed=parse_stdio_lines('{"jsonrpc":"2.0","id":1}\n\n{"jsonrpc":"2.0","id":2}\n')
  self.assertEqual(len(parsed),2)
  with self.assertRaises(TransportError):parse_stdio_lines('not-json\n')
if __name__=="__main__":unittest.main()
