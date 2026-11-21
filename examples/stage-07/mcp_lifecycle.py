"""Minimal JSON-RPC MCP-style lifecycle simulator; stdlib only, no network transport."""
from dataclasses import dataclass

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
  self.name=name;self.version=version;self.protocol_versions=protocol_versions or ["2025-06-18"]
  self.tools={};self.initialized_sessions=set()
 def register_tool(self,tool):
  if tool.name in self.tools:raise ValueError("duplicate tool")
  self.tools[tool.name]=tool
 def handle(self,session_id,message):
  if not isinstance(message,dict) or message.get("jsonrpc")!="2.0":raise RpcError(-32600,"invalid JSON-RPC request")
  method=message.get("method")
  if method=="initialize":
   params=message.get("params",{});requested=params.get("protocolVersion")
   if requested not in self.protocol_versions:raise RpcError(-32001,"unsupported protocol version")
   return {"jsonrpc":"2.0","id":message.get("id"),"result":{"protocolVersion":requested,"serverInfo":{"name":self.name,"version":self.version},"capabilities":{"tools":{"listChanged":False}}}}
  if method=="notifications/initialized":
   self.initialized_sessions.add(session_id);return None
  if session_id not in self.initialized_sessions:raise RpcError(-32002,"session is not initialized")
  if method=="ping":return {"jsonrpc":"2.0","id":message.get("id"),"result":{}}
  if method=="tools/list":
   tools=[{"name":t.name,"description":t.description,"inputSchema":t.input_schema} for t in self.tools.values()]
   return {"jsonrpc":"2.0","id":message.get("id"),"result":{"tools":tools}}
  if method=="tools/call":
   params=message.get("params",{});name=params.get("name");args=params.get("arguments",{})
   tool=self.tools.get(name)
   if tool is None:raise RpcError(-32602,"unknown tool")
   validate_args(tool.input_schema,args)
   result=tool.handler(args)
   return {"jsonrpc":"2.0","id":message.get("id"),"result":{"content":[{"type":"text","text":str(result)}],"isError":False}}
  if method=="shutdown":
   self.initialized_sessions.discard(session_id)
   return {"jsonrpc":"2.0","id":message.get("id"),"result":{}}
  raise RpcError(-32601,"method not found")

def validate_args(schema,args):
 if not isinstance(args,dict):raise RpcError(-32602,"arguments must be an object")
 required=schema.get("required",[])
 for key in required:
  if key not in args:raise RpcError(-32602,f"missing required argument: {key}")
 if schema.get("additionalProperties") is False:
  unknown=set(args)-set(schema.get("properties",{}))
  if unknown:raise RpcError(-32602,f"unknown arguments: {sorted(unknown)}")
 for key,spec in schema.get("properties",{}).items():
  if key in args and spec.get("type")=="string" and not isinstance(args[key],str):raise RpcError(-32602,f"{key} must be a string")

class MCPClient:
 def __init__(self,server,session_id="session-1",protocol_version="2025-06-18"):
  self.server=server;self.session_id=session_id;self.protocol_version=protocol_version;self.state="CREATED";self.next_id=1;self.server_info=None;self.capabilities={}
 def request(self,method,params=None):
  message={"jsonrpc":"2.0","id":self.next_id,"method":method,"params":params or {}};self.next_id+=1
  return self.server.handle(self.session_id,message)
 def notify(self,method,params=None):
  return self.server.handle(self.session_id,{"jsonrpc":"2.0","method":method,"params":params or {}})
 def initialize(self):
  if self.state!="CREATED":raise RpcError(-32003,"initialize is only valid once")
  self.state="INITIALIZING"
  result=self.request("initialize",{"protocolVersion":self.protocol_version,"capabilities":{},"clientInfo":{"name":"academy-host","version":"1.0.0"}})["result"]
  self.server_info=result["serverInfo"];self.capabilities=result["capabilities"]
  self.notify("notifications/initialized");self.state="READY";return result
 def list_tools(self):
  self._ready();return self.request("tools/list")["result"]["tools"]
 def call_tool(self,name,arguments,consented_tools):
  self._ready()
  if name not in consented_tools:raise PermissionError("host consent is required for this tool")
  return self.request("tools/call",{"name":name,"arguments":arguments})["result"]
 def _ready(self):
  if self.state!="READY":raise RpcError(-32002,"client is not ready")
 def shutdown(self):
  if self.state=="READY":self.request("shutdown")
  self.state="CLOSED"

def build_demo_server():
 server=MCPServer()
 server.register_tool(Tool("lookup_order","Read one order by ID",{"type":"object","properties":{"order_id":{"type":"string"}},"required":["order_id"],"additionalProperties":False},lambda a:{"order_id":a["order_id"],"status":"shipped"}))
 return server

if __name__=="__main__":
 client=MCPClient(build_demo_server());print(client.initialize());print(client.list_tools());print(client.call_tool("lookup_order",{"order_id":"ORD-7"},{"lookup_order"}));client.shutdown();print("state:",client.state)
