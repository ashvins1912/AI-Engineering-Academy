import importlib.util
from pathlib import Path
import sys
import unittest

MODULE_PATH = Path(__file__).parent / "supply-chain" / "policy_engine.py"
spec = importlib.util.spec_from_file_location("supply_chain_policy_engine", MODULE_PATH)
policy_engine = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = policy_engine
spec.loader.exec_module(policy_engine)

Artifact = policy_engine.Artifact
Dependency = policy_engine.Dependency
Policy = policy_engine.Policy
digest_bytes = policy_engine.digest_bytes
verify_artifact = policy_engine.verify_artifact
verify_dependencies = policy_engine.verify_dependencies
release_decision = policy_engine.release_decision
find_secret_patterns = policy_engine.find_secret_patterns
redact_secrets = policy_engine.redact_secrets


class SupplyChainTests(unittest.TestCase):
    def setUp(self):
        self.policy = Policy(
            allowed_licenses=frozenset({"MIT", "Apache-2.0", "BSD-3-Clause"}),
            allowed_sources=frozenset({"registry.example/model-team", "registry.example/data-team"}),
            blocked_licenses=frozenset({"Proprietary-Restricted"}),
        )
        self.model_bytes = b"synthetic-model-weights-v1"
        self.valid = Artifact(
            "model-v1", "weights", self.model_bytes, digest_bytes(self.model_bytes),
            "Apache-2.0", "registry.example/model-team", True, True,
        )
        self.safe_dependency = Dependency("numpy", "2.1.0", "NONE", None, True)

    def test_matching_digest_and_trusted_metadata_allowed(self):
        self.assertEqual(verify_artifact(self.valid, self.policy), policy_engine.Decision("ALLOW", "VERIFIED"))

    def test_tampered_bytes_rejected(self):
        changed = Artifact(
            "model-v1", "weights", b"tampered", self.valid.expected_sha256,
            "Apache-2.0", "registry.example/model-team", True, True,
        )
        self.assertEqual(verify_artifact(changed, self.policy).reason, "CHECKSUM_MISMATCH")

    def test_empty_artifact_rejected(self):
        empty = Artifact("empty", "weights", b"", digest_bytes(b""), "MIT", "registry.example/model-team", True, True)
        self.assertEqual(verify_artifact(empty, self.policy).reason, "EMPTY_ARTIFACT")

    def test_untrusted_source_rejected(self):
        artifact = Artifact("model", "weights", self.model_bytes, digest_bytes(self.model_bytes), "MIT", "unknown.example/model", True, True)
        self.assertEqual(verify_artifact(artifact, self.policy).reason, "UNTRUSTED_SOURCE")

    def test_unverified_signature_rejected(self):
        artifact = Artifact("model", "weights", self.model_bytes, digest_bytes(self.model_bytes), "MIT", "registry.example/model-team", False, True)
        self.assertEqual(verify_artifact(artifact, self.policy).reason, "SIGNATURE_UNVERIFIED")

    def test_missing_provenance_rejected(self):
        artifact = Artifact("model", "weights", self.model_bytes, digest_bytes(self.model_bytes), "MIT", "registry.example/model-team", True, False)
        self.assertEqual(verify_artifact(artifact, self.policy).reason, "PROVENANCE_MISSING")

    def test_unknown_license_held(self):
        artifact = Artifact("tokenizer", "tokenizer", b"tokenizer", digest_bytes(b"tokenizer"), "UNKNOWN", "registry.example/model-team", True, True)
        self.assertEqual(verify_artifact(artifact, self.policy), policy_engine.Decision("HOLD", "LICENSE_REVIEW"))

    def test_missing_license_held(self):
        artifact = Artifact("dataset", "dataset", b"data", digest_bytes(b"data"), None, "registry.example/data-team", True, True)
        self.assertEqual(verify_artifact(artifact, self.policy).status, "HOLD")

    def test_blocked_license_held_for_review(self):
        artifact = Artifact("model", "weights", self.model_bytes, digest_bytes(self.model_bytes), "Proprietary-Restricted", "registry.example/model-team", True, True)
        self.assertEqual(verify_artifact(artifact, self.policy).reason, "LICENSE_REVIEW")

    def test_dependency_inventory_empty_held(self):
        self.assertEqual(verify_dependencies([], self.policy).reason, "EMPTY_DEPENDENCY_INVENTORY")

    def test_pinned_safe_dependency_allowed(self):
        self.assertEqual(verify_dependencies([self.safe_dependency], self.policy).status, "ALLOW")

    def test_critical_dependency_rejected(self):
        dep = Dependency("fasttensor", "1.2.0", "CRITICAL", "CVE-SYNTHETIC-1", True)
        self.assertEqual(verify_dependencies([dep], self.policy).reason, "VULNERABILITY_CRITICAL")

    def test_high_dependency_rejected(self):
        dep = Dependency("unsafe-lib", "4.0.0", "HIGH", "CVE-SYNTHETIC-2", True)
        self.assertEqual(verify_dependencies([dep], self.policy).reason, "VULNERABILITY_HIGH")

    def test_unpinned_dependency_held(self):
        dep = Dependency("fastlib", None, "NONE", None, False)
        self.assertEqual(verify_dependencies([dep], self.policy).reason, "DEPENDENCY_NOT_PINNED")

    def test_low_severity_dependency_allowed_by_default(self):
        dep = Dependency("lib", "1.0.0", "LOW", "CVE-SYNTHETIC-3", True)
        self.assertEqual(verify_dependencies([dep], self.policy).status, "ALLOW")

    def test_release_gate_requires_every_component(self):
        unknown = Artifact("unknown", "tokenizer", b"tok", digest_bytes(b"tok"), "UNKNOWN", "registry.example/model-team", True, True)
        result = release_decision([self.valid, unknown], [self.safe_dependency], self.policy)
        self.assertEqual(result, policy_engine.Decision("HOLD", "LICENSE_REVIEW"))

    def test_release_gate_blocks_vulnerable_dependency(self):
        result = release_decision([self.valid], [Dependency("bad", "1.0", "CRITICAL", "CVE-X", True)], self.policy)
        self.assertEqual(result.reason, "VULNERABILITY_CRITICAL")

    def test_release_gate_requires_nonempty_artifacts(self):
        self.assertEqual(release_decision([], [self.safe_dependency], self.policy).reason, "EMPTY_ARTIFACT_INVENTORY")

    def test_secret_patterns_detected_and_redacted(self):
        sample = "build log AKIA1234567890ABCDEF ghp_" + "A" * 24 + " sk_live_" + "B" * 16 + " password=hunter2"
        self.assertGreaterEqual(len(find_secret_patterns(sample)), 3)
        cleaned = redact_secrets(sample)
        self.assertNotIn("AKIA1234567890ABCDEF", cleaned)
        self.assertNotIn("hunter2", cleaned)
        self.assertIn("[REDACTED", cleaned)

    def test_nonsecret_log_is_unchanged(self):
        sample = "build completed; tests passed; artifact sha256 recorded"
        self.assertEqual(redact_secrets(sample), sample)


if __name__ == "__main__":
    unittest.main()
