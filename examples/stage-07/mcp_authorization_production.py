"""Production adapter contract: verify bearer JWT via JWKS/introspection, then enforce MCP resource policy."""
from mcp_authorization import MCPResourcePolicy,VerifiedAccessToken,AuthorizationError

class MCPHTTPAuthorization:
 def __init__(self,resource_uri,issuer,required_scopes,token_verifier,public_tools=None,scope_implications=None):
  self.policy=MCPResourcePolicy(resource_uri,issuer,required_scopes,public_tools,scope_implications)
  self.token_verifier=token_verifier
 def authorize_request(self,headers,method,tool_name,now):
  auth=headers.get("Authorization","")
  if not auth.startswith("Bearer "):
   return {"status":401,"error":"invalid_token","www_authenticate":f'Bearer resource_metadata="{self.policy.resource_uri}/.well-known/oauth-protected-resource"'}
  raw=auth[7:]
  try:
   claims=self.token_verifier(raw)
   token=VerifiedAccessToken(issuer=claims["iss"],audience=claims["aud"],subject=claims["sub"],scopes=set(claims.get("scope","").split()),expires_at=int(claims["exp"]),not_before=int(claims.get("nbf",0)))
   context=self.policy.authorize(method,tool_name,token,now)
   return {"status":200,"context":context}
  except AuthorizationError as e:
   return {"status":e.status,"error":e.code,"www_authenticate":e.challenge}
  except Exception:
   return {"status":401,"error":"invalid_token","www_authenticate":f'Bearer resource_metadata="{self.policy.resource_uri}/.well-known/oauth-protected-resource"'}
