"""Offline enterprise architecture and threat-model acceptance gate."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable


STRIDE = {
    "S": "SPOOFING",
    "T": "TAMPERING",
    "R": "REPUDIATION",
    "I": "INFORMATION_DISCLOSURE",
    "D": "DENIAL_OF_SERVICE",
    "E": "ELEVATION_OF_PRIVILEGE",
}
REQUIRED_CONTROLS = {
    "api_gateway": {"authentication", "request_validation", "rate_limit", "trace_correlation"},
    "identity": {"verified_subject", "membership_check", "role_resolution", "audit"},
    "ingestion": {"file_validation", "malware_scan", "tenant_context", "provenance"},
    "retrieval": {"tenant_filter", "acl_filter", "source_provenance", "citation_verification"},
    "model_gateway": {"prompt_boundary", "output_validation", "token_budget", "provider_timeout"},
    "agent": {"action_policy", "loop_limit", "tool_allowlist", "state_isolation"},
    "tool_gateway": {"capability_allowlist", "resource_scope", "idempotency", "approval_gate"},
    "datastore": {"encryption_at_rest", "tenant_isolation", "backup", "retention_policy"},
    "queue": {"authenticated_producer", "tenant_context", "idempotency", "replay_protection"},
    "observability": {"redaction", "access_control", "retention", "audit"},
    "deployment": {"signed_artifact", "provenance", "evaluation_gate", "rollback_bundle"},
}


@dataclass(frozen=True)
class Component:
    name: str
    kind: str
    trust_zone: str
    controls: frozenset[str] = frozenset()


@dataclass(frozen=True)
class DataFlow:
    name: str
    source: str
    destination: str
    crosses_trust_boundary: bool
    encrypted: bool
    authenticated: bool
    tenant_context: bool
    authorization_checked: bool


@dataclass(frozen=True)
class Threat:
    threat_id: str
    stride: str
    asset: str
    attack_path: str
    likelihood: int
    impact: int
    mitigations: tuple[str, ...] = ()
    test_evidence: tuple[str, ...] = ()
    residual_owner: str | None = None

    @property
    def risk_score(self) -> int:
        return risk_score(self.likelihood, self.impact)


@dataclass(frozen=True)
class Finding:
    subject: str
    code: str
    detail: str


def risk_score(likelihood: int, impact: int) -> int:
    if not 1 <= likelihood <= 5 or not 1 <= impact <= 5:
        raise ValueError("RISK_RATING_OUT_OF_RANGE")
    return likelihood * impact


def risk_level(score: int) -> str:
    if not 1 <= score <= 25:
        raise ValueError("RISK_SCORE_OUT_OF_RANGE")
    if score >= 20:
        return "CRITICAL"
    if score >= 12:
        return "HIGH"
    if score >= 6:
        return "MEDIUM"
    return "LOW"


def validate_adr(adr: dict) -> list[Finding]:
    required = ("title", "context", "decision", "alternatives", "consequences")
    return [
        Finding(str(adr.get("title", "ADR")), "ADR_FIELD_MISSING", field)
        for field in required
        if not adr.get(field)
    ]


def validate_architecture(
    components: Iterable[Component],
    flows: Iterable[DataFlow],
    threats: Iterable[Threat],
) -> list[Finding]:
    findings: list[Finding] = []
    component_list = list(components)
    flow_list = list(flows)
    threat_list = list(threats)
    known = {component.name for component in component_list}

    for component in component_list:
        required = REQUIRED_CONTROLS.get(component.kind, set())
        for control in sorted(required - set(component.controls)):
            findings.append(Finding(component.name, "COMPONENT_CONTROL_MISSING", control))

    for flow in flow_list:
        if flow.source not in known or flow.destination not in known:
            findings.append(Finding(flow.name, "FLOW_COMPONENT_UNKNOWN", f"{flow.source}->{flow.destination}"))
        if flow.crosses_trust_boundary:
            if not flow.encrypted:
                findings.append(Finding(flow.name, "BOUNDARY_ENCRYPTION_MISSING", "cross-boundary flow must be encrypted"))
            if not flow.authenticated:
                findings.append(Finding(flow.name, "BOUNDARY_AUTHENTICATION_MISSING", "cross-boundary flow must authenticate peer"))
            if not flow.tenant_context:
                findings.append(Finding(flow.name, "TENANT_CONTEXT_MISSING", "tenant-sensitive flow lacks authorized context"))
            if not flow.authorization_checked:
                findings.append(Finding(flow.name, "AUTHORIZATION_CHECK_MISSING", "flow lacks server-side authorization"))

    for threat in threat_list:
        if threat.stride not in set(STRIDE.values()):
            findings.append(Finding(threat.threat_id, "UNKNOWN_THREAT_CATEGORY", threat.stride))
        if not threat.asset or not threat.attack_path:
            findings.append(Finding(threat.threat_id, "THREAT_DESCRIPTION_INCOMPLETE", "asset and attack path are required"))
        if threat.risk_score >= 12 and (not threat.mitigations or not threat.test_evidence):
            findings.append(Finding(threat.threat_id, "HIGH_RISK_EVIDENCE_MISSING", "high/critical threats need mitigations and test evidence"))
        if threat.risk_score >= 20 and not threat.residual_owner:
            findings.append(Finding(threat.threat_id, "CRITICAL_RISK_OWNER_MISSING", "critical residual risk requires an owner"))

    return findings


def architecture_approved(findings: Iterable[Finding]) -> bool:
    return not list(findings)


def main() -> None:
    components = [
        Component("gateway", "api_gateway", "edge", frozenset(REQUIRED_CONTROLS["api_gateway"])),
        Component("identity", "identity", "identity", frozenset(REQUIRED_CONTROLS["identity"])),
        Component("retrieval", "retrieval", "application", frozenset(REQUIRED_CONTROLS["retrieval"])),
    ]
    flows = [
        DataFlow("gateway-identity", "gateway", "identity", True, True, True, True, True),
        DataFlow("identity-retrieval", "identity", "retrieval", True, True, True, True, True),
    ]
    threats = [
        Threat("T-01", "INFORMATION_DISCLOSURE", "tenant documents", "missing tenant filter exposes another tenant's chunk", 4, 5,
               ("RLS", "vector ACL filter", "tenant-aware cache"), ("cross-tenant negative test",), "security-owner"),
    ]
    findings = validate_architecture(components, flows, threats)
    print("findings:", findings)
    print("approved:", architecture_approved(findings))


if __name__ == "__main__":
    main()
