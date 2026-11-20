from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from .db import set_tenant_context
from .models import IngestionJob


def retry_delay_seconds(attempt: int, base_seconds: int = 5, max_seconds: int = 3600) -> int:
    if attempt < 1 or base_seconds < 1 or max_seconds < base_seconds:
        raise ValueError("invalid retry backoff parameters")
    return min(max_seconds, base_seconds * (2 ** min(attempt - 1, 20)))


def can_claim_job(active_jobs: int, max_concurrent_jobs: int) -> bool:
    if active_jobs < 0 or max_concurrent_jobs < 1:
        raise ValueError("active_jobs must be non-negative and concurrency limit positive")
    return active_jobs < max_concurrent_jobs


async def claim_next_job(
    session: AsyncSession,
    tenant_id: UUID,
    lease_seconds: int = 300,
    max_concurrent_jobs: int = 1,
) -> dict | None:
    """Claim one job while serializing tenant quota checks across worker processes."""
    if lease_seconds < 30:
        raise ValueError("lease_seconds must be at least 30")
    if max_concurrent_jobs < 1:
        raise ValueError("max_concurrent_jobs must be positive")
    await set_tenant_context(session, str(tenant_id))
    # A transaction-scoped advisory lock makes the count-and-claim operation atomic
    # across independent worker processes for the same tenant. Hash collisions only
    # serialize unrelated tenants; they cannot weaken tenant isolation.
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:tenant_id, 0))"),
        {"tenant_id": str(tenant_id)},
    )
    now = datetime.now(timezone.utc)
    await session.execute(
        update(IngestionJob)
        .where(
            IngestionJob.tenant_id == tenant_id,
            IngestionJob.status == "processing",
            IngestionJob.lease_until < now,
            IngestionJob.attempts >= IngestionJob.max_attempts,
        )
        .values(status="dead", lease_until=None, error_code="lease_expired_max_attempts", completed_at=now)
    )
    active_jobs = await session.scalar(
        select(func.count(IngestionJob.id)).where(
            IngestionJob.tenant_id == tenant_id,
            IngestionJob.status == "processing",
            IngestionJob.lease_until > now,
        )
    ) or 0
    if not can_claim_job(active_jobs, max_concurrent_jobs):
        await session.rollback()
        return None
    statement = (
        select(IngestionJob)
        .where(
            IngestionJob.tenant_id == tenant_id,
            IngestionJob.attempts < IngestionJob.max_attempts,
            IngestionJob.next_attempt_at <= now,
            or_(
                IngestionJob.status == "queued",
                (IngestionJob.status == "processing") & (IngestionJob.lease_until < now),
            ),
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


async def cancel_queued_job(
    session: AsyncSession,
    tenant_id: UUID,
    job_id: UUID,
    owner_id: UUID,
    is_admin: bool = False,
) -> dict:
    """Cancel only queued jobs; processing jobs cannot be safely interrupted mid-parser."""
    await set_tenant_context(session, str(tenant_id))
    statement = select(IngestionJob).where(
        IngestionJob.id == job_id,
        IngestionJob.tenant_id == tenant_id,
    )
    if not is_admin:
        statement = statement.where(IngestionJob.owner_id == owner_id)
    job = await session.scalar(statement.with_for_update())
    if job is None:
        raise LookupError("ingestion job not found")
    if job.status == "cancelled":
        await session.rollback()
        return {"object_key": job.object_key, "changed": False}
    if job.status != "queued":
        await session.rollback()
        raise ValueError("only queued ingestion jobs can be cancelled")
    job.status = "cancelled"
    job.lease_until = None
    job.completed_at = datetime.now(timezone.utc)
    await session.commit()
    return {"object_key": job.object_key, "changed": True}


async def replay_dead_job(session: AsyncSession, tenant_id: UUID, job_id: UUID) -> IngestionJob:
    """Requeue one dead-letter job for an administrator after inspecting its error."""
    await set_tenant_context(session, str(tenant_id))
    job = await session.scalar(
        select(IngestionJob)
        .where(IngestionJob.id == job_id, IngestionJob.tenant_id == tenant_id)
        .with_for_update()
    )
    if job is None:
        raise LookupError("ingestion job not found")
    if job.status != "dead":
        await session.rollback()
        raise ValueError("only dead-letter jobs can be replayed")
    if job.raw_object_deleted_at is not None:
        await session.rollback()
        raise ValueError("source object has expired and cannot be replayed")
    job.status = "queued"
    job.attempts = 0
    job.next_attempt_at = datetime.now(timezone.utc)
    job.lease_until = None
    job.error_code = None
    job.completed_at = None
    await session.commit()
    return job


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
    if job.status == "cancelled":
        await session.rollback()
        return
    delay = retry_delay_seconds(max(1, attempts))
    job.status = "dead" if attempts >= max_attempts else "queued"
    job.next_attempt_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
    job.lease_until = None
    job.error_code = error_code[:80]
    if job.status == "dead":
        job.completed_at = datetime.now(timezone.utc)
    await session.commit()


async def renew_job_lease(session: AsyncSession, tenant_id: UUID, job_id: UUID, lease_seconds: int = 300) -> bool:
    await set_tenant_context(session, str(tenant_id))
    result = await session.execute(
        update(IngestionJob)
        .where(IngestionJob.id == job_id, IngestionJob.tenant_id == tenant_id, IngestionJob.status == "processing")
        .values(lease_until=datetime.now(timezone.utc) + timedelta(seconds=lease_seconds))
    )
    await session.commit()
    return bool(result.rowcount)



def retention_cutoff(retention_days: int, now: datetime | None = None) -> datetime:
    if retention_days < 1:
        raise ValueError("retention_days must be at least one")
    current = now or datetime.now(timezone.utc)
    if current.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    return current - timedelta(days=retention_days)


async def claim_expired_raw_objects(
    session: AsyncSession,
    tenant_id: UUID,
    retention_days: int = 30,
    batch_size: int = 100,
    lease_seconds: int = 300,
) -> list[dict]:
    """Lease terminal-job source objects whose retention window has elapsed."""
    if batch_size < 1 or lease_seconds < 30:
        raise ValueError("batch_size must be positive and lease_seconds at least 30")
    await set_tenant_context(session, str(tenant_id))
    now = datetime.now(timezone.utc)
    cutoff = retention_cutoff(retention_days, now)
    rows = (await session.scalars(
        select(IngestionJob)
        .where(
            IngestionJob.tenant_id == tenant_id,
            IngestionJob.status.in_(("succeeded", "dead", "cancelled")),
            IngestionJob.raw_object_deleted_at.is_(None),
            func.coalesce(IngestionJob.completed_at, IngestionJob.updated_at, IngestionJob.created_at) <= cutoff,
            or_(
                IngestionJob.raw_object_delete_lease_until.is_(None),
                IngestionJob.raw_object_delete_lease_until < now,
            ),
        )
        .order_by(IngestionJob.created_at.asc())
        .with_for_update(skip_locked=True)
        .limit(batch_size)
    )).all()
    claimed = []
    for job in rows:
        job.raw_object_delete_lease_until = now + timedelta(seconds=lease_seconds)
        claimed.append({"id": job.id, "object_key": job.object_key})
    await session.commit()
    return claimed


async def mark_raw_object_deleted(session: AsyncSession, tenant_id: UUID, job_id: UUID) -> None:
    await set_tenant_context(session, str(tenant_id))
    result = await session.execute(
        update(IngestionJob)
        .where(IngestionJob.id == job_id, IngestionJob.tenant_id == tenant_id)
        .values(
            raw_object_deleted_at=datetime.now(timezone.utc),
            raw_object_delete_lease_until=None,
        )
    )
    if not result.rowcount:
        await session.rollback()
        raise LookupError("ingestion job not found")
    await session.commit()


async def release_raw_object_delete_lease(session: AsyncSession, tenant_id: UUID, job_id: UUID) -> None:
    await set_tenant_context(session, str(tenant_id))
    await session.execute(
        update(IngestionJob)
        .where(IngestionJob.id == job_id, IngestionJob.tenant_id == tenant_id)
        .values(raw_object_delete_lease_until=None)
    )
    await session.commit()
