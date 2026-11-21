import unittest
from tool_integration import *

class ToolIntegrationTests(unittest.TestCase):
 def setUp(self):
  self.clock_value=0
  self.clock=lambda:self.clock_value
  self.spec=ToolSpec("refund",("order_id","amount"),{"order_id":str,"amount":int,"tenant_id":str},"refund:write",True,False,("provider_id","status"))
  self.auth=AuthContext("tenant-a","user-1",frozenset({"refund:write"}))
  self.calls=[]
  self.gateway=ToolGateway([self.spec],{"refund":lambda args,key:self.calls.append((args,key)) or {"provider_id":"p-1","status":"succeeded"}},clock=self.clock)
 def test_strict_schema_rejects_unknown_and_wrong_types_before_handler(self):
  with self.assertRaises(ValidationError):self.gateway.execute("refund",{"order_id":"o1","amount":10,"tenant_id":"tenant-a","admin":True},self.auth,"k1")
  with self.assertRaises(ValidationError):self.gateway.execute("refund",{"order_id":"o1","amount":True,"tenant_id":"tenant-a"},self.auth,"k2")
  self.assertEqual(self.calls,[])
 def test_trusted_tenant_and_scope_are_required(self):
  with self.assertRaises(AuthorizationError):self.gateway.execute("refund",{"order_id":"o1","amount":10,"tenant_id":"tenant-b"},self.auth,"k")
  no_scope=AuthContext("tenant-a","user-1",frozenset())
  with self.assertRaises(AuthorizationError):self.gateway.execute("refund",{"order_id":"o1","amount":10},no_scope,"k")
 def test_non_idempotent_write_requires_key(self):
  with self.assertRaises(IdempotencyConflict):self.gateway.execute("refund",{"order_id":"o1","amount":10},self.auth)
 def test_token_bucket_refills(self):
  bucket=TokenBucket(2,1,self.clock);bucket.consume();bucket.consume()
  with self.assertRaises(RateLimitError):bucket.consume()
  self.clock_value=2
  self.assertEqual(bucket.consume(),1.0)
 def test_circuit_breaker_open_half_open_and_recovery(self):
  breaker=CircuitBreaker(2,5,self.clock)
  breaker.failure();breaker.failure()
  self.assertEqual(breaker.state,"OPEN")
  with self.assertRaises(CircuitOpenError):breaker.allow()
  self.clock_value=5;breaker.allow();self.assertEqual(breaker.state,"HALF_OPEN")
  with self.assertRaises(CircuitOpenError):breaker.allow()
  breaker.success();self.assertEqual(breaker.state,"CLOSED")
 def test_retry_only_transient_and_idempotent(self):
  delays=[];attempts=[]
  def operation(n):
   attempts.append(n)
   if n<3:raise type("ProviderError",(Exception,),{"status":503})()
   return "ok"
  self.assertEqual(retry_call(operation,lambda e:getattr(e,"status",0)==503,3,0.1,delays.append,idempotent=True),"ok")
  self.assertEqual(attempts,[1,2,3]);self.assertEqual(delays,[0.1,0.2])
  attempts.clear()
  with self.assertRaises(Exception):retry_call(operation,lambda e:True,3,idempotent=False)
  self.assertEqual(attempts,[1])
 def test_same_key_replays_and_payload_mismatch_conflicts(self):
  args={"order_id":"o1","amount":10,"tenant_id":"tenant-a"}
  result=self.gateway.execute("refund",args,self.auth,"key-1")
  self.assertEqual(self.gateway.execute("refund",args,self.auth,"key-1"),result)
  self.assertEqual(len(self.calls),1)
  with self.assertRaises(IdempotencyConflict):self.gateway.execute("refund",{**args,"amount":11},self.auth,"key-1")
 def test_timeout_marks_operation_unknown_for_reconciliation(self):
  def timeout(args,key):raise TimeoutError()
  gateway=ToolGateway([self.spec],{"refund":timeout},clock=self.clock)
  with self.assertRaises(TimeoutError):gateway.execute("refund",{"order_id":"o1","amount":10,"tenant_id":"tenant-a"},self.auth,"key-1")
  self.assertEqual(next(iter(gateway.operations.values()))["status"],"unknown")
  with self.assertRaises(OperationPending):gateway.execute("refund",{"order_id":"o1","amount":10,"tenant_id":"tenant-a"},self.auth,"key-1")
 def test_secret_redaction(self):
  result=redact({"Authorization":"Bearer abc","nested":{"api_key":"secret","status":"ok"}})
  self.assertEqual(result["Authorization"],"[REDACTED]");self.assertEqual(result["nested"]["api_key"],"[REDACTED]")
if __name__=="__main__":unittest.main()
