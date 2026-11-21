"""Deterministic event envelope, at-least-once consumer, webhook and schedule helpers."""
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import hashlib
import hmac
import json

class EventValidationError(Exception): pass
class EventGap(Exception): pass

@dataclass(frozen=True)
class EventEnvelope:
    event_id: str
    event_type: str
    tenant_id: str
    aggregate_id: str
    aggregate_version: int
    schema_version: int
    occurred_at: str
    source: str
    payload: dict
    trace_id: str = ""
    def validate(self):
        required=(self.event_id,self.event_type,self.tenant_id,self.aggregate_id,self.source,self.occurred_at)
        if not all(required):raise EventValidationError("required event identity fields are missing")
        if self.aggregate_version<1 or self.schema_version<1:raise EventValidationError("versions must be positive")
        if not isinstance(self.payload,dict):raise EventValidationError("event payload must be an object")
        try:
            parsed=datetime.fromisoformat(self.occurred_at.replace("Z","+00:00"))
            if parsed.tzinfo is None:raise ValueError()
        except ValueError as exc:raise EventValidationError("occurred_at must be timezone-aware ISO-8601") from exc
        return self
    def to_dict(self):
        self.validate()
        return asdict(self)

class EventRouter:
    def __init__(self):self.handlers={}
    def register(self,event_type,handler):
        if not event_type or event_type in self.handlers:raise ValueError("event type missing or already registered")
        self.handlers[event_type]=handler
    def dispatch(self,event):
        event.validate()
        if event.event_type not in self.handlers:raise EventValidationError("no handler registered for event type")
        return self.handlers[event.event_type](event)

class InMemoryBroker:
    def __init__(self):
        self.messages=[];self.attempts={};self._delivery=0
    def publish(self,event):
        event_dict=event.to_dict() if isinstance(event,EventEnvelope) else dict(event)
        self._delivery+=1
        message={"delivery_id":self._delivery,"event":event_dict,"acked":False}
        self.messages.append(message)
        return self._delivery
    def receive(self):
        return next((m for m in self.messages if not m["acked"]),None)
    def ack(self,delivery_id):
        for message in self.messages:
            if message["delivery_id"]==delivery_id:
                message["acked"]=True;return True
        return False
    def nack(self,delivery_id):
        self.attempts[delivery_id]=self.attempts.get(delivery_id,0)+1
        return self.attempts[delivery_id]

class EventConsumer:
    def __init__(self,consumer_name,handler,max_attempts=3):
        self.consumer=consumer_name;self.handler=handler;self.max_attempts=max_attempts
        self.inbox={};self.aggregate_versions={};self.dead_letters=[]
    def process(self,message,broker):
        delivery_id=message["delivery_id"]
        event=EventEnvelope(**message["event"]).validate()
        key=(self.consumer,event.tenant_id,event.event_id)
        if key in self.inbox:
            broker.ack(delivery_id)
            return {"status":"duplicate","result":self.inbox[key]}
        aggregate=(event.tenant_id,event.aggregate_id)
        current=self.aggregate_versions.get(aggregate,0)
        if event.aggregate_version>current+1:
            attempts=broker.nack(delivery_id)
            if attempts>=self.max_attempts:
                self.dead_letters.append({"event":event.to_dict(),"reason":"aggregate version gap","attempts":attempts})
                broker.ack(delivery_id)
                return {"status":"dead_letter","attempts":attempts}
            return {"status":"retry","expected_version":current+1,"received_version":event.aggregate_version}
        if event.aggregate_version<=current:
            self.inbox[key]={"stale":True,"aggregate_version":current}
            broker.ack(delivery_id)
            return {"status":"stale"}
        try:
            result=self.handler(event)
        except Exception as exc:
            attempts=broker.nack(delivery_id)
            if attempts>=self.max_attempts:
                self.dead_letters.append({"event":event.to_dict(),"reason":str(exc),"attempts":attempts})
                broker.ack(delivery_id)
                return {"status":"dead_letter","attempts":attempts}
            return {"status":"retry","attempts":attempts}
        self.inbox[key]=result
        self.aggregate_versions[aggregate]=event.aggregate_version
        broker.ack(delivery_id)
        return {"status":"processed","result":result}

def verify_webhook_signature(secret, timestamp, raw_body, signature, now, tolerance_seconds=300):
    try:sent=int(timestamp)
    except (TypeError,ValueError):return False
    if abs(now-sent)>tolerance_seconds:return False
    expected=hmac.new(secret.encode(),str(sent).encode()+b"."+raw_body,hashlib.sha256).hexdigest()
    supplied=signature.removeprefix("sha256=")
    return hmac.compare_digest(expected,supplied)

def sign_webhook(secret,timestamp,raw_body):
    return "sha256="+hmac.new(secret.encode(),str(int(timestamp)).encode()+b"."+raw_body,hashlib.sha256).hexdigest()

def schedule_event_key(schedule_id,scheduled_for):
    if not schedule_id:raise ValueError("schedule ID required")
    value=datetime.fromisoformat(scheduled_for.replace("Z","+00:00"))
    if value.tzinfo is None:raise ValueError("scheduled_for must be timezone-aware")
    canonical=value.astimezone(timezone.utc).isoformat(timespec="seconds")
    return f"{schedule_id}:{canonical}"

def upcast_event(event):
    result=dict(event)
    version=result.get("schema_version",1)
    if version==1:
        payload=dict(result.get("payload") or {})
        payload.setdefault("currency","USD")
        result["payload"]=payload
        result["schema_version"]=2
    elif version!=2:
        raise EventValidationError("unsupported event schema version")
    return result

def demo():
    event=EventEnvelope("evt-1","order.paid","tenant-a","ORD-7",1,1,"2026-11-21T09:00:00+05:30","orders",{"amount":12500})
    broker=InMemoryBroker();broker.publish(event);broker.publish(event)
    consumer=EventConsumer("fulfillment",lambda e:{"created":e.aggregate_id})
    while message:=broker.receive():
        print(consumer.process(message,broker))
if __name__=="__main__":demo()
