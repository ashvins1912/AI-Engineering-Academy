"""Host policy for MCP tools/resources/prompts: consent, scopes and tenant-bound URIs."""
class PrimitivePolicyError(PermissionError):pass
class MCPPrimitivePolicy:
 def __init__(self,tool_scopes,resource_prefixes,prompt_allowlist):
  self.tool_scopes=tool_scopes;self.resource_prefixes=resource_prefixes;self.prompt_allowlist=set(prompt_allowlist)
 def authorize_tool(self,name,consent,scopes):
  if name not in consent:raise PrimitivePolicyError("tool consent missing")
  required=self.tool_scopes.get(name)
  if required is None or required not in scopes:raise PrimitivePolicyError("tool scope missing or tool unknown")
  return True
 def authorize_resource(self,uri,tenant_id,scopes):
  if "resources:read" not in scopes:raise PrimitivePolicyError("resource read scope missing")
  if not uri.startswith(f"tenant://{tenant_id}/"):raise PrimitivePolicyError("resource URI is outside tenant boundary")
  if not any(uri.startswith(prefix) for prefix in self.resource_prefixes):raise PrimitivePolicyError("resource prefix not allowed")
  return True
 def authorize_prompt(self,name):
  if name not in self.prompt_allowlist:raise PrimitivePolicyError("prompt is not allow-listed")
  return True
