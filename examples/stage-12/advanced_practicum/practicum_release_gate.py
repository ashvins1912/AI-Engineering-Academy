"""Fail-closed evidence gate for the integrated Stage 12 practicum."""
from __future__ import annotations

from dataclasses import dataclass


REQUIRED_CAPABILITIES = frozenset({
    "agent_orchestration",
    "protocol_interop",
    "advanced_retrieval",
    "evaluation_scale",
    "ai_red_team",
    "inference_simulator",
    "capacity_sweep",
    "multimodal_systems",
    "enterprise_governance",
    "stage11_capstone",
})


@dataclass(frozen=True)
class EvidenceRecord:
    capability: str
    passed: bool
    evidence_ref: str
    tenant_id: str
    release_version: str


@dataclass(frozen=True)
class ReleaseDecision:
    passed: bool
    reasons: tuple[str, ...]
    accepted_capabilities: tuple[str, ...]


def evaluate_practicum_release(
    evidence: list[EvidenceRecord],
    *,
    tenant_id: str,
    release_version: str,
    unresolved_findings: list[dict] | None = None,
) -> ReleaseDecision:
    """Require complete, passing, tenant/version-bound evidence and no open high risks."""
    reasons: list[str] = []
    if not tenant_id or not release_version:
        reasons.append("CANDIDATE_CONTEXT_INCOMPLETE")

    by_capability: dict[str, EvidenceRecord] = {}
    for item in evidence:
        if item.capability in by_capability:
            reasons.append(f"DUPLICATE_CAPABILITY_EVIDENCE:{item.capability}")
            continue
        by_capability[item.capability] = item
        if not item.passed:
            reasons.append(f"CAPABILITY_FAILED:{item.capability}")
        if not item.evidence_ref:
            reasons.append(f"EVIDENCE_REFERENCE_MISSING:{item.capability}")
        if item.tenant_id != tenant_id:
            reasons.append(f"EVIDENCE_TENANT_MISMATCH:{item.capability}")
        if item.release_version != release_version:
            reasons.append(f"EVIDENCE_VERSION_MISMATCH:{item.capability}")

    for missing in sorted(REQUIRED_CAPABILITIES - set(by_capability)):
        reasons.append(f"REQUIRED_CAPABILITY_MISSING:{missing}")
    for unexpected in sorted(set(by_capability) - REQUIRED_CAPABILITIES):
        reasons.append(f"UNEXPECTED_CAPABILITY_EVIDENCE:{unexpected}")

    for finding in unresolved_findings or []:
        severity = str(finding.get("severity", "")).lower()
        status = str(finding.get("status", "")).lower()
        finding_id = str(finding.get("id", "unknown"))
        if severity in {"high", "critical"} and status != "resolved":
            reasons.append(f"UNRESOLVED_{severity.upper()}_FINDING:{finding_id}")

    accepted = tuple(sorted(
        capability for capability, item in by_capability.items()
        if capability in REQUIRED_CAPABILITIES and item.passed
        and item.evidence_ref and item.tenant_id == tenant_id
        and item.release_version == release_version
    ))
    return ReleaseDecision(not reasons, tuple(sorted(set(reasons))), accepted)
