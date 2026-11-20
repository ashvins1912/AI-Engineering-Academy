from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import set_tenant_context
from .models import IngestionJob


def retry_delay_seconds(attempt: int, base_seconds: int = 5, max_seconds: int = 3600) -> int:
    if attempt < 1 or base_seconds < 1 or max_seconds < base_seconds:
        raise ValueError("invalid retry backoff parameters")
    return min(max_seconds, base_seconds * (2 ** min(attempt - 1, 20)))


async def claim_next_job(session: AsyncSession, tenant_id: UUID, lease_seconds: int = 300) -> dict | None:
    """Claim one tenant-scoped job with SKIP LOCKED; run one worker per tenant scope."""
    if lease_seconds < 30:
        raise ValueError("lease_seconds must be at least 30")
    await set_tenant_context(session, str(tenant_id))
    now = datetime.now(timezone.utc)
    statement = (
        select(IngestionJob)
        .where(
            IngestionJob.tenant_id == tenant_id,
            IngestionJob.attempts < IngestionJob.max_attempts,
            IngestionJob.next_attempt_at <= now,
            or_(IngestionJob.status == "queued",
                (IngestionJob.status == "processing") & (IngestionJob.lease_until < now)),
        )
        .order_by(IngestionJob.created_at.asc())
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    job = await session.scalar(statement)
    if job is None:
        await session.rollback()
        return None
    job.status = "processing"
    job.attempts += 1
    job.lease_until = now + timedelta(seconds=lease_seconds)
    job.error_code = None
    await session.commit()
    return {
        "id": job.id, "tenant_id": job.tenant_id, "owner_id": job.owner_id,
        "object_key": job.object_key, "filename": job.filename,
        "media_type": job.media_type, "sha256": job.sha256,
        "visibility": job.visibility, "attempts": job.attempts,
        "max_attempts": job.max_attempts,
    }


async def mark_job_succeeded(session: AsyncSession, tenant_id: UUID, job_id: UUID, document_id: UUID) -> None:
    await set_tenant_context(session, str(tenant_id))
    job = await session.scalar(select(IngestionJob).where(IngestionJob.id == job_id, IngestionJob.tenant_id == tenant_id))
    if job is None:
        raise LookupError("ingestion job not found")
    job.status = "succeeded"
    job.document_id = document_id
    job.lease_until = None
    job.error_code = None
    job.completed_at = datetime.now(timezone.utc)
    await session.commit()


async def mark_job_failed(session: AsyncSession, tenant_id: UUID, job_id: UUID, attempts: int, max_attempts: int, error_code: str) -> None:
    await set_tenant_context(session, str(tenant_id))
    job = await session.scalar(select(IngestionJob).where(IngestionJob.id == job_id, IngestionJob.tenant_id == tenant_id))
    if job is None:
        raise LookupError("ingestion job not found")
    delay = retry_delay_seconds(max(1, attempts))
    job.status = "dead" if attempts >= max_attempts else "queued"
    job.next_attempt_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
    job.lease_until = None
    job.error_code = error_code[:80]
    await session.commit()
