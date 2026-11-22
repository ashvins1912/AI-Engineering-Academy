import hashlib
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).parent / "enterprise_governance"
sys.path.insert(0, str(ROOT))
from governance_engine import (
    REQUIRED_APPROVAL_ROLES, REQUIRED_ARTIFACTS, Approval, AuditLedger,
    DataAsset, GovernanceArtifact, GovernanceDossier, LifecycleManager,
    ReleaseManifest, RiskItem, validate_dossier,
)


NOW = 1_800_000_000
DIGEST = hashlib.sha256(b"synthetic governance artifact").hexdigest()


def complete_dossier(**overrides):
    manifest = ReleaseManifest("release-12", "model-v3", "dataset-v4", "prompt-v2", "index-v5", DIGEST)
    artifacts = tuple(GovernanceArtifact(
        f"artifact-{kind}", kind, "v1", "owner", f"synthetic://{kind}", DIGEST, NOW - 10,
        bound_versions={"model": "model-v3", "dataset": "dataset-v4",
                        "prompt": "prompt-v2", "index": "index-v5"},
    ) for kind in sorted(REQUIRED_ARTIFACTS))
    approvals = tuple(Approval(
        f"approval-{kind}", kind, "v1", f"{kind}-reviewer", role,
        "approved", NOW + 1000, True,
    ) for kind, role in REQUIRED_APPROVAL_ROLES.items())
    data = dict(
        manifest=manifest, artifacts=artifacts, approvals=approvals, risks=(),
        data_assets=(), jurisdiction="jurisdiction-A",
        legal_review_reference="legal-review-001", high_risk_system=False,
    )
    data.update(overrides)
    return GovernanceDossier(**data)


class ReleaseEvidenceTests(unittest.TestCase):
    def test_complete_release_dossier_passes(self):
        result = validate_dossier(complete_dossier(), now=NOW)
        self.assertTrue(result.passed)
        self.assertEqual(result.reasons, ())
        self.assertGreaterEqual(result.evidence_count, len(REQUIRED_ARTIFACTS))

    def test_missing_required_artifact_blocks_release(self):
        dossier = complete_dossier(artifacts=tuple(
            item for item in complete_dossier().artifacts if item.artifact_type != "model_card"
        ))
        result = validate_dossier(dossier, now=NOW)
        self.assertIn("REQUIRED_ARTIFACT_MISSING:model_card", result.reasons)

    def test_artifact_digest_and_provenance_are_required(self):
        dossier = complete_dossier(artifacts=tuple(
            GovernanceArtifact(item.artifact_id, item.artifact_type, item.version,
                               item.owner, item.source_ref, "bad-digest", item.created_at,
                               item.expires_at, item.bound_versions)
            if item.artifact_type == "model_card" else item
            for item in complete_dossier().artifacts
        ))
        result = validate_dossier(dossier, now=NOW)
        self.assertIn("ARTIFACT_DIGEST_INVALID:model_card", result.reasons)

    def test_artifact_version_must_match_release_manifest(self):
        artifacts = list(complete_dossier().artifacts)
        first = artifacts[0]
        artifacts[0] = GovernanceArtifact(
            first.artifact_id, first.artifact_type, first.version, first.owner,
            first.source_ref, first.sha256_digest, first.created_at,
            first.expires_at, {"model": "old-model"},
        )
        result = validate_dossier(complete_dossier(artifacts=tuple(artifacts)), now=NOW)
        self.assertTrue(any("ARTIFACT_VERSION_MISMATCH" in reason for reason in result.reasons))

    def test_expired_artifact_and_missing_legal_review_block(self):
        artifacts = list(complete_dossier().artifacts)
        first = artifacts[0]
        artifacts[0] = GovernanceArtifact(
            first.artifact_id, first.artifact_type, first.version, first.owner,
            first.source_ref, first.sha256_digest, first.created_at, NOW,
            first.bound_versions,
        )
        result = validate_dossier(
            complete_dossier(artifacts=tuple(artifacts), legal_review_reference=None), now=NOW
        )
        self.assertTrue(any("ARTIFACT_EXPIRED" in reason for reason in result.reasons))
        self.assertIn("JURISDICTION_LEGAL_REVIEW_MISSING", result.reasons)

    def test_approval_must_be_current_signed_and_role_correct(self):
        approvals = list(complete_dossier().approvals)
        approvals[0] = Approval("bad", approvals[0].artifact_type, "v1", "reviewer",
                                "viewer", "approved", NOW - 1, False)
        result = validate_dossier(complete_dossier(approvals=tuple(approvals)), now=NOW)
        self.assertTrue(any("APPROVAL_EXPIRED" in reason for reason in result.reasons))
        self.assertTrue(any("APPROVAL_SIGNATURE_INVALID" in reason for reason in result.reasons))
        self.assertTrue(any("APPROVAL_ROLE_INVALID" in reason for reason in result.reasons))

    def test_high_risk_release_requires_human_oversight(self):
        result = validate_dossier(complete_dossier(high_risk_system=True), now=NOW)
        self.assertIn("HIGH_RISK_HUMAN_OVERSIGHT_APPROVAL_MISSING", result.reasons)
        oversight = Approval("human-1", "risk_assessment", "v1", "reviewer",
                             "human_oversight", "approved", NOW + 100, True)
        approved = validate_dossier(
            complete_dossier(high_risk_system=True,
                             approvals=complete_dossier().approvals + (oversight,)), now=NOW
        )
        self.assertNotIn("HIGH_RISK_HUMAN_OVERSIGHT_APPROVAL_MISSING", approved.reasons)

    def test_high_critical_risk_requires_mitigation_test_and_owner(self):
        risk = RiskItem("R-1", "critical", "open", "data leakage", "security-owner")
        result = validate_dossier(complete_dossier(risks=(risk,)), now=NOW)
        self.assertIn("UNRESOLVED_HIGH_RISK:R-1", result.reasons)
        self.assertIn("HIGH_RISK_EVIDENCE_MISSING:R-1", result.reasons)
        mitigated = RiskItem("R-1", "critical", "mitigated", "data leakage",
                             "security-owner", "tenant filter", "negative test passed")
        self.assertTrue(validate_dossier(complete_dossier(risks=(mitigated,)), now=NOW).passed)

    def test_accepted_residual_risk_requires_acceptance_owner(self):
        risk = RiskItem("R-2", "high", "accepted", "provider dependency",
                        "service-owner", "fallback and monitoring", "outage drill", None)
        result = validate_dossier(complete_dossier(risks=(risk,)), now=NOW)
        self.assertIn("RISK_ACCEPTANCE_OWNER_MISSING:R-2", result.reasons)


class DataLifecycleTests(unittest.TestCase):
    def test_personal_data_requires_consent(self):
        asset = DataAsset("customer-data", "restricted", True, False, 365, NOW - 10)
        result = validate_dossier(complete_dossier(data_assets=(asset,)), now=NOW)
        self.assertIn("PERSONAL_DATA_CONSENT_MISSING:customer-data", result.reasons)

    def test_expired_retention_requires_deletion(self):
        asset = DataAsset("old-data", "confidential", False, True, 30, NOW - 90 * 86400)
        result = validate_dossier(complete_dossier(data_assets=(asset,)), now=NOW)
        self.assertIn("DATA_RETENTION_EXPIRED:old-data", result.reasons)

    def test_deletion_request_must_be_completed_and_auditable(self):
        pending = DataAsset("delete-me", "restricted", True, True, 365, NOW - 10,
                            deletion_requested_at=NOW - 2)
        result = validate_dossier(complete_dossier(data_assets=(pending,)), now=NOW)
        self.assertIn("DATA_DELETION_PENDING:delete-me", result.reasons)
        completed = DataAsset("delete-me", "restricted", True, True, 365, NOW - 10,
                              deletion_requested_at=NOW - 2, deleted_at=NOW - 1)
        self.assertTrue(validate_dossier(complete_dossier(data_assets=(completed,)), now=NOW).passed)

    def test_cross_border_transfer_requires_reviewed_mechanism(self):
        asset = DataAsset("transfer", "confidential", True, True, 365, NOW - 1,
                          cross_border_transfer=True, transfer_mechanism_approved=False)
        result = validate_dossier(complete_dossier(data_assets=(asset,)), now=NOW)
        self.assertIn("CROSS_BORDER_TRANSFER_REVIEW_MISSING:transfer", result.reasons)


class AuditAndLifecycleTests(unittest.TestCase):
    def test_hash_chained_audit_ledger_detects_tampering(self):
        ledger = AuditLedger()
        ledger.append("evt-1", NOW, "system", "release.reviewed", {"release": "release-12"})
        ledger.append("evt-2", NOW + 1, "owner", "release.approved", {"release": "release-12"})
        self.assertTrue(ledger.verify())
        ledger.events[0]["payload"]["release"] = "tampered"
        self.assertFalse(ledger.verify())

    def test_lifecycle_transitions_are_explicit(self):
        lifecycle = LifecycleManager()
        self.assertEqual(lifecycle.transition("submit"), "review")
        self.assertEqual(lifecycle.transition("approve"), "approved")
        self.assertEqual(lifecycle.transition("release"), "released")
        self.assertEqual(lifecycle.transition("suspend"), "suspended")
        self.assertEqual(lifecycle.transition("reinstate"), "released")
        self.assertEqual(lifecycle.transition("retire"), "retired")
        with self.assertRaisesRegex(ValueError, "LIFECYCLE_TRANSITION_INVALID"):
            lifecycle.transition("release")

    def test_lifecycle_cannot_skip_review(self):
        lifecycle = LifecycleManager()
        with self.assertRaisesRegex(ValueError, "LIFECYCLE_TRANSITION_INVALID"):
            lifecycle.transition("release")


if __name__ == "__main__":
    unittest.main()
