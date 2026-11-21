import unittest
from mcp_authorization_production import MCPHTTPAuthorization

class HTTPAuthorizationTests(unittest.TestCase):
 def setUp(self):
  self.calls=[]
  def verify(token):
   self.calls.append(token)
   if token!="signed-good":raise ValueError("signature invalid")
   return {"iss":"https://auth.example.com","aud":"https://mcp.example.com/mcp","sub":"u1","scope":"orders:read","exp":200,"nbf":1}
  self.gateway=MCPHTTPAuthorization("https://mcp.example.com/mcp","https://auth.example.com",{"tools/call:lookup":{"orders:read"}},verify,public_tools={"health"})
 def test_missing_bearer_challenges_at_http_boundary(self):
  r=self.gateway.authorize_request({},"tools/call","lookup",100)
  self.assertEqual(r["status"],401);self.assertIn("resource_metadata",r["www_authenticate"])
 def test_verified_bearer_passes(self):
  r=self.gateway.authorize_request({"Authorization":"Bearer signed-good"},"tools/call","lookup",100)
  self.assertEqual(r["status"],200);self.assertEqual(r["context"]["subject"],"u1")
 def test_invalid_signature_rejected(self):
  r=self.gateway.authorize_request({"Authorization":"Bearer forged"},"tools/call","lookup",100)
  self.assertEqual(r["status"],401)
 def test_public_tool_can_be_anonymous(self):
  r=self.gateway.authorize_request({},"tools/call","health",100)
  self.assertEqual(r["status"],200)
if __name__=="__main__":unittest.main()
