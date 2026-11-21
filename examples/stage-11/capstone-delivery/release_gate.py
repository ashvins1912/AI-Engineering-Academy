"""Offline release, migration, canary and recovery policy simulator."""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
import re
from typing import Iterable


DIGEST = re.compile(r"^sha256:[0-9a-f]{64}$")
COMMIT = re.compile(r"^[0-9a-f]{40}$")


@dataclass(frozen=True)
class ReleaseBundle:
    release_id: str
    code_commit: str
    image_digest: str
    model_digest: str
    prompt_version: str
    index_version: str
    schema_version: str
    api_contract_version: str
    evaluation_passed: bool
    security_passed: bool
    sbom_verified: bool
    provenance_verified: bool
    signature_verified: bool
    migration_compatible: bool
    rollback_release_id: str | None


@dataclass(frozen=True)
class CanaryMetrics:
    sample_size: int
    error_rate: float
    p95_ms: int
    quality_score: float
    cost_per_success: float


@dataclass(frozen=True)
class CanaryThresholds:
    min_sample_size: int = 1000
    max_error_rate: float = 0.005
    max_p95_ms: int = 2000
    min_quality_score: float = 0.90
    max_cost_per_success: float = 0.05


@dataclass(frozen=True)
class Decision:
    action: str
    target_release: str
    reasons: tuple[str, ...]


@dataclass(frozen=True)
class Migration:
    name: str
    phase: str
    backward_compatible: bool
    old_instances_active: bool
    data_verified: bool


@dataclass(frozen=True)
class BackupSnapshot:
    snapshot_id: str
    digest: str
    restore_tested: bool
    tenant_integrity_verified: bool
    rpo_minutes: int
    rto_minutes: int


def validate_release(bundle: ReleaseBundle) -> tuple[str, ...]:
    findings = []
    if not bundle.release_id or not COMMIT.fullmatch(bundle.code_commit):
        findings.append("INVALID_RELEASE_ID_OR_COMMIT")
    if not DIGEST.fullmatch(bundle.image_digest):
        findings.append("INVALID_IMAGE_DIGEST")
    if not DIGEST.fullmatch(bundle.model_digest):
        findings.append("INVALID_MODEL_DIGEST")
    for name, value in (
        ("PROMPT_VERSION_MISSING", bundle.prompt_version),
        ("INDEX_VERSION_MISSING", bundle.index_version),
        ("SCHEMA_VERSION_MISSING", bundle.schema_version),
        ("API_CONTRACT_VERSION_MISSING", bundle.api_contract_version),
    ):
        if not value:
            findings.append(name)
    for field_name, passed in (
        ("EVALUATION_FAILED", bundle.evaluation_passed),
        ("SECURITY_FAILED", bundle.security_passed),
        ("SBOM_UNVERIFIED", bundle.sbom_verified),
        ("PROVENANCE_UNVERIFIED", bundle.provenance_verified),
        ("SIGNATURE_UNVERIFIED", bundle.signature_verified),
        ("MIGRATION_INCOMPATIBLE", bundle.migration_compatible),
    ):
        if not passed:
            findings.append(field_name)
    if not bundle.rollback_release_id or bundle.rollback_release_id == bundle.release_id:
        findings.append("ROLLBACK_BUNDLE_MISSING")
    return tuple(findings)


def evaluate_canary(metrics: CanaryMetrics, thresholds: CanaryThresholds) -> tuple[str, ...]:
    failures = []
    if metrics.sample_size < thresholds.min_sample_size:
        failures.append("INSUFFICIENT_SAMPLE_SIZE")
    if not 0 <= metrics.error_rate <= 1 or metrics.error_rate > thresholds.max_error_rate:
        failures.append("ERROR_RATE_THRESHOLD_BREACHED")
    if metrics.p95_ms < 0 or metrics.p95_ms > thresholds.max_p95_ms:
        failures.append("LATENCY_THRESHOLD_BREACHED")
    if not 0 <= metrics.quality_score <= 1 or metrics.quality_score < thresholds.min_quality_score:
        failures.append("QUALITY_THRESHOLD_BREACHED")
    if metrics.cost_per_success < 0 or metrics.cost_per_success > thresholds.max_cost_per_success:
        failures.append("COST_THRESHOLD_BREACHED")
    return tuple(failures)


def rollout(candidate: ReleaseBundle, current: ReleaseBundle, metrics: CanaryMetrics, thresholds: CanaryThresholds) -> Decision:
    release_findings = validate_release(candidate)
    if release_findings:
        return Decision("REJECT", current.release_id, release_findings)
    canary_findings = evaluate_canary(metrics, thresholds)
    if canary_findings:
        return Decision("ROLLBACK", current.release_id, canary_findings)
    return Decision("PROMOTE", candidate.release_id, ())


def validate_migration(migration: Migration) -> Decision:
    if migration.phase not in {"expand", "backfill", "switch", "drain", "contract"}:
        return Decision("BLOCK", "UNKNOWN_MIGRATION_PHASE")
    if migration.phase in {"expand", "backfill", "switch"} and not migration.backward_compatible:
        return Decision("BLOCK", "MIGRATION_NOT_BACKWARD_COMPATIBLE")
    if migration.phase == "backfill" and not migration.data_verified:
        return Decision("BLOCK", "BACKFILL_NOT_VERIFIED")
    if migration.phase == "contract" and migration.old_instances_active:
        return Decision("BLOCK", "OLD_INSTANCES_STILL_ACTIVE")
    if migration.phase == "contract" and not migration.data_verified:
        return Decision("BLOCK", "CONTRACT_REQUIRES_VERIFIED_DATA")
    return Decision("ALLOW", "MIGRATION_PHASE_ALLOWED")


def validate_backup(snapshot: BackupSnapshot, max_rpo_minutes: int, max_rto_minutes: int) -> Decision:
    if not snapshot.snapshot_id or not DIGEST.fullmatch(snapshot.digest):
        return Decision("BLOCK", "BACKUP_ID_OR_DIGEST_INVALID")
    if not snapshot.restore_tested:
        return Decision("BLOCK", "RESTORE_NOT_TESTED")
    if not snapshot.tenant_integrity_verified:
        return Decision("BLOCK", "TENANT_INTEGRITY_FAILED")
    if snapshot.rpo_minutes < 0 or snapshot.rto_minutes < 0:
        return Decision("BLOCK", "INVALID_RECOVERY_OBJECTIVES")
    if snapshot.rpo_minutes > max_rpo_minutes or snapshot.rto_minutes > max_rto_minutes:
        return Decision("BLOCK", "RECOVERY_OBJECTIVE_BREACHED")
    return Decision("ALLOW", "BACKUP_RESTORE_VERIFIED")


def manifest_digest(bundle: ReleaseBundle) -> str:
    canonical = json.dumps(bundle.__dict__, sort_keys=True, separators=(",", ":"))
    return "sha256:" + sha256(canonical.encode("utf-8")).hexdigest()


def main() -> None:
    digest = "sha256:" + "a" * 64
    current = ReleaseBundle("release-10", "1" * 40, digest, digest, "prompt-4", "index-7", "schema-3", "api-v2",
                            True, True, True, True, True, True, "release-9")
    candidate = ReleaseBundle("release-11", "2" * 40, digest, digest, "prompt-5", "index-8", "schema-4", "api-v3",
                              True, True, True, True, True, True, "release-10")
    canary = CanaryMetrics(2000, 0.01, 1700, 0.92, 0.018)
    print("candidate findings:", validate_release(candidate))
    print("rollout:", rollout(candidate, current, canary, CanaryThresholds()))
    print("manifest:", manifest_digest(candidate))


if __name__ == "__main__":
    main()
