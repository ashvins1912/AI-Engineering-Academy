"""Deterministic multi-tenant isolation simulator; no network or external services."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable
import re


@dataclass(frozen=True)
class Principal:
    subject_id: str
    tenant_id: str
    scopes: frozenset[str]


@dataclass(frozen=True)
class Record:
    external_id: str
    tenant_id: str
    owner_id: str
    body: str
    version: int = 1


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str


@dataclass(frozen=True)
class Job:
    job_id: str
    actor_id: str
    tenant_id: str
    resource_id: str
    operation: str


class TenantStore:
    """Models composite tenant/resource addressing and fail-closed authorization."""

    def __init__(self, records: Iterable[Record] = ()):
        self._records = {(r.tenant_id, r.external_id): r for r in records}

    def get(self, principal: Principal | None, external_id: str) -> Record:
        if principal is None or not principal.tenant_id:
            raise PermissionError("MISSING_TENANT_CONTEXT")
        record = self._records.get((principal.tenant_id, external_id))
        if record is None:
            raise PermissionError("RESOURCE_NOT_FOUND_IN_TENANT")
        return record

    def list_records(self, principal: Principal | None) -> list[Record]:
        if principal is None or not principal.tenant_id:
            raise PermissionError("MISSING_TENANT_CONTEXT")
        return [r for (tenant, _), r in self._records.items() if tenant == principal.tenant_id]

    def update(self, principal: Principal | None, external_id: str, body: str) -> Record:
        if principal is None or "documents:write" not in principal.scopes:
            raise PermissionError("MISSING_WRITE_SCOPE")
        current = self.get(principal, external_id)
        updated = Record(current.external_id, current.tenant_id, current.owner_id, body, current.version + 1)
        self._records[(current.tenant_id, current.external_id)] = updated
        return updated


class TenantVectorIndex:
    def __init__(self, chunks: Iterable[dict]):
        self._chunks = list(chunks)

    def search(self, principal: Principal | None, query_terms: set[str], top_k: int = 5) -> list[dict]:
        if principal is None or not principal.tenant_id:
            raise PermissionError("MISSING_TENANT_CONTEXT")
        if top_k < 1:
            raise ValueError("INVALID_TOP_K")
        # Mandatory tenant filtering happens before ranking and top-k.
        eligible = [c for c in self._chunks if c["tenant_id"] == principal.tenant_id]
        ranked = sorted(
            eligible,
            key=lambda c: len(query_terms.intersection(set(c["text"].lower().split()))),
            reverse=True,
        )
        return ranked[:top_k]


class TenantCache:
    def __init__(self):
        self._values: dict[str, str] = {}

    @staticmethod
    def key(principal: Principal | None, resource_id: str) -> str:
        if principal is None or not principal.tenant_id:
            raise PermissionError("MISSING_TENANT_CONTEXT")
        if not resource_id or ":" in resource_id:
            raise ValueError("INVALID_RESOURCE_ID")
        return f"tenant:{principal.tenant_id}:document:{resource_id}"

    def put(self, principal: Principal, resource_id: str, value: str) -> None:
        self._values[self.key(principal, resource_id)] = value

    def get(self, principal: Principal, resource_id: str) -> str | None:
        return self._values.get(self.key(principal, resource_id))


def object_key(principal: Principal | None, resource_id: str, filename: str) -> str:
    if principal is None or not principal.tenant_id:
        raise PermissionError("MISSING_TENANT_CONTEXT")
    if not resource_id or not re.fullmatch(r"[A-Za-z0-9_-]+", resource_id):
        raise ValueError("INVALID_RESOURCE_ID")
    if not filename or "/" in filename or "\\" in filename or filename in {".", ".."}:
        raise ValueError("INVALID_OBJECT_NAME")
    return f"tenants/{principal.tenant_id}/documents/{resource_id}/{filename}"


def verify_job(job: Job, memberships: dict[str, set[str]], records: TenantStore) -> Decision:
    if not job.tenant_id or not job.actor_id:
        return Decision(False, "MISSING_JOB_IDENTITY")
    if job.tenant_id not in memberships.get(job.actor_id, set()):
        return Decision(False, "TENANT_CONTEXT_MISMATCH")
    try:
        principal = Principal(job.actor_id, job.tenant_id, frozenset({"documents:read", "documents:write"}))
        records.get(principal, job.resource_id)
    except PermissionError:
        return Decision(False, "RESOURCE_NOT_FOUND_IN_TENANT")
    if job.operation not in {"document.read", "document.index"}:
        return Decision(False, "UNKNOWN_JOB_OPERATION")
    return Decision(True, "ALLOW")


class TransactionTenantContext:
    """Small model of transaction-local context with guaranteed reset."""

    def __init__(self):
        self._tenant: str | None = None

    @property
    def tenant_id(self) -> str | None:
        return self._tenant

    def transaction(self, tenant_id: str):
        return _TenantTransaction(self, tenant_id)


class _TenantTransaction:
    def __init__(self, context: TransactionTenantContext, tenant_id: str):
        self.context = context
        self.tenant_id = tenant_id
        self.previous: str | None = None

    def __enter__(self):
        if not self.tenant_id:
            raise PermissionError("MISSING_TENANT_CONTEXT")
        self.previous = self.context._tenant
        self.context._tenant = self.tenant_id
        return self

    def __exit__(self, exc_type, exc, tb):
        self.context._tenant = self.previous
        return False


def main() -> None:
    a = Principal("user-A", "tenant-A", frozenset({"documents:read", "documents:write"}))
    b = Principal("user-B", "tenant-B", frozenset({"documents:read", "documents:write"}))
    store = TenantStore([
        Record("invoice-7", "tenant-A", "user-A", "Quarterly plan"),
        Record("invoice-7", "tenant-B", "user-B", "Acquisition plan"),
    ])
    print("tenant A:", store.get(a, "invoice-7").body)
    print("tenant B:", store.get(b, "invoice-7").body)
    print("cache keys isolated:", TenantCache.key(a, "invoice-7") != TenantCache.key(b, "invoice-7"))
    forged = Job("job-9", "user-A", "tenant-B", "invoice-7", "document.index")
    print("forged job:", verify_job(forged, {"user-A": {"tenant-A"}}, store).reason)


if __name__ == "__main__":
    main()
