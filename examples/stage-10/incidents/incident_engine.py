"""Offline AI incident response lifecycle simulator."""
from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
from typing import Iterable


SEVERITIES = {"P0", "P1", "P2", "P3"}
TRANSITIONS = {
    "DETECTED": "TRIAGED",
    "TRIAGED": "CONTAINED",
    "CONTAINED": "ERADICATED",
    "ERADICATED": "RECOVERING",
    "RECOVERING": "RESOLVED",
    "RESOLVED": "REVIEWED",
}

CONTAINMENT = {
    "tenant_exposure": ("disable_affected_data_path", "revoke_exposed_links", "pause_affected_workers", "preserve_access_audit"),
    "artifact_compromise": ("quarantine_artifact_digest", "stop_release_promotion", "identify_deployments_by_digest", "restore_trusted_artifact"),
    "provider_outage": ("open_dependency_breaker", "apply_safe_fallback", "cap_retry_budget", "monitor_provider_recovery"),
    "unsafe_tool": ("disable_tool_capability", "revoke_tool_credentials", "inspect_idempotency_ledger", "require_human_approval"),
    "cost_runaway": ("cap_or_suspend_expensive_workflow", "enforce_tenant_budget", "stop_retry_storm", "preserve_usage_ledger"),
}


@dataclass
class Incident:
    incident_id: str
    category: str
    status: str = "DETECTED"
    severity: str = "P2"
    commander: str | None = None
    timeline: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class Evidence:
    evidence_id: str
    source: str
    collected_by: str
    collected_at: str
    content: bytes
    redacted: bool


@dataclass(frozen=True)
class RecoveryDecision:
    allowed: bool
    reason: str


@dataclass(frozen=True)
class PostmortemAction:
    title: str
    owner: str | None
    due_date: str | None
    verification: str | None


def classify_severity(category: str, confirmed_exposure: bool, affected_tenants: int, active_harm: bool, degraded_users: int) -> str:
    if confirmed_exposure or (active_harm and category in {"artifact_compromise", "unsafe_tool"}):
        return "P0"
    if active_harm or affected_tenants >= 2 or degraded_users >= 1000:
        return "P1"
    if degraded_users > 0 or category == "provider_outage":
        return "P2"
    return "P3"


def containment_plan(category: str) -> tuple[str, ...]:
    if category not in CONTAINMENT:
        raise ValueError("UNKNOWN_INCIDENT_CATEGORY")
    return CONTAINMENT[category]


def transition(incident: Incident, next_state: str, evidence: Iterable[Evidence] = ()) -> Incident:
    expected = TRANSITIONS.get(incident.status)
    if expected != next_state:
        raise ValueError("INVALID_INCIDENT_TRANSITION")
    evidence_items = list(evidence)
    if next_state in {"CONTAINED", "RESOLVED"} and not evidence_items:
        raise ValueError("EVIDENCE_REQUIRED")
    incident.status = next_state
    incident.timeline.append(f"state:{next_state}")
    return incident


def evidence_digest(evidence: Evidence) -> str:
    if not evidence.source or not evidence.collected_by or not evidence.collected_at:
        raise ValueError("INCOMPLETE_CUSTODY_METADATA")
    if not evidence.redacted:
        raise ValueError("EVIDENCE_NOT_REDACTED")
    return sha256(evidence.content).hexdigest()


def recovery_gate(checks: dict[str, bool], required: Iterable[str]) -> RecoveryDecision:
    missing = [key for key in required if checks.get(key) is not True]
    if missing:
        return RecoveryDecision(False, "RECOVERY_GATE_FAILED:" + ",".join(missing))
    return RecoveryDecision(True, "RECOVERY_APPROVED")


def validate_postmortem(actions: Iterable[PostmortemAction]) -> RecoveryDecision:
    items = list(actions)
    if not items:
        return RecoveryDecision(False, "NO_CORRECTIVE_ACTIONS")
    for action in items:
        if not action.title or not action.owner or not action.due_date or not action.verification:
            return RecoveryDecision(False, "ACTION_MISSING_ACCOUNTABILITY")
    return RecoveryDecision(True, "POSTMORTEM_ACTIONS_VALID")


def main() -> None:
    incident = Incident("INC-2026-001", "tenant_exposure")
    incident.commander = "incident-commander"
    incident.severity = classify_severity("tenant_exposure", True, 2, True, 1200)
    print("severity:", incident.severity)
    print("containment:", containment_plan(incident.category))
    evidence = Evidence("EV-1", "redacted-access-audit", "security-lead", "2026-11-22T10:00:00Z", b"synthetic evidence", True)
    print("evidence digest:", evidence_digest(evidence))
    print("recovery:", recovery_gate({"tenant_isolation": True, "quality": True, "slo": True}, ["tenant_isolation", "quality", "slo"]))


if __name__ == "__main__":
    main()
