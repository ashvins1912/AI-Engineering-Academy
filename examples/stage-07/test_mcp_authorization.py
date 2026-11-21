import unittest
from mcp_authorization import MCPResourcePolicy,VerifiedAccessToken,AuthorizationError,validate_authorization_response,IssuerBoundTokenStore

class MCPAuthorizationTests(unittest.TestCase):
 def setUp(self):
  self.policy=MCPResourcePolicy("https://mcp.example.com/mcp","https://auth.example.com",{"tools/call:refund":{"refund:write"},"tools/call:lookup":{"orders:read"},"tools/list":{"mcp:read"}},public_tools={"health"},scope_implications={"orders:admin":{"orders:read"}})
  self.good=VerifiedAccessToken("https://auth.example.com","https://mcp.example.com/mcp","user-1",{"refund:write","orders:read"},200,90)
 def test_valid_resource_audience_issuer_and_scope(self):
  self.assertEqual(self.policy.authorize("tools/call","refund",self.good,100)["subject"],"user-1")
 def test_missing_token_401_challenge(self):
  with self.assertRaises(AuthorizationError) as e:self.policy.authorize("tools/call","refund",None,100)
  self.assertEqual(e.exception.status,401);self.assertIn("resource_metadata",e.exception.challenge)
 def test_wrong_issuer_or_audience_rejected(self):
  for token in [VerifiedAccessToken("other","https://mcp.example.com/mcp","u",{"refund:write"},100),VerifiedAccessToken("https://auth.example.com","other","u",{"refund:write"},100)]:
   with self.assertRaises(AuthorizationError) as e:self.policy.authorize("tools/call","refund",token,50)
   self.assertEqual(e.exception.status,401)
 def test_expiry_and_not_before(self):
  expired=VerifiedAccessToken("https://auth.example.com","https://mcp.example.com/mcp","u",{"refund:write"},90)
  future=VerifiedAccessToken("https://auth.example.com","https://mcp.example.com/mcp","u",{"refund:write"},200,110)
  with self.assertRaises(AuthorizationError):self.policy.authorize("tools/call","refund",expired,100)
  with self.assertRaises(AuthorizationError):self.policy.authorize("tools/call","refund",future,100)
 def test_insufficient_scope_403(self):
  token=VerifiedAccessToken("https://auth.example.com","https://mcp.example.com/mcp","u",{"orders:read"},200)
  with self.assertRaises(AuthorizationError) as e:self.policy.authorize("tools/call","refund",token,100)
  self.assertEqual(e.exception.status,403);self.assertEqual(e.exception.code,"insufficient_scope")
 def test_scope_hierarchy(self):
  token=VerifiedAccessToken("https://auth.example.com","https://mcp.example.com/mcp","u",{"orders:admin"},200)
  self.assertIn("orders:read",self.policy.authorize("tools/call","lookup",token,100)["scopes"])
 def test_public_tool_does_not_require_token(self):
  self.assertEqual(self.policy.authorize("tools/call","health",None,100)["subject"],"anonymous")
 def test_issuer_mixup_rejected(self):
  with self.assertRaises(AuthorizationError):validate_authorization_response("https://auth-a","https://auth-b")
  validate_authorization_response("https://auth-a","https://auth-a")
 def test_tokens_bound_to_issuer_and_resource(self):
  store=IssuerBoundTokenStore();store.save("issuer-a","resource-a","token-a")
  self.assertIsNone(store.get("issuer-b","resource-a"));self.assertIsNone(store.get("issuer-a","resource-b"))
if __name__=="__main__":unittest.main()
