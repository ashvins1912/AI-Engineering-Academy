from __future__ import annotations

import argparse
import asyncio
import logging
import os
from uuid import UUID

from .config import get_settings
from .db import SessionLocal, engine
from .jobs import (
    claim_expired_raw_objects,
    mark_raw_object_deleted,
    release_raw_object_delete_lease,
)
from .storage import StorageError, create_object_store

logger = logging.getLogger("academy.ingestion.cleanup")


async def cleanup_one_batch(tenant_id: UUID, batch_size: int | None = None) -> int:
    settings = get_settings()
    limit = batch_size or settings.ingestion_cleanup_batch_size
    async with SessionLocal() as session:
        jobs = await claim_expired_raw_objects(
            session,
            tenant_id,
            retention_days=settings.ingestion_raw_object_retention_days,
            batch_size=limit,
            lease_seconds=settings.ingestion_cleanup_lease_seconds,
        )
    if not jobs:
        return 0
    store = create_object_store(settings)
    deleted = 0
    for job in jobs:
        try:
            # Both supported adapters make deletion idempotent.
            await asyncio.to_thread(store.delete, job["object_key"])
        except (StorageError, OSError):
            logger.exception(
                "raw_object_retention_delete_failed",
                extra={"tenant_id": str(tenant_id), "job_id": str(job["id"])},
            )
            async with SessionLocal() as session:
                await release_raw_object_delete_lease(session, tenant_id, job["id"])
            continue
        async with SessionLocal() as session:
            await mark_raw_object_deleted(session, tenant_id, job["id"])
        deleted += 1
    return deleted


async def run_cleanup(
    tenant_id: UUID,
    poll_seconds: float = 60.0,
    batch_size: int | None = None,
    once: bool = False,
) -> None:
    if poll_seconds < 1:
        raise ValueError("poll interval must be at least one second")
    try:
        while True:
            deleted = await cleanup_one_batch(tenant_id, batch_size)
            if once:
                return
            if deleted == 0:
                await asyncio.sleep(poll_seconds)
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Tenant-scoped private RAG source-object retention worker")
    parser.add_argument(
        "--tenant-id",
        default=os.getenv("ACADEMY_WORKER_TENANT_ID"),
        required=os.getenv("ACADEMY_WORKER_TENANT_ID") is None,
    )
    parser.add_argument("--poll-seconds", type=float, default=60.0)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    asyncio.run(run_cleanup(UUID(args.tenant_id), args.poll_seconds, args.batch_size, args.once))


if __name__ == "__main__":
    main()
