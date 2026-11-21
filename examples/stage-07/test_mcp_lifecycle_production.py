import unittest
from mcp_lifecycle_production import MCPToolGateway,build_gateway,ToolPolicyError
class MCPGatewayTests(unittest.TestCase):
 def setUp(self):self.gateway=build_gateway()
 def call(self,**overrides):
  args={"user_id":"user-1","tenant_id":"tenant-a","tool_name":"lookup_order","arguments":{"order_id":"ORD-7"},"granted_scopes":{"orders:read"},"consented_tools":{"lookup_order"}}
  args.update(overrides);return self.gateway.call(**args)
 def test_context_injected_from_authenticated_host(self):
  r=self.call();self.assertEqual(r["tenant_id"],"tenant-a")
 def test_no_consent_or_scope_rejected(self):
  with self.assertRaises(ToolPolicyError):self.call(consented_tools=set())
  with self.assertRaises(ToolPolicyError):self.call(granted_scopes=set())
 def test_model_cannot_choose_tenant(self):
  with self.assertRaises(ToolPolicyError):self.call(arguments={"order_id":"ORD-7","tenant_id":"tenant-b"})
 def test_unknown_tool_rejected(self):
  with self.assertRaises(ToolPolicyError):self.call(tool_name="shell",consented_tools={"shell"})
 def test_missing_identity_rejected(self):
  with self.assertRaises(ToolPolicyError):self.call(user_id="")
if __name__=="__main__":unittest.main()
