import unittest
from mcp_observability import redact,make_trace_event,MCPMetrics,retry_delay,CircuitBreaker,CircuitOpen

class MCPObservabilityTests(unittest.TestCase):
 def test_recursive_secret_redaction(self):
  value={"Authorization":"Bearer secret","nested":{"access_token":"abc","safe":"ok"},"cookie":"x"}
  out=redact(value)
  self.assertEqual(out["Authorization"],"[REDACTED]");self.assertEqual(out["nested"]["access_token"],"[REDACTED]");self.assertEqual(out["nested"]["safe"],"ok")
 def test_trace_uses_tenant_fingerprint(self):
  event=make_trace_event(trace_id="t",request_id="r",method="tools/call",tenant_id="tenant-a",tool_name="lookup",status=200,latency_ms=25,attributes={"authorization":"secret"})
  self.assertNotIn("tenant-a",str(event));self.assertEqual(event["attributes"]["authorization"],"[REDACTED]")
 def test_metrics_and_percentiles(self):
  m=MCPMetrics()
  for x in [10,20,30,40,100]:m.record("tools/call",200,x)
  m.record("tools/call",500,50)
  s=m.summary("tools/call")
  self.assertEqual(s["count"],6);self.assertEqual(s["errors"],1);self.assertEqual(s["p50_ms"],30);self.assertEqual(s["p95_ms"],100)
 def test_retry_only_safe_idempotent_operations(self):
  self.assertEqual(retry_delay(503,0,idempotent=True),.25)
  self.assertIsNone(retry_delay(503,0,idempotent=False))
  self.assertEqual(retry_delay(429,0,idempotent=False,idempotency_key="k",retry_after=8),4)
  self.assertIsNone(retry_delay(400,0,idempotent=True))
 def test_circuit_breaker_open_half_open_and_recovery(self):
  b=CircuitBreaker(threshold=2,reset_after=10)
  b.failure(1);b.failure(2)
  with self.assertRaises(CircuitOpen):b.before_request(5)
  b.before_request(12)
  with self.assertRaises(CircuitOpen):b.before_request(12)
  b.success();self.assertEqual(b.state,"CLOSED")
if __name__=="__main__":unittest.main()
