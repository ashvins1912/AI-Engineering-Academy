import importlib.util
from pathlib import Path
import sys
import unittest

MODULE_PATH = Path(__file__).parent / "capstone-delivery" / "release_gate.py"
spec = importlib.util.spec_from_file_location("capstone_release_gate", MODULE_PATH)
release_gate = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = release_gate
spec.loader.exec_module(release_gate)

ReleaseBundle = release_gate.ReleaseBundle
CanaryMetrics = release_gate.CanaryMetrics
CanaryThresholds = release_gate.CanaryThresholds
Migration = release_gate.Migration
BackupSnapshot = release_gate.BackupSnapshot
validate_release = release_gate.validate_release
evaluate_canary = release_gate.evaluate_canary
rollout = release_gate.rollout
validate_migration = release_gate.validate_migration
validate_backup = release_gate.validate_backup
manifest_digest = release_gate.manifest_digest


class CapstoneDeliveryTests(unittest.TestCase):
    def setUp(self):
        digest = "sha256:" + "a" * 64
        self.current = ReleaseBundle("release-10", "1" * 40, digest, digest, "prompt-4", "index-7", "schema-3", "api-v2",
                                     True, True, True, True, True, True, "release-9")
        self.candidate = ReleaseBundle("release-11", "2" * 40, digest, digest, "prompt-5", "index-8", "schema-4", "api-v3",
                                       True, True, True, True, True, True, "release-10")
        self.thresholds = CanaryThresholds()
        self.healthy = CanaryMetrics(2000, 0.001, 1500, 0.95, 0.02)

    def test_valid_release_bundle(self):
        self.assertEqual(validate_release(self.candidate), ())

    def test_invalid_image_digest_rejected(self):
        bad = ReleaseBundle(**{**self.candidate.__dict__, "image_digest": "latest"})
        self.assertIn("INVALID_IMAGE_DIGEST", validate_release(bad))

    def test_invalid_model_digest_rejected(self):
        bad = ReleaseBundle(**{**self.candidate.__dict__, "model_digest": "model-v1"})
        self.assertIn("INVALID_MODEL_DIGEST", validate_release(bad))

    def test_missing_prompt_or_index_version_rejected(self):
        bad = ReleaseBundle(**{**self.candidate.__dict__, "prompt_version": "", "index_version": ""})
        findings = validate_release(bad)
        self.assertIn("PROMPT_VERSION_MISSING", findings)
        self.assertIn("INDEX_VERSION_MISSING", findings)

    def test_evaluation_security_and_provenance_gates(self):
        bad = ReleaseBundle(**{**self.candidate.__dict__, "evaluation_passed": False, "security_passed": False,
                               "provenance_verified": False, "signature_verified": False})
        findings = validate_release(bad)
        self.assertIn("EVALUATION_FAILED", findings)
        self.assertIn("SECURITY_FAILED", findings)
        self.assertIn("PROVENANCE_UNVERIFIED", findings)
        self.assertIn("SIGNATURE_UNVERIFIED", findings)

    def test_rollback_bundle_required(self):
        bad = ReleaseBundle(**{**self.candidate.__dict__, "rollback_release_id": None})
        self.assertIn("ROLLBACK_BUNDLE_MISSING", validate_release(bad))

    def test_healthy_canary_promotes(self):
        decision = rollout(self.candidate, self.current, self.healthy, self.thresholds)
        self.assertEqual((decision.action, decision.target_release), ("PROMOTE", "release-11"))

    def test_error_rate_breach_rolls_back(self):
        metrics = CanaryMetrics(2000, 0.01, 1500, 0.95, 0.02)
        decision = rollout(self.candidate, self.current, metrics, self.thresholds)
        self.assertEqual(decision.action, "ROLLBACK")
        self.assertIn("ERROR_RATE_THRESHOLD_BREACHED", decision.reasons)

    def test_quality_breach_rolls_back_even_when_latency_passes(self):
        metrics = CanaryMetrics(2000, 0.001, 1200, 0.80, 0.02)
        decision = rollout(self.candidate, self.current, metrics, self.thresholds)
        self.assertEqual(decision.action, "ROLLBACK")
        self.assertIn("QUALITY_THRESHOLD_BREACHED", decision.reasons)

    def test_cost_breach_rolls_back(self):
        metrics = CanaryMetrics(2000, 0.001, 1200, 0.95, 0.10)
        self.assertIn("COST_THRESHOLD_BREACHED", evaluate_canary(metrics, self.thresholds))

    def test_latency_breach_rolls_back(self):
        metrics = CanaryMetrics(2000, 0.001, 2500, 0.95, 0.02)
        self.assertIn("LATENCY_THRESHOLD_BREACHED", evaluate_canary(metrics, self.thresholds))

    def test_insufficient_sample_blocks_canary(self):
        metrics = CanaryMetrics(50, 0.0, 1000, 0.99, 0.01)
        self.assertIn("INSUFFICIENT_SAMPLE_SIZE", evaluate_canary(metrics, self.thresholds))

    def test_invalid_release_rejected_before_canary(self):
        bad = ReleaseBundle(**{**self.candidate.__dict__, "signature_verified": False})
        decision = rollout(bad, self.current, self.healthy, self.thresholds)
        self.assertEqual(decision.action, "REJECT")
        self.assertEqual(decision.target_release, "release-10")

    def test_expand_and_backfill_require_compatibility(self):
        self.assertEqual(validate_migration(Migration("add-column", "expand", True, True, False)).action, "ALLOW")
        self.assertEqual(validate_migration(Migration("backfill", "backfill", True, True, False)).reason, "BACKFILL_NOT_VERIFIED")

    def test_contract_waits_for_old_instances_to_drain(self):
        decision = validate_migration(Migration("drop-old-column", "contract", True, True, True))
        self.assertEqual(decision.reason, "OLD_INSTANCES_STILL_ACTIVE")

    def test_contract_requires_verified_data(self):
        decision = validate_migration(Migration("drop-old-column", "contract", True, False, False))
        self.assertEqual(decision.reason, "CONTRACT_REQUIRES_VERIFIED_DATA")

    def test_contract_allowed_after_drain_and_verification(self):
        decision = validate_migration(Migration("drop-old-column", "contract", True, False, True))
        self.assertEqual(decision.action, "ALLOW")

    def test_incompatible_expand_blocked(self):
        decision = validate_migration(Migration("rename-column", "expand", False, True, False))
        self.assertEqual(decision.reason, "MIGRATION_NOT_BACKWARD_COMPATIBLE")

    def test_backup_restore_requires_test_and_tenant_integrity(self):
        digest = "sha256:" + "b" * 64
        good = BackupSnapshot("snapshot-1", digest, True, True, 10, 30)
        self.assertEqual(validate_backup(good, 15, 60).action, "ALLOW")
        bad = BackupSnapshot("snapshot-2", digest, True, False, 10, 30)
        self.assertEqual(validate_backup(bad, 15, 60).reason, "TENANT_INTEGRITY_FAILED")

    def test_backup_restore_objectives_enforced(self):
        digest = "sha256:" + "b" * 64
        backup = BackupSnapshot("snapshot-3", digest, True, True, 30, 120)
        self.assertEqual(validate_backup(backup, 15, 60).reason, "RECOVERY_OBJECTIVE_BREACHED")

    def test_manifest_digest_is_stable(self):
        self.assertEqual(manifest_digest(self.candidate), manifest_digest(self.candidate))
        changed = ReleaseBundle(**{**self.candidate.__dict__, "prompt_version": "prompt-6"})
        self.assertNotEqual(manifest_digest(self.candidate), manifest_digest(changed))


if __name__ == "__main__":
    unittest.main()
