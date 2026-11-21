"""Transport policy simulator for STDIO and stateless Streamable HTTP MCP."""
import json
class TransportError(Exception):
 def __init__(self,status,message):super().__init__(message);self.status=status

def parse_stdio_lines(stream):
 messages=[]
 for number,line in enumerate(stream.splitlines(),1):
  if not line.strip():continue
  try:messages.append(json.loads(line))
  except json.JSONDecodeError as e:raise TransportError(400,f"invalid JSON on STDIO line {number}") from e
 return messages

class StreamableHTTPGateway:
 def __init__(self,servers,allowed_origins,allowed_hosts,max_body_bytes=65536,token_verifier=None):
  if not servers:raise ValueError("at least one stateless server instance is required")
  self.servers=servers;self.allowed_origins=set(allowed_origins);self.allowed_hosts=set(allowed_hosts)
  self.max_body_bytes=max_body_bytes;self.token_verifier=token_verifier;self.cursor=0
 def handle(self,method,path,headers,body):
  if method!="POST" or path!="/mcp":raise TransportError(404,"MCP endpoint not found")
  if headers.get("Content-Type","").split(";")[0].strip().lower()!="application/json":raise TransportError(415,"application/json required")
  host=headers.get("Host","")
  if host not in self.allowed_hosts:raise TransportError(403,"host not allowed")
  origin=headers.get("Origin")
  if origin and origin not in self.allowed_origins:raise TransportError(403,"origin not allowed")
  if len(body.encode("utf-8"))>self.max_body_bytes:raise TransportError(413,"request body too large")
  try:message=json.loads(body)
  except json.JSONDecodeError as e:raise TransportError(400,"invalid JSON-RPC body") from e
  if headers.get("Mcp-Method")!=message.get("method"):raise TransportError(400,"Mcp-Method does not match JSON-RPC method")
  params=message.get("params",{})
  if message.get("method")=="tools/call" and headers.get("Mcp-Name")!=params.get("name"):raise TransportError(400,"Mcp-Name does not match tool name")
  token=None
  auth=headers.get("Authorization","")
  if self.token_verifier:
   if not auth.startswith("Bearer "):raise TransportError(401,"bearer token required")
   try:token=self.token_verifier(auth[7:])
   except Exception as e:raise TransportError(401,"invalid bearer token") from e
  server=self.servers[self.cursor%len(self.servers)];self.cursor+=1
  response=server.handle({"Mcp-Method":message["method"],"Mcp-Name":headers.get("Mcp-Name","")},message)
  return {"status":200,"headers":{"Content-Type":"application/json","Cache-Control":"no-store"},"body":response,"server_instance":server.name,"authenticated_subject":token.get("sub") if token else None}
