import os,tempfile,unittest
from event_driven_production import EventStore,EventGap,EventConflict

def event(event_id="evt-1",tenant="tenant-a",aggregate="ORD-7",version=1):
 return {"event_id":event_id,"event_type":"order.paid","tenant_id":tenant,"aggregate_id":aggregate,"aggregate_version":version,"schema_version":1,"occurred_at":"2026-11-21T09:00:00+05:30","source":"orders","payload":{"amount":100}}

class EventStoreTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"events.db")
  self.store=EventStore(self.path,clock=lambda:100.0)
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_business_state_and_outbox_commit_together(self):
  self.store.commit_business_event("tenant-a","ORD-7",0,{"status":"paid"},event())
  self.assertEqual(len(self.store.pending_outbox()),1)
  self.assertEqual(self.store.mark_published("tenant-a","evt-1"),True)
  self.assertEqual(self.store.pending_outbox(),[])
 def test_aggregate_version_conflict_does_not_write_outbox(self):
  self.store.commit_business_event("tenant-a","ORD-7",0,{"status":"paid"},event())
  with self.assertRaises(EventConflict):self.store.commit_business_event("tenant-a","ORD-7",0,{"status":"shipped"},event("evt-2",version=1))
  self.assertEqual(len(self.store.pending_outbox()),1)
 def test_consumer_inbox_and_projection_are_atomic_and_deduplicated(self):
  first=self.store.consume_once("fulfillment",event(),{"status":"ready"})
  duplicate=self.store.consume_once("fulfillment",event(),{"status":"ready"})
  self.assertEqual(first["status"],"processed");self.assertEqual(duplicate["status"],"duplicate")
  self.assertEqual(self.store.projection("fulfillment","tenant-a","ORD-7")["state"],{"status":"ready"})
 def test_out_of_order_version_rejected_without_inbox_record(self):
  with self.assertRaises(EventGap):self.store.consume_once("fulfillment",event("evt-2",version=2),{"status":"shipped"})
  self.store.consume_once("fulfillment",event("evt-1",version=1),{"status":"paid"})
  self.store.consume_once("fulfillment",event("evt-2",version=2),{"status":"shipped"})
  self.assertEqual(self.store.projection("fulfillment","tenant-a","ORD-7")["version"],2)
 def test_tenant_isolation(self):
  self.store.consume_once("fulfillment",event(),{"status":"paid"})
  self.assertIsNone(self.store.projection("fulfillment","tenant-b","ORD-7"))
 def test_dead_letter_after_max_attempts(self):
  self.assertEqual(self.store.record_failure("fulfillment",event(),"bad payload",2)["status"],"retry")
  self.assertEqual(self.store.record_failure("fulfillment",event(),"bad payload",2)["status"],"dead_letter")
  self.assertEqual(len(self.store.dead_letters("fulfillment","tenant-a")),1)
 def test_reopen_persists_outbox_inbox_and_projection(self):
  self.store.commit_business_event("tenant-a","ORD-7",0,{"status":"paid"},event())
  self.store.consume_once("fulfillment",event(),{"status":"ready"})
  self.store.close();self.store=EventStore(self.path,clock=lambda:101.0)
  self.assertEqual(self.store.projection("fulfillment","tenant-a","ORD-7")["version"],1)
  self.assertEqual(len(self.store.pending_outbox()),1)
if __name__=="__main__":unittest.main()
