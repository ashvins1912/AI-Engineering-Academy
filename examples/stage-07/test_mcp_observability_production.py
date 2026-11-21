import os,tempfile,unittest
from mcp_observability_production import MCPIdempotencyLedger,IdempotencyConflict
class IdempotencyLedgerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.store=MCPIdempotencyLedger(os.path.join(self.tmp.name,"ops.db"),clock=lambda:123)
  self.payload={"order_id":"ORD-7","amount":1200}
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_reserve_complete_and_replay_cached(self):
  self.assertEqual(self.store.begin("tenant-a","refund","key-1",self.payload)["state"],"RESERVED")
  self.store.complete("tenant-a","refund","key-1",self.payload,{"refund_id":"r1"})
  self.assertEqual(self.store.begin("tenant-a","refund","key-1",self.payload),{"state":"COMPLETED","result":{"refund_id":"r1"}})
 def test_key_payload_mismatch_rejected(self):
  self.store.begin("tenant-a","refund","key-1",self.payload)
  with self.assertRaises(IdempotencyConflict):self.store.begin("tenant-a","refund","key-1",{**self.payload,"amount":9999})
 def test_pending_operation_not_reexecuted(self):
  self.store.begin("tenant-a","refund","key-1",self.payload)
  self.assertEqual(self.store.begin("tenant-a","refund","key-1",self.payload)["state"],"IN_PROGRESS")
 def test_crash_reconciliation_by_provider_key(self):
  self.store.begin("tenant-a","refund","key-1",self.payload)
  result=self.store.reconcile("tenant-a","refund","key-1",self.payload,lambda key:{"refund_id":"r1"})
  self.assertEqual(result["state"],"COMPLETED")
  self.assertEqual(self.store.begin("tenant-a","refund","key-1",self.payload)["result"],{"refund_id":"r1"})
 def test_missing_provider_result_remains_pending(self):
  self.store.begin("tenant-a","refund","key-1",self.payload)
  self.assertEqual(self.store.reconcile("tenant-a","refund","key-1",self.payload,lambda key:None)["state"],"IN_PROGRESS")
if __name__=="__main__":unittest.main()
