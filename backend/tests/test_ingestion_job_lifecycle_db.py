import asyncio
import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import set_tenant_context
from app.jobs import (
    claim_expired_raw_objects,
    claim_next_job,
    mark_job_failed,
    mark_raw_object_deleted,
    replay_dead_job,
)
from app.models import IngestionJob

DATABASE_URL = os.getenv("ACADEMY_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="ACADEMY_TEST_DATABASE_URL is not configured")


def test_ingestion_job_claim_retry_dead_letter_replay_and_retention_lifecycle():
    async def run():
        engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        tenant_id, owner_id, job_id = uuid4(), uuid4(), uuid4()
        try:
            async with sessions() as session:
                await set_tenant_context(session, str(tenant_id))
                session.add(IngestionJob(
                    id=job_id, tenant_id=tenant_id, owner_id=owner_id,
                    object_key=f"{tenant_id}/{job_id}/source", filename="source.pdf",
                    media_type="application/pdf", sha256=uuid4().hex * 2,
                    status="queued", attempts=0, max_attempts=2,
                    next_attempt_at=datetime.now(timezone.utc) - timedelta(seconds=1),
                ))
                await session.commit()

            async with sessions() as session:
                claimed = await claim_next_job(session, tenant_id, lease_seconds=60)
                assert claimed is not None
                assert claimed["id"] == job_id
                assert claimed["attempts"] == 1

            async with sessions() as session:
                await mark_job_failed(session, tenant_id, job_id, attempts=1, max_attempts=2, error_code="transient")
            async with sessions() as session:
                await set_tenant_context(session, str(tenant_id))
                job = await session.get(IngestionJob, job_id)
                assert job.status == "queued"
                assert job.error_code == "transient"
                job.next_attempt_at = datetime.now(timezone.utc) - timedelta(seconds=1)
                await session.commit()

            async with sessions() as session:
                claimed_again = await claim_next_job(session, tenant_id, lease_seconds=60)
                assert claimed_again is not None
                assert claimed_again["attempts"] == 2
            async with sessions() as session:
                await mark_job_failed(session, tenant_id, job_id, attempts=2, max_attempts=2, error_code="permanent")
            async with sessions() as session:
                await set_tenant_context(session, str(tenant_id))
                job = await session.get(IngestionJob, job_id)
                assert job.status == "dead"
                job.completed_at = datetime.now(timezone.utc) - timedelta(days=31)
                await session.commit()

            async with sessions() as session:
                replayed = await replay_dead_job(session, tenant_id, job_id)
                assert replayed.status == "queued"
                assert replayed.attempts == 0
                replayed.status = "dead"
                replayed.completed_at = datetime.now(timezone.utc) - timedelta(days=31)
                await session.commit()

            async with sessions() as session:
                cleanup_claims = await claim_expired_raw_objects(
                    session, tenant_id, retention_days=30, batch_size=10, lease_seconds=60
                )
                assert any(item["id"] == job_id for item in cleanup_claims)

            async with sessions() as session:
                await mark_raw_object_deleted(session, tenant_id, job_id)
            async with sessions() as session:
                with pytest.raises(ValueError, match="expired"):
                    await replay_dead_job(session, tenant_id, job_id)
        finally:
            await engine.dispose()

    asyncio.run(run())
