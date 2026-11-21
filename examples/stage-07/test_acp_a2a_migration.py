import unittest
from acp_a2a_migration import translate_legacy_run,translate_legacy_event,compare_parity,canary_decision,LEGACY_PROTOCOL

class MigrationMappingTests(unittest.TestCase):
 def request(self):
  return {"protocol":LEGACY_PROTOCOL,"tenant_id":"tenant-a","session_id":"ses-9","run_id":"run-42","mode":"async","message":{"parts":[{"kind":"text","text":"review order"}]}}
 def test_maps_session_run_and_stable_idempotency(self):
  req=self.request()
  one=translate_legacy_run(req,"tenant-a")
  two=translate_legacy_run(req,"tenant-a")
  self.assertEqual(one.request["contextId"],"ses-9")
  self.assertEqual(one.request["legacyRunId"],"run-42")
  self.assertEqual(one.idempotency_key,two.idempotency_key)
  self.assertEqual(one.request["executionMode"],"task")
 def test_sync_mode_maps_to_blocking(self):
  req=self.request();req["mode"]="sync"
  self.assertEqual(translate_legacy_run(req,"tenant-a").request["executionMode"],"blocking")
 def test_untrusted_tenant_claim_rejected(self):
  with self.assertRaises(PermissionError):translate_legacy_run(self.request(),"tenant-b")
 def test_unknown_fields_and_unsupported_parts_rejected(self):
  req=self.request();req["admin"]=True
  with self.assertRaises(ValueError):translate_legacy_run(req,"tenant-a")
  req=self.request();req["message"]["parts"]=[{"kind":"shell","text":"no"}]
  with self.assertRaises(ValueError):translate_legacy_run(req,"tenant-a")
 def test_unmapped_event_rejected_and_status_order_preserved(self):
  first=translate_legacy_event({"type":"accepted"},"task-1",1)
  second=translate_legacy_event({"type":"working"},"task-1",2)
  self.assertEqual(first["sequence"],1);self.assertEqual(second["sequence"],2)
  with self.assertRaises(ValueError):translate_legacy_event({"type":"mystery"},"task-1",3)
 def test_parity_and_security_are_separate(self):
  old={"business_outcome":"eligible","artifact_hash":"abc","approval_required":True}
  new={**old,"cross_tenant_accesses":1}
  result=compare_parity(old,new)
  self.assertTrue(result["parity"]);self.assertFalse(result["security_pass"])
 def test_canary_hard_gates(self):
  self.assertTrue(canary_decision(99.6,0,0)["eligible"])
  self.assertFalse(canary_decision(99.9,1,0)["eligible"])
  self.assertFalse(canary_decision(99.9,0,1)["eligible"])
  self.assertFalse(canary_decision(98.0,0,0)["eligible"])
if __name__=="__main__":unittest.main()
