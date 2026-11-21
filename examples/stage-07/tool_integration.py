"""A deterministic, framework-neutral tool gateway and resilience primitives."""
from dataclasses import dataclass
import hashlib
import json

class ToolError(Exception): pass
class ValidationError(ToolError): pass
class AuthorizationError(ToolError): pass
class RateLimitError(ToolError): pass
class CircuitOpenError(ToolError): pass
class IdempotencyConflict(ToolError): pass
class OperationPending(ToolError): pass

@dataclass(frozen=True)
class AuthContext:
    tenant_id: str
    user_id: str
    scopes: frozenset

@dataclass(frozen=True)
class ToolSpec:
    name: str
    required: tuple
    properties: dict
    required_scope: str
    side_effect: bool = False
    idempotent: bool = True
    result_required: tuple = ()

def validate_arguments(spec, arguments):
    if not isinstance(arguments, dict):
        raise ValidationError("arguments must be an object")
    unknown = set(arguments) - set(spec.properties)
    missing = set(spec.required) - set(arguments)
    if unknown or missing:
        raise ValidationError(f"unknown={sorted(unknown)} missing={sorted(missing)}")
    for key, expected_type in spec.properties.items():
        if key in arguments and type(arguments[key]) is not expected_type:
            raise ValidationError(f"{key} must be {expected_type.__name__}")
    return dict(arguments)

def validate_result(spec, result):
    if not isinstance(result, dict) or any(key not in result for key in spec.result_required):
        raise ValidationError("provider response does not match result contract")
    return result

class TokenBucket:
    def __init__(self, capacity, refill_per_second, clock):
        self.capacity = capacity
        self.refill = refill_per_second
        self.clock = clock
        self.tokens = float(capacity)
        self.updated = clock()
    def consume(self, amount=1):
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + max(0, now - self.updated) * self.refill)
        self.updated = now
        if self.tokens < amount:
            raise RateLimitError("tenant rate limit exceeded")
        self.tokens -= amount
        return self.tokens

class CircuitBreaker:
    def __init__(self, threshold=3, recovery_seconds=10, clock=lambda: 0):
        self.threshold = threshold
        self.recovery = recovery_seconds
        self.clock = clock
        self.state = "CLOSED"
        self.failures = 0
        self.opened_at = None
        self.probe_in_flight = False
    def allow(self):
        if self.state == "OPEN" and self.clock() - self.opened_at >= self.recovery:
            self.state = "HALF_OPEN"
        if self.state == "OPEN":
            raise CircuitOpenError("circuit is open")
        if self.state == "HALF_OPEN":
            if self.probe_in_flight:
                raise CircuitOpenError("half-open probe already in flight")
            self.probe_in_flight = True
    def success(self):
        self.failures = 0
        self.state = "CLOSED"
        self.opened_at = None
        self.probe_in_flight = False
    def failure(self):
        self.probe_in_flight = False
        self.failures += 1
        if self.state == "HALF_OPEN" or self.failures >= self.threshold:
            self.state = "OPEN"
            self.opened_at = self.clock()

def retry_call(operation, retryable, max_attempts=3, base_delay=0.2,
               sleep=lambda _: None, jitter=lambda delay: delay,
               idempotent=True, has_idempotency_key=False):
    if max_attempts < 1:
        raise ValueError("max_attempts must be positive")
    safe = idempotent or has_idempotency_key
    for attempt in range(1, max_attempts + 1):
        try:
            return operation(attempt)
        except Exception as exc:
            if not safe or not retryable(exc) or attempt >= max_attempts:
                raise
            sleep(jitter(base_delay * (2 ** (attempt - 1))))
    raise AssertionError("unreachable")

def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",",":"), ensure_ascii=False).encode()).hexdigest()

def redact(value):
    secret_keys = {"authorization","token","access_token","password","secret","api_key"}
    if isinstance(value, dict):
        return {k: ("[REDACTED]" if k.lower() in secret_keys else redact(v)) for k,v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value

class ToolGateway:
    def __init__(self, specs, handlers, clock=lambda:0, max_in_flight=4):
        self.specs = {s.name:s for s in specs}
        self.handlers = handlers
        self.clock = clock
        self.buckets = {}
        self.breakers = {}
        self.max_in_flight = max_in_flight
        self.in_flight = 0
        self.operations = {}
        self.trace = []
    def execute(self, name, arguments, auth, idempotency_key=None):
        if name not in self.specs or name not in self.handlers:
            raise ValidationError("tool is not registered")
        spec = self.specs[name]
        args = validate_arguments(spec, arguments)
        if not auth or not auth.tenant_id or spec.required_scope not in auth.scopes:
            raise AuthorizationError("required scope is missing")
        if args.get("tenant_id", auth.tenant_id) != auth.tenant_id:
            raise AuthorizationError("tenant scope mismatch")
        if spec.side_effect and not spec.idempotent and not idempotency_key:
            raise IdempotencyConflict("non-idempotent write requires an idempotency key")
        bucket = self.buckets.setdefault(auth.tenant_id, TokenBucket(10,2,self.clock))
        bucket.consume()
        if self.in_flight >= self.max_in_flight:
            raise RateLimitError("bulkhead is full")
        key = (auth.tenant_id, name, idempotency_key) if idempotency_key else None
        payload_hash = fingerprint(args)
        if key:
            prior = self.operations.get(key)
            if prior:
                if prior["payload_hash"] != payload_hash:
                    raise IdempotencyConflict("same key with different payload")
                if prior["status"] == "succeeded":
                    self.trace.append({"event":"idempotency_replay","tool":name,"tenant":auth.tenant_id})
                    return prior["result"]
                raise OperationPending("operation is pending reconciliation")
            self.operations[key] = {"payload_hash":payload_hash,"status":"pending","result":None}
        breaker = self.breakers.setdefault(name, CircuitBreaker(clock=self.clock))
        breaker.allow()
        self.in_flight += 1
        try:
            result = retry_call(
                lambda attempt:self.handlers[name](args, idempotency_key),
                retryable=lambda exc:getattr(exc,"status",0) in {429,500,502,503,504},
                max_attempts=3, idempotent=spec.idempotent,
                has_idempotency_key=bool(idempotency_key),
            )
            result = validate_result(spec,result)
            breaker.success()
            if key:
                self.operations[key].update(status="succeeded",result=result)
            self.trace.append({"event":"tool_succeeded","tool":name,"tenant":auth.tenant_id,"attempts":1})
            return result
        except TimeoutError:
            if key:
                self.operations[key]["status"]="unknown"
            breaker.failure()
            raise
        except Exception:
            breaker.failure()
            if key and self.operations[key]["status"] == "pending":
                self.operations[key]["status"]="failed"
            raise
        finally:
            self.in_flight -= 1

def demo():
    spec=ToolSpec("order_lookup",("order_id",),{"order_id":str,"tenant_id":str},"orders:read",False,True,("order_id","status"))
    auth=AuthContext("tenant-a","user-1",frozenset({"orders:read"}))
    gateway=ToolGateway([spec],{"order_lookup":lambda args,key:{"order_id":args["order_id"],"status":"shipped"}})
    print(gateway.execute("order_lookup",{"order_id":"ORD-7","tenant_id":"tenant-a"},auth))
if __name__=="__main__":demo()
