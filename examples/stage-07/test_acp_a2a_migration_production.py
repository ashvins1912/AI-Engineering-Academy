import os,tempfile,unittest
from acp_a2a_migration_production import MigrationLedger

class MigrationLedgerTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"migration.db")
  self.store=MigrationLedger(self.path,clock=lambda:100.0)
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_idempotent_mapping_and_conflict(self):
  args=("tenant-a","run-1","session-1","task-1","map-v1",{"order":"ORD-7"})
  self.assertFalse(self.store.map_run(*args)["duplicate"])
  self.assertTrue(self.store.map_run(*args)["duplicate"])
  with self.assertRaises(ValueError):self.store.map_run("tenant-a","run-1","session-1","task-2","map-v1",{"order":"ORD-7"})
 def test_mapping_is_tenant_scoped(self):
  self.store.map_run("tenant-a","run-1","session-1","task-a","v1",{})
  self.store.map_run("tenant-b","run-1","session-1","task-b","v1",{})
 def test_canary_requires_parity_and_zero_hard_failures(self):
  good=self.store.record_evaluation("eval-1","map-v1",{"cases":10},99.6,0,0,5)
  self.assertEqual(good["status"],"canary_eligible")
  bad=self.store.record_evaluation("eval-2","map-v1",{"cases":10},99.9,1,0,5)
  self.assertEqual(bad["status"],"blocked");self.assertEqual(bad["canary_percent"],0)
  duplicate=self.store.record_evaluation("eval-3","map-v1",{"cases":10},100,0,1,5)
  self.assertEqual(duplicate["status"],"blocked")
 def test_rollback_is_durable(self):
  self.store.record_evaluation("eval-1","map-v1",{"cases":10},100,0,0,5)
  rolled=self.store.rollback("eval-1","parity regression after canary")
  self.assertEqual(rolled["status"],"rolled_back");self.assertEqual(rolled["canary_percent"],0)
 def test_unknown_rollback_rejected(self):
  with self.assertRaises(KeyError):self.store.rollback("missing","manual rollback")
 def test_reopen_preserves_evaluation(self):
  self.store.record_evaluation("eval-1","map-v1",{"cases":10},99.6,0,0,5)
  self.store.close();self.store=MigrationLedger(self.path,clock=lambda:101.0)
  self.assertEqual(self.store.get_evaluation("eval-1")["fixture_hash"],MigrationLedger.fingerprint({"cases":10}))
if __name__=="__main__":unittest.main()
