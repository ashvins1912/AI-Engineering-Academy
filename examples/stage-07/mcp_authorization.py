"""MCP OAuth resource-server policy model. Token signature verification is delegated to a trusted verifier."""
from dataclasses import dataclass

@dataclass
class VerifiedAccessToken:
 issuer:str
 audience:str
 subject:str
 scopes:set
 expires_at:int
 not_before:int=0

class AuthorizationError(Exception):
 def __init__(self,status,code,message,challenge=None):
  super().__init__(message);self.status=status;self.code=code;self.challenge=challenge

class MCPResourcePolicy:
 def __init__(self,resource_uri,issuer,required_scopes,public_tools=None,scope_implications=None):
  self.resource_uri=resource_uri;self.issuer=issuer;self.required_scopes=required_scopes
  self.public_tools=set(public_tools or [])
  self.scope_implications=scope_implications or {}
  self.resource_metadata={"resource":resource_uri,"authorization_servers":[issuer],"scopes_supported":sorted({scope for values in required_scopes.values() for scope in values})}
 def _effective_scopes(self,scopes):
  effective=set(scopes)
  changed=True
  while changed:
   changed=False
   for parent,children in self.scope_implications.items():
    if parent in effective:
     before=len(effective);effective.update(children);changed|=len(effective)>before
  return effective
 def authorize(self,method,tool_name,token,now):
  key=f"{method}:{tool_name}" if method=="tools/call" else method
  if method=="tools/call" and tool_name in self.public_tools:return {"subject":"anonymous","scopes":set()}
  required=self.required_scopes.get(key,self.required_scopes.get(method,set()))
  if token is None:
   raise AuthorizationError(401,"invalid_token","Bearer token required",f'Bearer resource_metadata="{self.resource_uri}/.well-known/oauth-protected-resource"')
  if token.issuer!=self.issuer:raise AuthorizationError(401,"invalid_token","wrong token issuer")
  if token.audience!=self.resource_uri:raise AuthorizationError(401,"invalid_token","token audience is not this MCP resource")
  if now>=token.expires_at or now<token.not_before:raise AuthorizationError(401,"invalid_token","token is expired or not yet valid")
  scopes=self._effective_scopes(token.scopes)
  missing=set(required)-scopes
  if missing:raise AuthorizationError(403,"insufficient_scope","missing scopes: "+",".join(sorted(missing)), 'Bearer error="insufficient_scope", scope="'+ " ".join(sorted(missing)) +'"')
  return {"subject":token.subject,"scopes":scopes}

def validate_authorization_response(expected_issuer,returned_issuer):
 if not returned_issuer or returned_issuer!=expected_issuer:
  raise AuthorizationError(400,"issuer_mismatch","authorization response issuer validation failed")

class IssuerBoundTokenStore:
 def __init__(self):self.tokens={}
 def save(self,issuer,resource,token):
  self.tokens[(issuer,resource)]=token
 def get(self,issuer,resource):
  return self.tokens.get((issuer,resource))
