import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "examples" / "stage-12" / "final_certification"))

from certification_gate import (
    HUMAN_REVIEW_REQUIREMENTS, REQUIRED_EVIDENCE, CertificationEvidence,
    evaluate_certification,
)

TENANT = "tenant-stage12-learner"
RELEASE = "stage12-final-v1"


def complete_evidence():
    return [
        CertificationEvidence(
            requirement=name,
            passed=True,
            evidence_ref=f"local://certification/{name}",
            tenant_id=TENANT,
            release_version=RELEASE,
            assessor="independent-reviewer" if name in HUMAN_REVIEW_REQUIREMENTS else "",
        )
        for name in sorted(REQUIRED_EVIDENCE)
    ]


class FinalCertificationGateTests(unittest.TestCase):
    def decide(self, evidence=None, **kwargs):
        return evaluate_certification(
            complete_evidence() if evidence is None else evidence,
            tenant_id=TENANT,
            release_version=RELEASE,
            **kwargs,
        )

    def test_complete_reviewed_evidence_certifies(self):
        result = self.decide()
        self.assertTrue(result.certified, result.reasons)
        self.assertEqual(set(result.accepted_requirements), REQUIRED_EVIDENCE)

    def test_missing_topic_mastery_blocks(self):
        evidence = [item for item in complete_evidence()
                    if item.requirement != "protocol_interop_mastery"]
        result = self.decide(evidence)
        self.assertFalse(result.certified)
        self.assertIn("REQUIRED_EVIDENCE_MISSING:protocol_interop_mastery", result.reasons)

    def test_failed_topic_assessment_blocks(self):
        evidence = complete_evidence()
        index = next(i for i, item in enumerate(evidence)
                     if item.requirement == "evaluation_scale_mastery")
        evidence[index] = CertificationEvidence(
            "evaluation_scale_mastery", False, "local://failed", TENANT, RELEASE
        )
        self.assertIn("EVIDENCE_FAILED:evaluation_scale_mastery",
                      self.decide(evidence).reasons)

    def test_human_defense_requires_assessor(self):
        evidence = complete_evidence()
        index = next(i for i, item in enumerate(evidence)
                     if item.requirement == "architecture_defense")
        evidence[index] = CertificationEvidence(
            "architecture_defense", True, "local://defense", TENANT, RELEASE
        )
        self.assertIn("HUMAN_ASSESSOR_REQUIRED:architecture_defense",
                      self.decide(evidence).reasons)

    def test_cross_tenant_evidence_blocks(self):
        evidence = complete_evidence()
        index = next(i for i, item in enumerate(evidence)
                     if item.requirement == "tenant_isolation_security_review")
        old = evidence[index]
        evidence[index] = CertificationEvidence(
            old.requirement, True, old.evidence_ref, "tenant-attacker",
            RELEASE, old.assessor
        )
        self.assertIn("TENANT_MISMATCH:tenant_isolation_security_review",
                      self.decide(evidence).reasons)

    def test_stale_release_evidence_blocks(self):
        evidence = complete_evidence()
        old = evidence[0]
        evidence[0] = CertificationEvidence(
            old.requirement, True, old.evidence_ref, TENANT, "older-release",
            old.assessor
        )
        self.assertIn(f"RELEASE_VERSION_MISMATCH:{old.requirement}",
                      self.decide(evidence).reasons)

    def test_empty_evidence_reference_blocks(self):
        evidence = complete_evidence()
        old = evidence[0]
        evidence[0] = CertificationEvidence(
            old.requirement, True, "  ", TENANT, RELEASE, old.assessor
        )
        self.assertIn(f"EVIDENCE_REFERENCE_MISSING:{old.requirement}",
                      self.decide(evidence).reasons)

    def test_duplicate_requirement_blocks(self):
        evidence = complete_evidence()
        evidence.append(evidence[0])
        self.assertIn(f"DUPLICATE_EVIDENCE:{evidence[0].requirement}",
                      self.decide(evidence).reasons)

    def test_unresolved_high_or_critical_finding_blocks(self):
        result = self.decide(unresolved_findings=[
            {"id": "SEC-12", "severity": "critical", "status": "open"}
        ])
        self.assertIn("UNRESOLVED_CRITICAL_FINDING:SEC-12", result.reasons)

    def test_missing_candidate_context_blocks(self):
        result = evaluate_certification(
            complete_evidence(), tenant_id="", release_version=RELEASE
        )
        self.assertFalse(result.certified)
        self.assertIn("CANDIDATE_CONTEXT_INCOMPLETE", result.reasons)

    def test_unexpected_evidence_blocks(self):
        evidence = complete_evidence()
        evidence.append(CertificationEvidence(
            "invented_requirement", True, "local://extra", TENANT, RELEASE
        ))
        self.assertIn("UNEXPECTED_EVIDENCE:invented_requirement",
                      self.decide(evidence).reasons)


if __name__ == "__main__":
    unittest.main()
