"""Fail-closed final Stage 12 learner mastery and readiness certification.

This gate validates evidence envelopes; it does not manufacture learner evidence.
Automated CI evidence and human defenses are distinct, explicit requirements.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


TOPIC_REQUIREMENTS = frozenset({
    "agent_orchestration_mastery",
    "protocol_interop_mastery",
    "advanced_retrieval_mastery",
    "evaluation_scale_mastery",
    "ai_red_team_mastery",
    "inference_performance_mastery",
    "multimodal_systems_mastery",
    "enterprise_governance_mastery",
    "advanced_practicum_mastery",
})
READINESS_REQUIREMENTS = frozenset({
    "clean_checkout_acceptance",
    "cross_topic_failure_injection",
    "tenant_isolation_security_review",
    "architecture_defense",
})
REQUIRED_EVIDENCE = TOPIC_REQUIREMENTS | READINESS_REQUIREMENTS
HUMAN_REVIEW_REQUIREMENTS = frozenset({
    "agent_orchestration_mastery",
    "advanced_practicum_mastery",
    "tenant_isolation_security_review",
    "architecture_defense",
})


@dataclass(frozen=True)
class CertificationEvidence:
    requirement: str
    passed: bool
    evidence_ref: str
    tenant_id: str
    release_version: str
    assessor: str = ""


@dataclass(frozen=True)
class CertificationDecision:
    certified: bool
    reasons: tuple[str, ...]
    accepted_requirements: tuple[str, ...]


def evaluate_certification(
    evidence: Iterable[CertificationEvidence],
    *,
    tenant_id: str,
    release_version: str,
    unresolved_findings: Iterable[dict] = (),
) -> CertificationDecision:
    """Certify only complete, passing, candidate-bound evidence and reviewed defenses."""
    reasons: list[str] = []
    if not tenant_id or not release_version:
        reasons.append("CANDIDATE_CONTEXT_INCOMPLETE")

    by_requirement: dict[str, CertificationEvidence] = {}
    for item in evidence:
        if item.requirement in by_requirement:
            reasons.append(f"DUPLICATE_EVIDENCE:{item.requirement}")
            continue
        by_requirement[item.requirement] = item
        if item.requirement not in REQUIRED_EVIDENCE:
            reasons.append(f"UNEXPECTED_EVIDENCE:{item.requirement}")
        if not item.passed:
            reasons.append(f"EVIDENCE_FAILED:{item.requirement}")
        if not item.evidence_ref.strip():
            reasons.append(f"EVIDENCE_REFERENCE_MISSING:{item.requirement}")
        if item.tenant_id != tenant_id:
            reasons.append(f"TENANT_MISMATCH:{item.requirement}")
        if item.release_version != release_version:
            reasons.append(f"RELEASE_VERSION_MISMATCH:{item.requirement}")
        if item.requirement in HUMAN_REVIEW_REQUIREMENTS and not item.assessor.strip():
            reasons.append(f"HUMAN_ASSESSOR_REQUIRED:{item.requirement}")

    for missing in sorted(REQUIRED_EVIDENCE - set(by_requirement)):
        reasons.append(f"REQUIRED_EVIDENCE_MISSING:{missing}")

    for finding in unresolved_findings:
        severity = str(finding.get("severity", "")).lower()
        status = str(finding.get("status", "")).lower()
        finding_id = str(finding.get("id", "unknown"))
        if severity in {"high", "critical"} and status != "resolved":
            reasons.append(f"UNRESOLVED_{severity.upper()}_FINDING:{finding_id}")

    accepted = tuple(sorted(
        key for key, item in by_requirement.items()
        if key in REQUIRED_EVIDENCE
        and item.passed
        and item.evidence_ref.strip()
        and item.tenant_id == tenant_id
        and item.release_version == release_version
        and (key not in HUMAN_REVIEW_REQUIREMENTS or item.assessor.strip())
    ))
    return CertificationDecision(
        certified=not reasons,
        reasons=tuple(sorted(set(reasons))),
        accepted_requirements=accepted,
    )
