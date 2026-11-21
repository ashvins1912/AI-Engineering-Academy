"""Production transport deployment checklist and immutable security policy."""
from dataclasses import dataclass
@dataclass(frozen=True)
class TransportSecurityConfig:
 endpoint_path:str
 allowed_hosts:frozenset
 allowed_origins:frozenset
 max_body_bytes:int
 require_bearer:bool
 cors_methods:frozenset
 cors_headers:frozenset
 trust_proxy_headers:bool=False

def validate_config(config):
 if config.endpoint_path!="/mcp":raise ValueError("MCP endpoint must be explicitly configured")
 if not config.allowed_hosts:raise ValueError("allowed host list is required")
 if config.max_body_bytes<1024:raise ValueError("body limit is too small")
 if "*" in config.allowed_origins:raise ValueError("wildcard origin is not allowed for credentialed MCP")
 if config.trust_proxy_headers:raise ValueError("only trust proxy headers from a configured trusted proxy")
 if "POST" not in config.cors_methods:raise ValueError("POST must be allowed")
 if "Authorization" not in config.cors_headers:raise ValueError("Authorization header must be allowed when OAuth is enabled")
 return True

def deployment_readiness(config,replicas,shared_protocol_session_store=False):
 validate_config(config)
 if replicas>1 and shared_protocol_session_store:
  raise ValueError("stateless protocol should not depend on shared session affinity")
 return {"ready":True,"replicas":replicas,"protocol":"stateless","sticky_sessions":False,"notes":["externalize application state with explicit handles","terminate TLS at trusted edge","keep secrets outside image and logs"]}
