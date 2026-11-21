import importlib.util
from pathlib import Path
import unittest

MODULE_PATH = Path(__file__).parent / "tool-security" / "policy_engine.py"
spec = importlib.util.spec_from_file_location("tool_security_policy_engine", MODULE_PATH)
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)

class ToolSecurityTests(unittest.TestCase):
    def setUp(self):
        self.user = policy.Principal("user-17", "tenant-A", frozenset({"reports:read", "reports:write", "sandbox:execute"}))
        self.report_a = policy.Resource("report-A", "user-17", "tenant-A")
        self.report_b = policy.Resource("report-B", "user-22", "tenant-A")
        self.read = policy.Request("report.read", "read", "report-A", {"resource_id":"report-A"})

    def test_owner_read_allowed(self):
        self.assertTrue(policy.authorize(self.user, self.read, self.report_a).allowed)

    def test_other_owner_write_denied(self):
        req = policy.Request("report.write","write","report-B",{"resource_id":"report-B","content":"x"})
        self.assertEqual(policy.authorize(self.user,req,self.report_b,approved=True).reason,"RESOURCE_NOT_OWNED")

    def test_missing_identity_fails_closed(self):
        self.assertEqual(policy.authorize(None,self.read,self.report_a).reason,"MISSING_IDENTITY_OR_RESOURCE")

    def test_unknown_tool_denied(self):
        req = policy.Request("shell.root","execute","report-A",{"resource_id":"report-A"})
        self.assertEqual(policy.authorize(self.user,req,self.report_a).reason,"UNKNOWN_TOOL_OR_ACTION")

    def test_unknown_argument_denied(self):
        req = policy.Request("report.read","read","report-A",{"resource_id":"report-A","admin":True})
        self.assertEqual(policy.authorize(self.user,req,self.report_a).reason,"ARGUMENT_SCHEMA_MISMATCH")

    def test_resource_argument_mismatch_denied(self):
        req = policy.Request("report.read","read","report-A",{"resource_id":"report-B"})
        self.assertEqual(policy.authorize(self.user,req,self.report_a).reason,"RESOURCE_ARGUMENT_MISMATCH")

    def test_missing_scope_denied(self):
        principal = policy.Principal("user-17","tenant-A",frozenset())
        self.assertEqual(policy.authorize(principal,self.read,self.report_a).reason,"MISSING_SCOPE")

    def test_tenant_mismatch_denied(self):
        other = policy.Resource("report-A","user-17","tenant-B")
        self.assertEqual(policy.authorize(self.user,self.read,other).reason,"TENANT_MISMATCH")

    def test_write_requires_approval(self):
        req = policy.Request("report.write","write","report-A",{"resource_id":"report-A","content":"x"})
        self.assertEqual(policy.authorize(self.user,req,self.report_a).reason,"APPROVAL_REQUIRED")

    def test_expired_capability_denied(self):
        self.assertEqual(policy.authorize(self.user,self.read,self.report_a,capability_expiry_seconds=0).reason,"CAPABILITY_EXPIRED")

    def test_budget_exhaustion_denied(self):
        self.assertEqual(policy.authorize(self.user,self.read,self.report_a,budget_remaining=0).reason,"BUDGET_EXHAUSTED")

    def test_denied_request_never_calls_adapter(self):
        calls=[]
        req=policy.Request("report.write","write","report-B",{"resource_id":"report-B","content":"x"})
        result,value=policy.enforce(self.user,req,self.report_b,lambda r:calls.append(r),approved=True)
        self.assertFalse(result.allowed); self.assertIsNone(value); self.assertEqual(calls,[])

    def test_path_traversal_denied(self):
        self.assertFalse(policy.safe_workspace_path("/workspace","../secrets.txt"))
        self.assertFalse(policy.safe_workspace_path("/workspace","/etc/passwd"))

    def test_workspace_relative_path_allowed(self):
        self.assertTrue(policy.safe_workspace_path("/workspace","reports/out.txt"))

    def test_ssrf_private_and_metadata_denied(self):
        self.assertFalse(policy.network_target_allowed("approved.example",["127.0.0.1"],{"approved.example"}))
        self.assertFalse(policy.network_target_allowed("metadata.google.internal",["8.8.8.8"],{"metadata.google.internal"}))

    def test_public_allowlisted_target_allowed(self):
        self.assertTrue(policy.network_target_allowed("approved.example",["8.8.8.8"],{"approved.example"}))

    def test_idempotency_replay_does_not_repeat(self):
        ledger=policy.IdempotencyLedger(); calls=[]
        first,created=ledger.apply_once("op-1","digest",lambda:calls.append("write") or "ok")
        second,reused=ledger.apply_once("op-1","digest",lambda:calls.append("write") or "duplicate")
        self.assertEqual((first,created),("ok",True)); self.assertEqual((second,reused),("ok",False)); self.assertEqual(calls,["write"])

    def test_idempotency_payload_tampering_denied(self):
        ledger=policy.IdempotencyLedger()
        ledger.apply_once("op-1","digest-a",lambda:"ok")
        with self.assertRaisesRegex(ValueError,"IDEMPOTENCY_PAYLOAD_MISMATCH"):
            ledger.apply_once("op-1","digest-b",lambda:"bad")

    def test_sandbox_budget_enforced(self):
        self.assertTrue(policy.sandbox_budget_ok(cpu_seconds=1,memory_mb=64,wall_seconds=3,process_count=2))
        self.assertFalse(policy.sandbox_budget_ok(cpu_seconds=9,memory_mb=64,wall_seconds=3,process_count=2))

if __name__ == "__main__":
    unittest.main()
