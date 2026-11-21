"""Stateless MCP 2026-07-28-style request lifecycle simulator; no transport dependency."""
from dataclasses import dataclass

PROTOCOL_VERSION="2026-07-28"
META_PROTOCOL="io.modelcontextprotocol/protocolVersion"
META_CAPABILITIES="io.modelcontextprotocol/clientCapabilities"
META_CLIENT="io.modelcontextprotocol/clientInfo"

class RpcError(Exception):
 def __init__(self,code,message):super().__init__(message);self.code=code

@dataclass
class Tool:
 name:str
 description:str
 input_schema:dict
 handler:object

class MCPServer:
 def __init__(self,name="academy-tools",version="1.0.0",protocol_versions=None):
  self.name=name;self.version=version;self.protocol_versions=protocol_versions or [PROTOCOL_VERSION];self.tools={}
 def register_tool(self,tool):
  if tool.name in self.tools:raise ValueError("duplicate tool")
  self.tools[tool.name]=tool
 def handle(self,headers,message):
  if not isinstance(message,dict) or message.get("jsonrpc")!="2.0" or "id" not in message:
   raise RpcError(-32600,"invalid JSON-RPC request")
  method=message.get("method")
  if headers.get("Mcp-Method")!=method:raise RpcError(-32020,"Mcp-Method header mismatch")
  meta=message.get("params",{}).get("_meta",{})
  version=meta.get(META_PROTOCOL);caps=meta.get(META_CAPABILITIES)
  if version not in self.protocol_versions:raise RpcError(-32022,"unsupported protocol version")
  if not isinstance(caps,dict):raise RpcError(-32602,"clientCapabilities is required")
  if method=="server/discover":
   result={"protocolVersions":self.protocol_versions,"serverInfo":{"name":self.name,"version":self.version},"capabilities":{"tools":{"listChanged":False}}}
  elif method=="tools/list":
   tools=[{"name":t.name,"description":t.description,"inputSchema":t.input_schema} for t in sorted(self.tools.values(),key=lambda x:x.name)]
   result={"tools":tools,"ttlMs":30000,"cacheScope":"private"}
  elif method=="tools/call":
   params=message.get("params",{});name=params.get("name");args=params.get("arguments",{})
   if headers.get("Mcp-Name")!=name:raise RpcError(-32020,"Mcp-Name header mismatch")
   tool=self.tools.get(name)
   if tool is None:raise RpcError(-32602,"unknown tool")
   validate_args(tool.input_schema,args)
   output=tool.handler(args)
   result={"resultType":"complete","content":[{"type":"text","text":str(output)}],"isError":False}
  else:raise RpcError(-32601,"method not found")
  return {"jsonrpc":"2.0","id":message["id"],"result":result,"_meta":{"io.modelcontextprotocol/serverInfo":{"name":self.name,"version":self.version}}}

def validate_args(schema,args):
 if not isinstance(args,dict):raise RpcError(-32602,"arguments must be an object")
 for key in schema.get("required",[]):
  if key not in args:raise RpcError(-32602,f"missing required argument: {key}")
 if schema.get("additionalProperties") is False:
  unknown=set(args)-set(schema.get("properties",{}))
  if unknown:raise RpcError(-32602,f"unknown arguments: {sorted(unknown)}")
 for key,spec in schema.get("properties",{}).items():
  if key in args and spec.get("type")=="string" and not isinstance(args[key],str):
   raise RpcError(-32602,f"{key} must be a string")

class MCPClient:
 """Stateless client: each request carries version and client capabilities in _meta."""
 def __init__(self,server,protocol_version=PROTOCOL_VERSION):
  self.server=server;self.protocol_version=protocol_version;self.next_id=1
  self.client_info={"name":"academy-host","version":"1.0.0"};self.capabilities={}
  self.server_info=None;self.closed=False
 def request(self,method,params=None,name=None):
  if self.closed:raise RpcError(-32002,"client is closed")
  payload=dict(params or {})
  payload["_meta"]={META_PROTOCOL:self.protocol_version,META_CAPABILITIES:self.capabilities,META_CLIENT:self.client_info}
  message={"jsonrpc":"2.0","id":self.next_id,"method":method,"params":payload};self.next_id+=1
  headers={"Mcp-Method":method}
  if name is not None:headers["Mcp-Name"]=name
  response=self.server.handle(headers,message)
  info=response.get("_meta",{}).get("io.modelcontextprotocol/serverInfo")
  if info:self.server_info=info
  return response
 def discover(self):
  return self.request("server/discover")["result"]
 def list_tools(self):
  return self.request("tools/list")["result"]
 def call_tool(self,name,arguments,consented_tools):
  if name not in consented_tools:raise PermissionError("host consent is required for this tool")
  return self.request("tools/call",{"name":name,"arguments":arguments},name=name)["result"]
 def close(self):self.closed=True

def build_demo_server():
 server=MCPServer()
 server.register_tool(Tool("lookup_order","Read one order by ID",{"type":"object","properties":{"order_id":{"type":"string"}},"required":["order_id"],"additionalProperties":False},lambda a:{"order_id":a["order_id"],"status":"shipped"}))
 return server

if __name__=="__main__":
 client=MCPClient(build_demo_server())
 print("discover:",client.discover())
 print("tools:",client.list_tools())
 print("call:",client.call_tool("lookup_order",{"order_id":"ORD-7"},{"lookup_order"}))
 client.close();print("client closed:",client.closed)
