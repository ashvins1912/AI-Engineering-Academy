import unittest
from event_driven import *

class EventDrivenTests(unittest.TestCase):
 def event(self,event_id="evt-1",version=1,tenant="tenant-a",aggregate="ORD-7",event_type="order.paid"):
  return EventEnvelope(event_id,event_type,tenant,aggregate,version,1,"2026-11-21T09:00:00+05:30","orders",{"amount":100})
 def test_envelope_requires_identity_and_timezone(self):
  self.event().validate()
  with self.assertRaises(EventValidationError):EventEnvelope("","","","",0,0,"2026-11-21","",{}).validate()
 def test_router_dispatches_registered_event_only(self):
  router=EventRouter();router.register("order.paid",lambda e:{"ok":True})
  self.assertTrue(router.dispatch(self.event())["ok"])
  with self.assertRaises(EventValidationError):router.dispatch(self.event(event_type="order.unknown"))
 def test_duplicate_delivery_creates_one_logical_effect(self):
  broker=InMemoryBroker();event=self.event();broker.publish(event);broker.publish(event)
  effects=[];consumer=EventConsumer("fulfillment",lambda e:effects.append(e.event_id) or {"done":True})
  first=consumer.process(broker.receive(),broker);second=consumer.process(broker.receive(),broker)
  self.assertEqual(first["status"],"processed");self.assertEqual(second["status"],"duplicate")
  self.assertEqual(effects,["evt-1"])
 def test_out_of_order_event_retries_until_predecessor_arrives(self):
  broker=InMemoryBroker();consumer=EventConsumer("projection",lambda e:{"v":e.aggregate_version})
  broker.publish(self.event("evt-2",2))
  first=consumer.process(broker.receive(),broker);self.assertEqual(first["status"],"retry")
  broker.publish(self.event("evt-1",1))
  second=consumer.process(broker.receive(),broker);self.assertEqual(second["status"],"processed")
  third=consumer.process(broker.receive(),broker);self.assertEqual(third["status"],"processed")
 def test_poison_event_moves_to_dlq_after_bounded_attempts(self):
  broker=InMemoryBroker();broker.publish(self.event())
  consumer=EventConsumer("bad-consumer",lambda e:(_ for _ in ()).throw(ValueError("poison")),max_attempts=2)
  self.assertEqual(consumer.process(broker.receive(),broker)["status"],"retry")
  self.assertEqual(consumer.process(broker.receive(),broker)["status"],"dead_letter")
  self.assertEqual(len(consumer.dead_letters),1)
 def test_webhook_hmac_and_timestamp_window(self):
  body=b'{"event":"order.paid"}';signature=sign_webhook("secret",1000,body)
  self.assertTrue(verify_webhook_signature("secret","1000",body,signature,now=1010))
  self.assertFalse(verify_webhook_signature("secret","1000",body,signature,now=2000))
  self.assertFalse(verify_webhook_signature("wrong","1000",body,signature,now=1010))
 def test_schedule_key_normalizes_timezones_and_requires_zone(self):
  one=schedule_event_key("daily","2026-11-21T09:00:00+05:30")
  two=schedule_event_key("daily","2026-11-21T03:30:00+00:00")
  self.assertEqual(one,two)
  with self.assertRaises(ValueError):schedule_event_key("daily","2026-11-21T09:00:00")
 def test_schema_upcast_preserves_old_event_semantics(self):
  old={"schema_version":1,"payload":{"amount":10}}
  new=upcast_event(old)
  self.assertEqual(new["schema_version"],2);self.assertEqual(new["payload"]["currency"],"USD")
if __name__=="__main__":unittest.main()
