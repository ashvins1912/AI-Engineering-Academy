"""Offline enterprise AI governance, evidence and lifecycle policy simulator."""
from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
import json
import re
from typing import Any


REQUIRED_ARTIFACTS = {
    "model_card", "dataset_card", "risk_assessment", "privacy_review",
    "security_review", "evaluation_report", "retention_schedule",
    "third_party_inventory",
}
REQUIRED_APPROVAL_ROLES = {
    "privacy_review": "privacy_officer",
    "security_review": "security_reviewer",
    "risk_assessment": "risk_owner",
    "evaluation_report": "evaluation_owner",
    "retention_schedule": "data_owner",
}


@dataclass(frozen=True)
class ReleaseManifest:
    release_id: str
    model_version: str
    dataset_version: str
    prompt_version: str
    index_version: str
    code_digest: str


@dataclass(frozen=True)
class GovernanceArtifact:
    artifact_id: str
    artifact_type: str
    version: str
    owner: str
    source_ref: str
    sha256_digest: str
    created_at: int
    expires_at: int | None = None
    bound_versions: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class Approval:
    approval_id: str
    artifact_type: str
    artifact_version: str
    reviewer: str
    role: str
    decision: str
    expires_at: int
    signature_verified: bool


@dataclass(frozen=True)
class RiskItem:
    risk_id: str
    severity: str
    status: str
    description: str
    owner: str | None
    mitigation: str | None = None
    test_evidence: str | None = None
    accepted_by: str | None = None


@dataclass(frozen=True)
class DataAsset:
    asset_id: str
    classification: str
    contains_personal_data: bool
    consent_recorded: bool
    retention_days: int
    collected_at: int
    deletion_requested_at: int | None = None
    deleted_at: int | None = None
    cross_border_transfer: bool = False
    transfer_mechanism_approved: bool = False
    provenance_ref: str | None = None


@dataclass(frozen=True)
class GovernanceDossier:
    manifest: ReleaseManifest
    artifacts: tuple[GovernanceArtifact, ...]
    approvals: tuple[Approval, ...]
    risks: tuple[RiskItem, ...]
    data_assets: tuple[DataAsset, ...]
    jurisdiction: str
    legal_review_reference: str | None
    high_risk_system: bool = False


@dataclass(frozen=True)
class GateDecision:
    passed: bool
    reasons: tuple[str, ...]
    evidence_count: int


def _valid_digest(value: str) -> bool:
    return bool(re.fullmatch(r"[a-f0-9]{64}", value))


def validate_dossier(dossier: GovernanceDossier, *, now: int) -> GateDecision:
    reasons: list[str] = []
    manifest = dossier.manifest
    if not all((manifest.release_id, manifest.model_version, manifest.dataset_version,
                manifest.prompt_version, manifest.index_version)):
        reasons.append("RELEASE_MANIFEST_INCOMPLETE")
    if not _valid_digest(manifest.code_digest):
        reasons.append("RELEASE_CODE_DIGEST_INVALID")
    if not dossier.jurisdiction.strip():
        reasons.append("JURISDICTION_CONTEXT_REQUIRED")
    if not dossier.legal_review_reference:
        reasons.append("JURISDICTION_LEGAL_REVIEW_MISSING")

    artifacts_by_type: dict[str, GovernanceArtifact] = {}
    for artifact in dossier.artifacts:
        if artifact.artifact_type in artifacts_by_type:
            reasons.append(f"DUPLICATE_ARTIFACT:{artifact.artifact_type}")
            continue
        artifacts_by_type[artifact.artifact_type] = artifact
        if not artifact.owner or not artifact.version or not artifact.source_ref:
            reasons.append(f"ARTIFACT_PROVENANCE_INCOMPLETE:{artifact.artifact_type}")
        if not _valid_digest(artifact.sha256_digest):
            reasons.append(f"ARTIFACT_DIGEST_INVALID:{artifact.artifact_type}")
        if artifact.created_at > now:
            reasons.append(f"ARTIFACT_CREATED_IN_FUTURE:{artifact.artifact_type}")
        if artifact.expires_at is not None and artifact.expires_at <= now:
            reasons.append(f"ARTIFACT_EXPIRED:{artifact.artifact_type}")
        expected = {
            "model": manifest.model_version,
            "dataset": manifest.dataset_version,
            "prompt": manifest.prompt_version,
            "index": manifest.index_version,
        }
        if set(artifact.bound_versions) != set(expected):
            reasons.append(f"ARTIFACT_VERSION_BINDING_INCOMPLETE:{artifact.artifact_type}")
        for key, value in artifact.bound_versions.items():
            if key in expected and value != expected[key]:
                reasons.append(f"ARTIFACT_VERSION_MISMATCH:{artifact.artifact_type}:{key}")
    for required in sorted(REQUIRED_ARTIFACTS - set(artifacts_by_type)):
        reasons.append(f"REQUIRED_ARTIFACT_MISSING:{required}")

    approvals_by_type: dict[str, list[Approval]] = {}
    for approval in dossier.approvals:
        approvals_by_type.setdefault(approval.artifact_type, []).append(approval)
        artifact = artifacts_by_type.get(approval.artifact_type)
        if not approval.reviewer:
            reasons.append(f"APPROVAL_REVIEWER_MISSING:{approval.artifact_type}")
        if artifact is None or artifact.version != approval.artifact_version:
            reasons.append(f"APPROVAL_ARTIFACT_BINDING_MISMATCH:{approval.artifact_type}")
        if approval.decision != "approved":
            reasons.append(f"APPROVAL_NOT_GRANTED:{approval.artifact_type}")
        if approval.expires_at <= now:
            reasons.append(f"APPROVAL_EXPIRED:{approval.artifact_type}")
        if not approval.signature_verified:
            reasons.append(f"APPROVAL_SIGNATURE_INVALID:{approval.artifact_type}")
        expected_role = REQUIRED_APPROVAL_ROLES.get(approval.artifact_type)
        if expected_role and approval.role != expected_role:
            is_additional_human_oversight = (
                approval.artifact_type == "risk_assessment" and approval.role == "human_oversight"
            )
            if not is_additional_human_oversight:
                reasons.append(f"APPROVAL_ROLE_INVALID:{approval.artifact_type}")
    for artifact_type, role in REQUIRED_APPROVAL_ROLES.items():
        if artifact_type in artifacts_by_type and not any(
            item.role == role and item.decision == "approved" and item.expires_at > now
            and item.signature_verified and item.artifact_version == artifacts_by_type[artifact_type].version
            for item in approvals_by_type.get(artifact_type, [])
        ):
            reasons.append(f"REQUIRED_APPROVAL_MISSING:{artifact_type}:{role}")
    if dossier.high_risk_system and not any(
        item.role == "human_oversight" and item.decision == "approved"
        and item.expires_at > now and item.signature_verified
        for item in dossier.approvals
    ):
        reasons.append("HIGH_RISK_HUMAN_OVERSIGHT_APPROVAL_MISSING")

    for risk in dossier.risks:
        if risk.severity not in {"low", "medium", "high", "critical"}:
            reasons.append(f"RISK_SEVERITY_INVALID:{risk.risk_id}")
        if not risk.owner:
            reasons.append(f"RISK_OWNER_MISSING:{risk.risk_id}")
        if risk.severity in {"high", "critical"}:
            if risk.status not in {"mitigated", "accepted"}:
                reasons.append(f"UNRESOLVED_HIGH_RISK:{risk.risk_id}")
            if not risk.mitigation or not risk.test_evidence:
                reasons.append(f"HIGH_RISK_EVIDENCE_MISSING:{risk.risk_id}")
            if risk.status == "accepted" and not risk.accepted_by:
                reasons.append(f"RISK_ACCEPTANCE_OWNER_MISSING:{risk.risk_id}")

    for asset in dossier.data_assets:
        if asset.classification not in {"public", "internal", "confidential", "restricted"}:
            reasons.append(f"DATA_CLASSIFICATION_INVALID:{asset.asset_id}")
        if asset.retention_days <= 0 or asset.collected_at > now:
            reasons.append(f"DATA_LIFECYCLE_POLICY_INVALID:{asset.asset_id}")
        if asset.contains_personal_data and not asset.consent_recorded:
            reasons.append(f"PERSONAL_DATA_CONSENT_MISSING:{asset.asset_id}")
        if asset.contains_personal_data and not asset.provenance_ref:
            reasons.append(f"PERSONAL_DATA_PROVENANCE_MISSING:{asset.asset_id}")
        if asset.deletion_requested_at is not None and asset.deletion_requested_at > now:
            reasons.append(f"DATA_DELETION_REQUEST_IN_FUTURE:{asset.asset_id}")
        if asset.deleted_at is not None and asset.deleted_at > now:
            reasons.append(f"DATA_DELETION_TIMESTAMP_IN_FUTURE:{asset.asset_id}")
        if asset.deletion_requested_at is not None:
            if asset.deleted_at is None or asset.deleted_at < asset.deletion_requested_at:
                reasons.append(f"DATA_DELETION_PENDING:{asset.asset_id}")
        if now > asset.collected_at + asset.retention_days * 86400 and asset.deleted_at is None:
            reasons.append(f"DATA_RETENTION_EXPIRED:{asset.asset_id}")
        if asset.cross_border_transfer and not asset.transfer_mechanism_approved:
            reasons.append(f"CROSS_BORDER_TRANSFER_REVIEW_MISSING:{asset.asset_id}")

    return GateDecision(not reasons, tuple(sorted(set(reasons))), len(artifacts_by_type) + len(dossier.approvals))


class AuditLedger:
    """Append-only hash chain for teaching tamper evidence, not a signature service."""
    def __init__(self):
        self.events: list[dict[str, Any]] = []

    def append(self, event_id: str, timestamp: int, actor: str, action: str,
               payload: dict[str, Any]) -> str:
        previous = self.events[-1]["hash"] if self.events else "GENESIS"
        body = {
            "event_id": event_id, "timestamp": timestamp, "actor": actor,
            "action": action, "payload": payload, "previous_hash": previous,
        }
        digest = sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        self.events.append({**body, "hash": digest})
        return digest

    def verify(self) -> bool:
        previous = "GENESIS"
        for event in self.events:
            body = {key: event[key] for key in
                    ("event_id", "timestamp", "actor", "action", "payload", "previous_hash")}
            expected = sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
            if event["previous_hash"] != previous or event["hash"] != expected:
                return False
            previous = event["hash"]
        return True


class LifecycleManager:
    TRANSITIONS = {
        "draft": {"submit": "review"},
        "review": {"approve": "approved", "reject": "rejected"},
        "approved": {"release": "released", "withdraw": "withdrawn"},
        "released": {"retire": "retired", "suspend": "suspended"},
        "suspended": {"reinstate": "released", "retire": "retired"},
        "rejected": {"revise": "draft"},
        "withdrawn": {"revise": "draft"},
        "retired": {},
    }

    def __init__(self, state: str = "draft"):
        if state not in self.TRANSITIONS:
            raise ValueError("LIFECYCLE_STATE_INVALID")
        self.state = state

    def transition(self, action: str) -> str:
        next_state = self.TRANSITIONS[self.state].get(action)
        if next_state is None:
            raise ValueError(f"LIFECYCLE_TRANSITION_INVALID:{self.state}:{action}")
        self.state = next_state
        return self.state


def demo() -> None:
    now = 1_800_000_000
    digest = sha256(b"synthetic artifact").hexdigest()
    manifest = ReleaseManifest("release-12", "model-v3", "dataset-v4", "prompt-v2", "index-v5", digest)
    types = sorted(REQUIRED_ARTIFACTS)
    artifacts = tuple(GovernanceArtifact(
        f"artifact-{kind}", kind, "v1", "owner", f"synthetic://{kind}", digest, now - 10,
        bound_versions={"model": "model-v3", "dataset": "dataset-v4",
                        "prompt": "prompt-v2", "index": "index-v5"},
    ) for kind in types)
    approvals = tuple(Approval(
        f"approval-{kind}", kind, "v1", f"{kind}-reviewer",
        REQUIRED_APPROVAL_ROLES[kind], "approved", now + 1000, True,
    ) for kind in REQUIRED_APPROVAL_ROLES)
    dossier = GovernanceDossier(
        manifest, artifacts, approvals, (), (), "jurisdiction-A",
        "legal-review-reference", high_risk_system=False,
    )
    decision = validate_dossier(dossier, now=now)
    print(f"governance-gate={'PASS' if decision.passed else 'BLOCK'} evidence={decision.evidence_count}")
    if not decision.passed:
        print("reasons:", ", ".join(decision.reasons))
        raise SystemExit(1)


if __name__ == "__main__":
    demo()
