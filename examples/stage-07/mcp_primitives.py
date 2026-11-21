"""Stateless MCP-style server primitives: tools, resources, templates and prompts."""
from dataclasses import dataclass

VERSION="2026-07-28"
META_VERSION="io.modelcontextprotocol/protocolVersion"
META_CAPS="io.modelcontextprotocol/clientCapabilities"

@dataclass
class ToolDef:
 name:str;description:str;schema:dict;handler:object
@dataclass
class ResourceDef:
 uri:str;name:str;description:str;mime_type:str;reader:object
@dataclass
class PromptDef:
 name:str;description:str;arguments:list;builder:object

class PrimitiveServer:
 def __init__(self):
  self.tools={};self.resources={};self.templates=[];self.prompts={}
 def add_tool(self,tool):self.tools[tool.name]=tool
 def add_resource(self,resource):self.resources[resource.uri]=resource
 def add_template(self,template):self.templates.append(template)
 def add_prompt(self,prompt):self.prompts[prompt.name]=prompt
 def handle(self,headers,message):
  if message.get("jsonrpc")!="2.0" or "id" not in message:raise ValueError("invalid JSON-RPC request")
  method=message["method"];params=message.get("params",{});meta=params.get("_meta",{})
  if headers.get("Mcp-Method")!=method:raise ValueError("Mcp-Method mismatch")
  if meta.get(META_VERSION)!=VERSION or not isinstance(meta.get(META_CAPS),dict):raise ValueError("missing or unsupported request metadata")
  if method=="tools/list":
   result={"resultType":"complete","tools":[{"name":x.name,"description":x.description,"inputSchema":x.schema} for x in sorted(self.tools.values(),key=lambda t:t.name)],"ttlMs":30000,"cacheScope":"private"}
  elif method=="tools/call":
   name=params.get("name")
   if headers.get("Mcp-Name")!=name:raise ValueError("Mcp-Name mismatch")
   tool=self.tools.get(name)
   if not tool:raise KeyError("tool not found")
   args=params.get("arguments",{})
   validate(tool.schema,args)
   result={"resultType":"complete","content":[{"type":"text","text":str(tool.handler(args))}],"isError":False}
  elif method=="resources/list":
   result={"resultType":"complete","resources":[{"uri":x.uri,"name":x.name,"description":x.description,"mimeType":x.mime_type} for x in sorted(self.resources.values(),key=lambda r:r.uri)],"ttlMs":30000,"cacheScope":"private"}
  elif method=="resources/read":
   resource=self.resources.get(params.get("uri"))
   if not resource:raise KeyError("resource not found")
   result={"resultType":"complete","contents":[{"uri":resource.uri,"mimeType":resource.mime_type,"text":resource.reader()}]}
  elif method=="resources/templates/list":
   result={"resultType":"complete","resourceTemplates":self.templates,"ttlMs":30000,"cacheScope":"private"}
  elif method=="prompts/list":
   result={"resultType":"complete","prompts":[{"name":p.name,"description":p.description,"arguments":p.arguments} for p in sorted(self.prompts.values(),key=lambda p:p.name)],"ttlMs":30000,"cacheScope":"private"}
  elif method=="prompts/get":
   prompt=self.prompts.get(params.get("name"))
   if not prompt:raise KeyError("prompt not found")
   args=params.get("arguments",{})
   required=[x["name"] for x in prompt.arguments if x.get("required")]
   if any(x not in args for x in required):raise ValueError("missing prompt argument")
   result={"resultType":"complete","description":prompt.description,"messages":prompt.builder(args)}
  else:raise LookupError("method not found")
  return {"jsonrpc":"2.0","id":message["id"],"result":result,"_meta":{"io.modelcontextprotocol/serverInfo":{"name":"academy-primitives","version":"1.0.0"}}}

def validate(schema,args):
 if not isinstance(args,dict):raise ValueError("arguments must be object")
 if any(k not in args for k in schema.get("required",[])):raise ValueError("missing required tool argument")
 if schema.get("additionalProperties") is False and set(args)-set(schema.get("properties",{})):raise ValueError("unexpected tool argument")

class PrimitiveClient:
 def __init__(self,server):self.server=server;self.counter=0
 def request(self,method,params=None,name=None):
  self.counter+=1;params=dict(params or {});params["_meta"]={META_VERSION:VERSION,META_CAPS:{}}
  headers={"Mcp-Method":method}
  if name:headers["Mcp-Name"]=name
  return self.server.handle(headers,{"jsonrpc":"2.0","id":self.counter,"method":method,"params":params})["result"]

def demo_server():
 s=PrimitiveServer()
 s.add_tool(ToolDef("calculate_refund","Quote a refund; does not execute it",{"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"],"additionalProperties":False},lambda a:{"quoted_amount":a["amount"],"currency":"INR"}))
 s.add_resource(ResourceDef("policy://refunds/v3","Refund policy v3","Read-only refund policy","text/markdown",lambda:"# Refund policy v3\nRefunds require eligibility and high-value approval."))
 s.add_template({"uriTemplate":"tenant://{tenant_id}/orders/{order_id}","name":"Tenant order","description":"Tenant-scoped order resource"})
 s.add_prompt(PromptDef("refund_review","Review refund evidence without executing a refund",[{"name":"order_id","required":True} ],lambda a:[{"role":"user","content":{"type":"text","text":"Review order "+a["order_id"]+" against the refund policy. Do not execute a refund."}}]))
 return s

if __name__=="__main__":
 c=PrimitiveClient(demo_server())
 print("tools",c.request("tools/list")["tools"])
 print("resources",c.request("resources/list")["resources"])
 print("read",c.request("resources/read",{"uri":"policy://refunds/v3"})["contents"])
 print("prompts",c.request("prompts/list")["prompts"])
 print("prompt",c.request("prompts/get",{"name":"refund_review","arguments":{"order_id":"ORD-7"}})["messages"])
