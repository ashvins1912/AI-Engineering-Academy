"""Deterministic tool authorization and sandbox-policy simulator.

This module does NOT execute untrusted code or open network connections.
It models the checks a production policy enforcement point must perform.
"""
from __future__ import annotations
from dataclasses import dataclass
from hashlib import sha256
from ipaddress import ip_address
from pathlib import PurePosixPath
from typing import Any

@dataclass(frozen=True)
class Principal:
    subject: str
    tenant_id: str
    scopes: frozenset[str]

@dataclass(frozen=True)
class Resource:
    resource_id: str
    owner_id: str
    tenant_id: str

@dataclass(frozen=True)
class Request:
    tool: str
    action: str
    resource_id: str
    arguments: dict[str, Any]
    idempotency_key: str | None = None

@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str
    argument_digest: str = ""

TOOL_SCHEMAS = {
    ("report.read", "read"): {"resource_id"},
    ("report.write", "write"): {"resource_id", "content"},
    ("sandbox.run", "execute"): {"resource_id", "script"},
}
REQUIRED_SCOPES = {
    ("report.read", "read"): "reports:read",
    ("report.write", "write"): "reports:write",
    ("sandbox.run", "execute"): "sandbox:execute",
}
BLOCKED_HOSTS = {"localhost", "metadata.google.internal", "169.254.169.254"}

def _canonical_digest(request: Request) -> str:
    material = repr((request.tool, request.action, request.resource_id,
                     sorted(request.arguments.items()))).encode()
    return sha256(material).hexdigest()

def authorize(principal: Principal | None, request: Request,
              resource: Resource | None, *, approved: bool = False,
              capability_expiry_seconds: int = 60,
              budget_remaining: int = 1) -> Decision:
    """Fail-closed PDP. The PEP must call this immediately before execution."""
    if principal is None or resource is None:
        return Decision(False, "MISSING_IDENTITY_OR_RESOURCE")
    key = (request.tool, request.action)
    if key not in TOOL_SCHEMAS:
        return Decision(False, "UNKNOWN_TOOL_OR_ACTION")
    if set(request.arguments) != TOOL_SCHEMAS[key]:
        return Decision(False, "ARGUMENT_SCHEMA_MISMATCH")
    if request.arguments.get("resource_id") != request.resource_id:
        return Decision(False, "RESOURCE_ARGUMENT_MISMATCH")
    if capability_expiry_seconds <= 0:
        return Decision(False, "CAPABILITY_EXPIRED")
    if budget_remaining <= 0:
        return Decision(False, "BUDGET_EXHAUSTED")
    scope = REQUIRED_SCOPES[key]
    if scope not in principal.scopes:
        return Decision(False, "MISSING_SCOPE")
    if principal.tenant_id != resource.tenant_id:
        return Decision(False, "TENANT_MISMATCH")
    if principal.subject != resource.owner_id:
        return Decision(False, "RESOURCE_NOT_OWNED")
    if request.action in {"write", "execute"} and not approved:
        return Decision(False, "APPROVAL_REQUIRED")
    return Decision(True, "ALLOW", _canonical_digest(request))

def enforce(principal: Principal | None, request: Request,
            resource: Resource | None, adapter, **context):
    """PEP: the adapter is never called when policy denies."""
    decision = authorize(principal, request, resource, **context)
    if not decision.allowed:
        return decision, None
    return decision, adapter(request)

def safe_workspace_path(root: str, candidate: str) -> bool:
    """Lexically constrain a POSIX path; production must also defend symlink races."""
    if not candidate or candidate.startswith("/") or "\\\\" in candidate:
        return False
    parts = PurePosixPath(candidate).parts
    if any(part in {"..", "."} for part in parts):
        return False
    normalized_root = PurePosixPath(root)
    resolved = normalized_root.joinpath(*parts)
    return resolved == normalized_root or normalized_root in resolved.parents

def network_target_allowed(host: str, resolved_ips: list[str], allowed_hosts: set[str]) -> bool:
    """Reject private, loopback, link-local and metadata destinations by default."""
    if host.lower() in BLOCKED_HOSTS or host.lower() not in {h.lower() for h in allowed_hosts}:
        return False
    if not resolved_ips:
        return False
    for raw in resolved_ips:
        try:
            address = ip_address(raw)
        except ValueError:
            return False
        if (address.is_private or address.is_loopback or address.is_link_local
                or address.is_reserved or address.is_multicast or address.is_unspecified):
            return False
    return True

class IdempotencyLedger:
    def __init__(self):
        self._entries: dict[str, tuple[str, Any]] = {}
    def apply_once(self, key: str, payload_digest: str, operation):
        if not key:
            raise ValueError("IDEMPOTENCY_KEY_REQUIRED")
        if key in self._entries:
            old_digest, result = self._entries[key]
            if old_digest != payload_digest:
                raise ValueError("IDEMPOTENCY_PAYLOAD_MISMATCH")
            return result, False
        result = operation()
        self._entries[key] = (payload_digest, result)
        return result, True

def sandbox_budget_ok(*, cpu_seconds: float, memory_mb: int,
                      wall_seconds: float, process_count: int) -> bool:
    """A policy simulation only; production limits must be enforced by the OS."""
    return (0 < cpu_seconds <= 2 and 0 < memory_mb <= 128
            and 0 < wall_seconds <= 5 and 0 < process_count <= 4)

def demo() -> None:
    user = Principal("user-17", "tenant-A", frozenset({"reports:read"}))
    report_a = Resource("report-A", "user-17", "tenant-A")
    report_b = Resource("report-B", "user-22", "tenant-A")
    read = Request("report.read", "read", "report-A", {"resource_id": "report-A"})
    write_other = Request("report.write", "write", "report-B",
                          {"resource_id": "report-B", "content": "tampered"})
    for request, resource in ((read, report_a), (write_other, report_b)):
        result = authorize(user, request, resource, approved=True)
        print(f"{request.tool} {request.resource_id}: {result.reason}")

if __name__ == "__main__":
    demo()
