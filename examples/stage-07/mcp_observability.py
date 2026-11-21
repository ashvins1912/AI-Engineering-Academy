"""MCP reliability primitives: redacted traces, metrics, retry policy and circuit breaker."""
import hashlib,json
SECRET_PARTS=("authorization","token","secret","password","cookie","verifier","auth_code","access_key")

def redact(value):
 if isinstance(value,dict):
  out={}
  for key,item in value.items():
   lower=key.lower().replace("-","_")
   out[key]="[REDACTED]" if any(part in lower for part in SECRET_PARTS) else redact(item)
  return out
 if isinstance(value,list):return [redact(x) for x in value]
 return value

def tenant_fingerprint(tenant_id):
 return hashlib.sha256(tenant_id.encode()).hexdigest()[:12]

def make_trace_event(*,trace_id,request_id,method,tenant_id,tool_name=None,status,latency_ms,attributes=None):
 return redact({"trace_id":trace_id,"request_id":request_id,"method":method,"tenant_fingerprint":tenant_fingerprint(tenant_id),"tool_name":tool_name,"status":status,"latency_ms":latency_ms,"attributes":attributes or {}})

class MCPMetrics:
 def __init__(self):self.samples={}
 def record(self,method,status,latency_ms):
  row=self.samples.setdefault(method,{"count":0,"errors":0,"latencies":[]})
  row["count"]+=1;row["errors"]+=int(status>=400);row["latencies"].append(latency_ms)
 def summary(self,method):
  row=self.samples.get(method,{"count":0,"errors":0,"latencies":[]});values=sorted(row["latencies"])
  def percentile(p):
   if not values:return 0
   return values[min(len(values)-1,max(0,int((len(values)-1)*p)))]
  return {"count":row["count"],"errors":row["errors"],"p50_ms":percentile(.5),"p95_ms":percentile(.95)}

RETRYABLE={429,502,503,504}
def retry_delay(status,attempt,*,idempotent,idempotency_key=None,retry_after=None,max_retries=3,base_delay=.25,max_delay=4.0):
 if status not in RETRYABLE or attempt>=max_retries or not(idempotent or idempotency_key):return None
 exponential=min(max_delay,base_delay*(2**attempt))
 return min(max_delay,max(0,retry_after)) if retry_after is not None else exponential

class CircuitOpen(Exception):pass
class CircuitBreaker:
 def __init__(self,threshold=3,reset_after=30):
  self.threshold=threshold;self.reset_after=reset_after;self.failures=0;self.state="CLOSED";self.opened_at=None;self.probe_in_flight=False
 def before_request(self,now):
  if self.state=="OPEN":
   if now-self.opened_at<self.reset_after:raise CircuitOpen("circuit is open")
   self.state="HALF_OPEN";self.probe_in_flight=False
  if self.state=="HALF_OPEN":
   if self.probe_in_flight:raise CircuitOpen("half-open probe already in flight")
   self.probe_in_flight=True
 def success(self):
  self.failures=0;self.state="CLOSED";self.opened_at=None;self.probe_in_flight=False
 def failure(self,now):
  self.failures+=1;self.probe_in_flight=False
  if self.failures>=self.threshold:self.state="OPEN";self.opened_at=now
