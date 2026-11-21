"""Application-owned MCP host tool gateway: consent, scopes and tenant context."""
class ToolPolicyError(PermissionError):pass

class MCPToolGateway:
 def __init__(self,tools):
  self.tools=tools
 def call(self,*,user_id,tenant_id,tool_name,arguments,granted_scopes,consented_tools):
  if not user_id or not tenant_id:raise ToolPolicyError("authenticated user and tenant are required")
  if tool_name not in consented_tools:raise ToolPolicyError("user consent missing")
  entry=self.tools.get(tool_name)
  if entry is None:raise ToolPolicyError("tool is not registered")
  if entry["scope"] not in granted_scopes:raise ToolPolicyError("required scope missing")
  if "tenant_id" in arguments:raise ToolPolicyError("tenant context must not be supplied by tool arguments")
  safe_args={**arguments,"tenant_id":tenant_id,"user_id":user_id}
  return entry["handler"](safe_args)

def build_gateway():
 def order_lookup(args):
  return {"tenant_id":args["tenant_id"],"order_id":args["order_id"],"status":"shipped"}
 return MCPToolGateway({"lookup_order":{"scope":"orders:read","handler":order_lookup}})
