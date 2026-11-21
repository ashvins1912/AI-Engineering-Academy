"""Offline AI supply-chain policy simulator. No network access or package installation."""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import re
from typing import Iterable


@dataclass(frozen=True)
class Artifact:
    name: str
    kind: str
    content: bytes
    expected_sha256: str
    license_id: str | None
    source: str
    signature_verified: bool
    provenance_verified: bool


@dataclass(frozen=True)
class Decision:
    status: str
    reason: str


@dataclass(frozen=True)
class Dependency:
    name: str
    version: str | None
    severity: str = "NONE"
    vulnerability_id: str | None = None
    pinned: bool = True


@dataclass(frozen=True)
class Policy:
    allowed_licenses: frozenset[str]
    allowed_sources: frozenset[str]
    blocked_licenses: frozenset[str] = frozenset()
    blocked_severities: frozenset[str] = frozenset({"CRITICAL", "HIGH"})


def digest_bytes(content: bytes) -> str:
    return sha256(content).hexdigest()


def verify_artifact(artifact: Artifact, policy: Policy) -> Decision:
    if not artifact.content:
        return Decision("REJECT", "EMPTY_ARTIFACT")
    if digest_bytes(artifact.content) != artifact.expected_sha256:
        return Decision("REJECT", "CHECKSUM_MISMATCH")
    if artifact.source not in policy.allowed_sources:
        return Decision("REJECT", "UNTRUSTED_SOURCE")
    if not artifact.signature_verified:
        return Decision("REJECT", "SIGNATURE_UNVERIFIED")
    if not artifact.provenance_verified:
        return Decision("REJECT", "PROVENANCE_MISSING")
    if artifact.license_id is None or artifact.license_id == "UNKNOWN":
        return Decision("HOLD", "LICENSE_REVIEW")
    if artifact.license_id in policy.blocked_licenses:
        return Decision("HOLD", "LICENSE_REVIEW")
    if artifact.license_id not in policy.allowed_licenses:
        return Decision("HOLD", "LICENSE_REVIEW")
    return Decision("ALLOW", "VERIFIED")


def verify_dependencies(dependencies: Iterable[Dependency], policy: Policy) -> Decision:
    items = list(dependencies)
    if not items:
        return Decision("HOLD", "EMPTY_DEPENDENCY_INVENTORY")
    for dependency in items:
        if not dependency.name or not dependency.version or not dependency.pinned:
            return Decision("HOLD", "DEPENDENCY_NOT_PINNED")
        severity = dependency.severity.upper()
        if severity in policy.blocked_severities:
            return Decision("REJECT", f"VULNERABILITY_{severity}")
    return Decision("ALLOW", "DEPENDENCIES_ACCEPTED")


SECRET_PATTERNS = (
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    re.compile(r"\bsk_live_[A-Za-z0-9]{12,}\b"),
    re.compile(r"(?i)(password|api[_-]?key|secret)\s*[:=]\s*[^\s,;]+"),
)


def find_secret_patterns(text: str) -> list[str]:
    return [pattern.pattern for pattern in SECRET_PATTERNS if pattern.search(text)]


def redact_secrets(text: str) -> str:
    redacted = text
    redacted = re.sub(r"\bAKIA[0-9A-Z]{16}\b", "[REDACTED_AWS_KEY]", redacted)
    redacted = re.sub(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b", "[REDACTED_GITHUB_TOKEN]", redacted)
    redacted = re.sub(r"\bsk_live_[A-Za-z0-9]{12,}\b", "[REDACTED_API_KEY]", redacted)
    redacted = re.sub(r"(?i)(password|api[_-]?key|secret)(\s*[:=]\s*)[^\s,;]+", r"\1\2[REDACTED]", redacted)
    return redacted


def release_decision(artifacts: Iterable[Artifact], dependencies: Iterable[Dependency], policy: Policy) -> Decision:
    artifact_list = list(artifacts)
    if not artifact_list:
        return Decision("HOLD", "EMPTY_ARTIFACT_INVENTORY")
    for artifact in artifact_list:
        decision = verify_artifact(artifact, policy)
        if decision.status != "ALLOW":
            return decision
    dependency_decision = verify_dependencies(dependencies, policy)
    if dependency_decision.status != "ALLOW":
        return dependency_decision
    return Decision("ALLOW", "RELEASE_READY")


def main() -> None:
    policy = Policy(
        allowed_licenses=frozenset({"MIT", "Apache-2.0", "BSD-3-Clause"}),
        allowed_sources=frozenset({"registry.example/model-team", "registry.example/data-team"}),
    )
    content = b"synthetic-model-weights-v1"
    artifact = Artifact(
        "demo-model", "weights", content,
        "cef1c26752c9621b897302ebb87978b22c726fe349b707f42ce675a8b2a2e4cc",
        "Apache-2.0", "registry.example/model-team", True, True,
    )
    print("artifact:", verify_artifact(artifact, policy))
    print("digest:", digest_bytes(content))
    print("log scan:", find_secret_patterns("build complete; token=ghp_" + "A" * 24))


if __name__ == "__main__":
    main()
