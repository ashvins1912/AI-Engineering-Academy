import unittest
from mcp_transports_production import TransportSecurityConfig,validate_config,deployment_readiness
class TransportProductionTests(unittest.TestCase):
 def config(self,**kw):
  v=dict(endpoint_path="/mcp",allowed_hosts=frozenset({"mcp.example.com"}),allowed_origins=frozenset({"https://app.example.com"}),max_body_bytes=65536,require_bearer=True,cors_methods=frozenset({"POST","OPTIONS"}),cors_headers=frozenset({"Authorization","Content-Type"}))
  v.update(kw);return TransportSecurityConfig(**v)
 def test_valid_config(self):self.assertTrue(validate_config(self.config()))
 def test_wildcard_origin_rejected(self):
  with self.assertRaises(ValueError):validate_config(self.config(allowed_origins=frozenset({"*"})))
 def test_missing_host_or_bad_body_rejected(self):
  with self.assertRaises(ValueError):validate_config(self.config(allowed_hosts=frozenset()))
  with self.assertRaises(ValueError):validate_config(self.config(max_body_bytes=100))
 def test_proxy_headers_must_not_be_trusted_by_default(self):
  with self.assertRaises(ValueError):validate_config(self.config(trust_proxy_headers=True))
 def test_stateless_horizontal_deployment(self):
  r=deployment_readiness(self.config(),replicas=3)
  self.assertTrue(r["ready"]);self.assertFalse(r["sticky_sessions"])
  with self.assertRaises(ValueError):deployment_readiness(self.config(),replicas=3,shared_protocol_session_store=True)
if __name__=="__main__":unittest.main()
