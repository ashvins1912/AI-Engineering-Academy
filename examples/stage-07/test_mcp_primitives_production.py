import unittest
from mcp_primitives_production import MCPPrimitivePolicy,PrimitivePolicyError
class MCPPrimitivePolicyTests(unittest.TestCase):
 def setUp(self):self.policy=MCPPrimitivePolicy({"calculate_refund":"orders:read"},{"tenant://": "unused"} if False else ["tenant://"],{"refund_review"})
 def test_tool_consent_and_scope(self):
  self.assertTrue(self.policy.authorize_tool("calculate_refund",{"calculate_refund"},{"orders:read"}))
  with self.assertRaises(PrimitivePolicyError):self.policy.authorize_tool("calculate_refund",set(),{"orders:read"})
  with self.assertRaises(PrimitivePolicyError):self.policy.authorize_tool("calculate_refund",{"calculate_refund"},set())
 def test_resource_is_tenant_scoped(self):
  self.assertTrue(self.policy.authorize_resource("tenant://a/orders/7","a",{"resources:read"}))
  with self.assertRaises(PrimitivePolicyError):self.policy.authorize_resource("tenant://b/orders/7","a",{"resources:read"})
 def test_prompt_allowlist(self):
  self.assertTrue(self.policy.authorize_prompt("refund_review"))
  with self.assertRaises(PrimitivePolicyError):self.policy.authorize_prompt("system_override")
if __name__=="__main__":unittest.main()
