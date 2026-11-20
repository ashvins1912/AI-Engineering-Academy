from __future__ import annotations

import argparse
import asyncio
import logging
import os
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool

from .config import get_settings
from .db import SessionLocal, engine, set_tenant_context
from .embeddings import encode_texts
from .ingestion import IngestionError, chunk_pages, extract_document
from .jobs import claim_next_job, mark_job_failed, mark_job_succeeded
from .malware import ClamAVScanner, MalwareDetected, ScannerUnavailable, scan_upload
from .models import Chunk, Document
from .storage import create_object_store

logger = logging.getLogger("academy.ingestion.worker")


async def process_one(tenant_id: UUID) -> bool:
    settings = get_settings()
    async with SessionLocal() as session:
        job = await claim_next_job(session, tenant_id, settings.ingestion_job_lease_seconds)
    if job is None:
        return False

    store = create_object_store(settings)
    scanner = ClamAVScanner(settings.clamav_host, settings.clamav_port) if settings.clamav_host else None
    try:
        raw = await run_in_threadpool(store.get, job["object_key"])
        await run_in_threadpool(scan_upload, raw, scanner, settings.malware_scan_required)
        extracted = await run_in_threadpool(extract_document, job["filename"], job["media_type"], raw)
        chunks = chunk_pages(extracted.pages)
        if not chunks:
            raise IngestionError("No indexable chunks were produced")
        vectors = await run_in_threadpool(encode_texts, [content for _, content in chunks])
        async with SessionLocal() as session:
            await set_tenant_context(session, str(tenant_id))
            existing = await session.scalar(select(Document).where(
                Document.tenant_id == tenant_id, Document.sha256 == extracted.sha256
            ))
            if existing is None:
                document = Document(
                    tenant_id=tenant_id, owner_id=job["owner_id"], title=extracted.title,
                    media_type=extracted.media_type, sha256=extracted.sha256,
                    status="ready", page_count=len(extracted.pages), visibility=job["visibility"],
                )
                session.add(document)
                await session.flush()
                for index, ((page_number, content), vector) in enumerate(zip(chunks, vectors, strict=True)):
                    session.add(Chunk(
                        tenant_id=tenant_id, document_id=document.id, chunk_index=index,
                        page_number=page_number, content=content, embedding=vector,
                    ))
                document_id = document.id
                await session.commit()
            else:
                document_id = existing.id
                await session.rollback()
        async with SessionLocal() as session:
            await mark_job_succeeded(session, tenant_id, job["id"], document_id)
        await run_in_threadpool(store.delete, job["object_key"])
        logger.info("ingestion_job_succeeded", extra={"tenant_id": str(tenant_id), "job_id": str(job["id"]), "document_id": str(document_id)})
    except MalwareDetected:
        async with SessionLocal() as session:
            await mark_job_failed(session, tenant_id, job["id"], job["max_attempts"], job["max_attempts"], "malware_detected")
        await run_in_threadpool(store.delete, job["object_key"])
        logger.warning("ingestion_job_rejected", extra={"tenant_id": str(tenant_id), "job_id": str(job["id"]), "reason": "malware_detected"})
    except ScannerUnavailable:
        async with SessionLocal() as session:
            await mark_job_failed(session, tenant_id, job["id"], job["attempts"], job["max_attempts"], "scanner_unavailable")
        logger.error("ingestion_job_retry", extra={"tenant_id": str(tenant_id), "job_id": str(job["id"]), "reason": "scanner_unavailable"})
    except IngestionError:
        async with SessionLocal() as session:
            await mark_job_failed(session, tenant_id, job["id"], job["max_attempts"], job["max_attempts"], "document_parse_failed")
        logger.warning("ingestion_job_failed", extra={"tenant_id": str(tenant_id), "job_id": str(job["id"]), "reason": "document_parse_failed"})
    except Exception:
        async with SessionLocal() as session:
            await mark_job_failed(session, tenant_id, job["id"], job["attempts"], job["max_attempts"], "processing_error")
        logger.exception("ingestion_job_retry", extra={"tenant_id": str(tenant_id), "job_id": str(job["id"]), "reason": "processing_error"})
    return True


async def run_worker(tenant_id: UUID, poll_seconds: float = 2.0, once: bool = False) -> None:
    if poll_seconds < 0.25:
        raise ValueError("poll interval must be at least 0.25 seconds")
    try:
        while True:
            worked = await process_one(tenant_id)
            if once:
                return
            if not worked:
                await asyncio.sleep(poll_seconds)
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Tenant-scoped durable RAG ingestion worker")
    parser.add_argument("--tenant-id", default=os.getenv("ACADEMY_WORKER_TENANT_ID"), required=os.getenv("ACADEMY_WORKER_TENANT_ID") is None)
    parser.add_argument("--poll-seconds", type=float, default=2.0)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    asyncio.run(run_worker(UUID(args.tenant_id), args.poll_seconds, args.once))


if __name__ == "__main__":
    main()
