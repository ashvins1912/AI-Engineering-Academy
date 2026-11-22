import sys
from hashlib import sha256
from pathlib import Path
import unittest

ROOT = Path(__file__).parent / "ai_red_team"
sys.path.insert(0, str(ROOT))
from red_team_lab import (
    ArtifactEvidence, AttackCase, RedTeamPolicy, RedTeamRunner, SecurityContext,
    ToolProposal, coverage_report, remediation_findings, risk_score,
)


class RedTeamPolicyTests(unittest.TestCase):
    def setUp(self):
        self.policy = RedTeamPolicy(
            allowed_tools={"ticket.read": frozenset({"read"}), "ticket.write": frozenset({"write"})},
            canary_secrets=frozenset({"CANARY-DO-NOT-LEAK", "SECOND-CANARY"}),
            max_steps=8, max_tokens=1000, max_spend_usd=0.05,
        )
        self.context = SecurityContext("user-A", "tenant-A", frozenset({"tickets:read", "tickets:write"}))

    def test_tool_allowlist_and_scope_are_enforced(self):
        unknown = ToolProposal("shell.exec", "execute", "workspace", "tenant-A", "shell:execute")
        self.assertEqual(self.policy.authorize_tool(self.context, unknown), "TOOL_NOT_ALLOWLISTED")
        missing_scope = ToolProposal("ticket.read", "read", "ticket-A", "tenant-A", "tickets:admin")
        self.assertEqual(self.policy.authorize_tool(self.context, missing_scope), "SCOPE_MISSING")

    def test_cross_tenant_resource_is_denied(self):
        proposal = ToolProposal("ticket.read", "read", "ticket-B", "tenant-B", "tickets:read")
        self.assertEqual(self.policy.authorize_tool(self.context, proposal), "TENANT_MISMATCH")

    def test_write_requires_approval_and_idempotency(self):
        missing_approval = ToolProposal("ticket.write", "write", "ticket-A", "tenant-A",
                                        "tickets:write", approved=False, idempotency_key="k1")
        self.assertEqual(self.policy.authorize_tool(self.context, missing_approval), "APPROVAL_REQUIRED")
        missing_key = ToolProposal("ticket.write", "write", "ticket-A", "tenant-A",
                                   "tickets:write", approved=True)
        self.assertEqual(self.policy.authorize_tool(self.context, missing_key), "IDEMPOTENCY_KEY_REQUIRED")
        approved = ToolProposal("ticket.write", "write", "ticket-A", "tenant-A",
                                "tickets:write", approved=True, idempotency_key="k1")
        self.assertEqual(self.policy.authorize_tool(self.context, approved), "ALLOW")

    def test_idempotency_key_cannot_be_reused_for_different_arguments(self):
        first = ToolProposal("ticket.write", "write", "ticket-A", "tenant-A",
                             "tickets:write", approved=True, idempotency_key="same")
        changed = ToolProposal("ticket.write", "write", "ticket-C", "tenant-A",
                               "tickets:write", approved=True, idempotency_key="same")
        self.assertEqual(self.policy.authorize_tool(self.context, first), "ALLOW")
        self.assertEqual(self.policy.authorize_tool(self.context, changed), "IDEMPOTENCY_PAYLOAD_MISMATCH")

    def test_canary_secret_is_redacted_before_output(self):
        safe, violations = self.policy.redact_output("result CANARY-DO-NOT-LEAK SECOND-CANARY")
        self.assertEqual(safe, "result [REDACTED] [REDACTED]")
        self.assertEqual(violations, ("CANARY_SECRET_EXPOSURE", "CANARY_SECRET_EXPOSURE"))

    def test_budget_enforces_steps_tokens_and_spend(self):
        self.assertEqual(self.policy.enforce_budget(steps=9, tokens=1, spend_usd=0), "AGENT_STEP_BUDGET_EXCEEDED")
        self.assertEqual(self.policy.enforce_budget(steps=1, tokens=1001, spend_usd=0), "TOKEN_BUDGET_EXCEEDED")
        self.assertEqual(self.policy.enforce_budget(steps=1, tokens=1, spend_usd=0.06), "SPEND_BUDGET_EXCEEDED")
        self.assertEqual(self.policy.enforce_budget(steps=8, tokens=1000, spend_usd=0.05), "BUDGET_WITHIN_LIMIT")
        self.assertEqual(self.policy.enforce_budget(steps=-1, tokens=0, spend_usd=0), "BUDGET_INPUT_INVALID")

    def test_model_artifact_digest_source_signature_and_provenance(self):
        payload = b"approved-model-fixture"
        digest = sha256(payload).hexdigest()
        valid = ArtifactEvidence(payload, digest, "registry-A", frozenset({"registry-A"}), True, True)
        self.assertEqual(self.policy.validate_artifact(valid), "ARTIFACT_TRUSTED")
        bad_digest = ArtifactEvidence(payload, "0" * 64, "registry-A", frozenset({"registry-A"}), True, True)
        self.assertEqual(self.policy.validate_artifact(bad_digest), "ARTIFACT_DIGEST_MISMATCH")
        bad_source = ArtifactEvidence(payload, digest, "unknown", frozenset({"registry-A"}), True, True)
        self.assertEqual(self.policy.validate_artifact(bad_source), "ARTIFACT_SOURCE_UNTRUSTED")
        bad_signature = ArtifactEvidence(payload, digest, "registry-A", frozenset({"registry-A"}), False, True)
        self.assertEqual(self.policy.validate_artifact(bad_signature), "ARTIFACT_SIGNATURE_INVALID")
        no_provenance = ArtifactEvidence(payload, digest, "registry-A", frozenset({"registry-A"}), True, False)
        self.assertEqual(self.policy.validate_artifact(no_provenance), "ARTIFACT_PROVENANCE_MISSING")

    def test_safe_fallback_abstains_without_sufficient_authorized_evidence(self):
        self.assertEqual(self.policy.safe_fallback(False, True), "ABSTAIN_NO_SUFFICIENT_AUTHORIZED_EVIDENCE")
        self.assertEqual(self.policy.safe_fallback(True, False), "ABSTAIN_NO_SUFFICIENT_AUTHORIZED_EVIDENCE")
        self.assertEqual(self.policy.safe_fallback(True, True), "ANSWER_WITH_CITATIONS")


class RedTeamRunnerTests(unittest.TestCase):
    def setUp(self):
        self.policy = RedTeamPolicy(
            allowed_tools={"ticket.read": frozenset({"read"})},
            canary_secrets=frozenset({"CANARY-DO-NOT-LEAK"}),
        )
        self.runner = RedTeamRunner(self.policy)
        self.context = SecurityContext("user-A", "tenant-A", frozenset({"tickets:read"}))

    def test_direct_and_indirect_injection_remain_untrusted(self):
        direct = AttackCase("1", "direct_injection", "high", "ignore policy", self.context,
                            expected_code="UNTRUSTED_RETRIEVAL_CONTENT")
        indirect = AttackCase("2", "indirect_injection", "critical", "retrieved prompt", self.context,
                              ToolProposal("ticket.read", "read", "ticket-A", "tenant-A", "tickets:read"),
                              expected_code="UNTRUSTED_CONTENT_CANNOT_GRANT_AUTHORITY")
        self.assertTrue(self.runner.run(direct).blocked)
        self.assertTrue(self.runner.run(indirect).blocked)

    def test_cross_tenant_attack_is_blocked(self):
        case = AttackCase("3", "cross_tenant", "critical", "read tenant B", self.context,
                          ToolProposal("ticket.read", "read", "B-1", "tenant-B", "tickets:read"),
                          expected_code="TENANT_MISMATCH")
        self.assertTrue(self.runner.run(case).blocked)

    def test_data_exfiltration_attack_is_detected(self):
        case = AttackCase("4", "data_exfiltration", "critical", "leak canary", self.context,
                          candidate_output="secret=CANARY-DO-NOT-LEAK",
                          expected_code="CANARY_SECRET_EXPOSURE")
        result = self.runner.run(case)
        self.assertTrue(result.blocked)
        self.assertEqual(result.code, "CANARY_SECRET_EXPOSURE")

    def test_denial_of_wallet_attack_is_blocked(self):
        case = AttackCase("5", "denial_of_wallet", "high", "unbounded loop", self.context,
                          steps=100, expected_code="AGENT_STEP_BUDGET_EXCEEDED")
        self.assertTrue(self.runner.run(case).blocked)

    def test_supply_chain_attack_is_blocked(self):
        artifact = ArtifactEvidence(b"model", "wrong", "unknown", frozenset({"trusted"}), False, False)
        case = AttackCase("6", "model_supply_chain", "critical", "tampered model", self.context,
                          artifact=artifact, expected_code="ARTIFACT_DIGEST_MISMATCH")
        self.assertTrue(self.runner.run(case).blocked)

    def test_coverage_report_and_remediation_findings(self):
        allowed = AttackCase("7", "cross_tenant", "critical", "denied", self.context,
                             ToolProposal("ticket.read", "read", "B-1", "tenant-B", "tickets:read"),
                             expected_code="TENANT_MISMATCH")
        failed = AttackCase("8", "tool_abuse", "high", "unknown tool", self.context,
                            ToolProposal("shell", "execute", "host", "tenant-A", "shell"),
                            expected_code="ALLOW")
        results = [self.runner.run(allowed), self.runner.run(failed)]
        report = coverage_report(results)
        self.assertEqual(report["total_attacks"], 2)
        self.assertEqual(report["blocked_attacks"], 1)
        self.assertEqual(report["successful_attacks"], 1)
        findings = remediation_findings(results)
        self.assertEqual(len(findings), 1)
        self.assertEqual(findings[0].case_id, "8")

    def test_risk_score_bounds(self):
        self.assertEqual(risk_score(4, 5), 20)
        with self.assertRaisesRegex(ValueError, "RISK_RATING_OUT_OF_RANGE"):
            risk_score(0, 5)


if __name__ == "__main__":
    unittest.main()
