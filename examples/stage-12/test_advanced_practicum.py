import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "examples" / "stage-12" / "advanced_practicum"))

from practicum_acceptance import COMMANDS, RELEASE_VERSION, TENANT_ID, run_acceptance
from practicum_release_gate import (
    REQUIRED_CAPABILITIES, EvidenceRecord, evaluate_practicum_release,
)


def complete_evidence():
    return [
        EvidenceRecord(name, True, f"local://evidence/{name}", TENANT_ID, RELEASE_VERSION)
        for name in sorted(REQUIRED_CAPABILITIES)
    ]


class PracticumReleaseGateTests(unittest.TestCase):
    def test_complete_evidence_passes(self):
        decision = evaluate_practicum_release(
            complete_evidence(), tenant_id=TENANT_ID, release_version=RELEASE_VERSION
        )
        self.assertTrue(decision.passed)
        self.assertEqual(set(decision.accepted_capabilities), REQUIRED_CAPABILITIES)

    def test_missing_capability_blocks_release(self):
        evidence = [item for item in complete_evidence() if item.capability != "ai_red_team"]
        decision = evaluate_practicum_release(
            evidence, tenant_id=TENANT_ID, release_version=RELEASE_VERSION
        )
        self.assertFalse(decision.passed)
        self.assertIn("REQUIRED_CAPABILITY_MISSING:ai_red_team", decision.reasons)

    def test_failed_demo_blocks_release(self):
        evidence = complete_evidence()
        evidence[0] = EvidenceRecord(
            evidence[0].capability, False, evidence[0].evidence_ref,
            TENANT_ID, RELEASE_VERSION,
        )
        decision = evaluate_practicum_release(
            evidence, tenant_id=TENANT_ID, release_version=RELEASE_VERSION
        )
        self.assertFalse(decision.passed)
        self.assertTrue(any(reason.startswith("CAPABILITY_FAILED:") for reason in decision.reasons))

    def test_cross_tenant_evidence_blocks_release(self):
        evidence = complete_evidence()
        evidence[0] = EvidenceRecord(
            evidence[0].capability, True, evidence[0].evidence_ref,
            "tenant-attacker", RELEASE_VERSION,
        )
        decision = evaluate_practicum_release(
            evidence, tenant_id=TENANT_ID, release_version=RELEASE_VERSION
        )
        self.assertFalse(decision.passed)
        self.assertTrue(any(reason.startswith("EVIDENCE_TENANT_MISMATCH:") for reason in decision.reasons))

    def test_version_mismatch_blocks_release(self):
        evidence = complete_evidence()
        evidence[0] = EvidenceRecord(
            evidence[0].capability, True, evidence[0].evidence_ref,
            TENANT_ID, "older-release",
        )
        decision = evaluate_practicum_release(
            evidence, tenant_id=TENANT_ID, release_version=RELEASE_VERSION
        )
        self.assertFalse(decision.passed)
        self.assertTrue(any(reason.startswith("EVIDENCE_VERSION_MISMATCH:") for reason in decision.reasons))

    def test_unresolved_high_or_critical_findings_block_release(self):
        decision = evaluate_practicum_release(
            complete_evidence(), tenant_id=TENANT_ID, release_version=RELEASE_VERSION,
            unresolved_findings=[{"id": "RED-17", "severity": "critical", "status": "open"}],
        )
        self.assertFalse(decision.passed)
        self.assertIn("UNRESOLVED_CRITICAL_FINDING:RED-17", decision.reasons)

    def test_duplicate_capability_evidence_blocks_release(self):
        evidence = complete_evidence()
        evidence.append(evidence[0])
        decision = evaluate_practicum_release(
            evidence, tenant_id=TENANT_ID, release_version=RELEASE_VERSION
        )
        self.assertFalse(decision.passed)
        self.assertTrue(any(reason.startswith("DUPLICATE_CAPABILITY_EVIDENCE:") for reason in decision.reasons))


class IntegratedPracticumAcceptanceTests(unittest.TestCase):
    def test_all_topic_demos_and_stage11_capstone_pass(self):
        report = run_acceptance()
        self.assertEqual(len(COMMANDS), 10)
        self.assertEqual(report["result"], "PASS", report["release_gate"]["reasons"])
        self.assertEqual(report["passed"], report["total"])
        self.assertTrue(report["release_gate"]["passed"])
        self.assertEqual(set(report["checks"]), REQUIRED_CAPABILITIES)

    def test_demo_manifest_paths_exist(self):
        for _, relative_path in COMMANDS:
            self.assertTrue((ROOT / relative_path).is_file(), relative_path)


if __name__ == "__main__":
    unittest.main()
