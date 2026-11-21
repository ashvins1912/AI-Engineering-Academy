import os,tempfile,unittest
from tool_integration_production import IdempotencyLedger,IdempotencyConflict

class IdempotencyLedgerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"ledger.db")
  self.store=IdempotencyLedger(self.path,clock=lambda:100.0)
 def tearDown(self):
  self.store.close();self.tmp.cleanup()
 def test_reserve_complete_and_replay_cached_result(self):
  first=self.store.reserve("tenant-a","refund","key-1",{"order":"ORD-7","amount":50})
  self.assertEqual(first["state"],"execute")
  self.store.complete("tenant-a","refund","key-1",{"status":"succeeded"},"provider-1")
  replay=self.store.reserve("tenant-a","refund","key-1",{"amount":50,"order":"ORD-7"})
  self.assertEqual(replay["state"],"replay")
  self.assertEqual(replay["result"],{"status":"succeeded"})
 def test_same_key_different_payload_conflicts(self):
  self.store.reserve("tenant-a","refund","key-1",{"amount":50})
  with self.assertRaises(IdempotencyConflict):self.store.reserve("tenant-a","refund","key-1",{"amount":60})
 def test_pending_or_unknown_is_reconciled_not_reexecuted(self):
  self.store.reserve("tenant-a","refund","key-1",{"amount":50})
  self.assertEqual(self.store.reserve("tenant-a","refund","key-1",{"amount":50})["state"],"reconcile")
  self.store.mark_unknown("tenant-a","refund","key-1")
  self.assertEqual(self.store.reserve("tenant-a","refund","key-1",{"amount":50})["state"],"reconcile")
 def test_unknown_operation_can_be_completed_after_provider_lookup(self):
  self.store.reserve("tenant-a","refund","key-1",{"amount":50})
  self.store.mark_unknown("tenant-a","refund","key-1")
  row=self.store.complete("tenant-a","refund","key-1",{"status":"succeeded"},"provider-1")
  self.assertEqual(row["status"],"succeeded")
 def test_tenant_and_tool_scope(self):
  self.store.reserve("tenant-a","refund","key-1",{"amount":50})
  self.store.reserve("tenant-b","refund","key-1",{"amount":50})
  self.store.reserve("tenant-a","order_lookup","key-1",{"amount":50})
  self.assertEqual(self.store.get("tenant-a","refund","key-1")["status"],"pending")
 def test_completed_result_is_immutable(self):
  self.store.reserve("tenant-a","refund","key-1",{"amount":50})
  self.store.complete("tenant-a","refund","key-1",{"status":"ok"},"p1")
  with self.assertRaises(IdempotencyConflict):self.store.complete("tenant-a","refund","key-1",{"status":"changed"},"p1")
 def test_reopen_persistence(self):
  self.store.reserve("tenant-a","refund","key-1",{"amount":50})
  self.store.complete("tenant-a","refund","key-1",{"status":"ok"},"p1")
  self.store.close();self.store=IdempotencyLedger(self.path,clock=lambda:101.0)
  self.assertEqual(self.store.reserve("tenant-a","refund","key-1",{"amount":50})["state"],"replay")
if __name__=="__main__":unittest.main()
