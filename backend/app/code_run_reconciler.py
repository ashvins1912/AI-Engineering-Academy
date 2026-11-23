"""Tenant-scoped poller that reconciles accepted external code-run jobs.

This worker never receives learner source and never executes code. It polls
the configured runner by the durable run UUID and updates only run metadata.
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from sqlalchemy import or_, select

from .config import get_settings
from .db import SessionLocal, engine, set_tenant_context
from .models import CodeRun
from .runner_provider import (
    HttpsRunnerProvider,
    RunnerProtocolError,
    RunnerRejected,
    RunnerUnavailable,
)

logger = logging.getLogger("academy.code_run.reconciler")
_TERMINAL = ("succeeded", "failed", "timed_out", "resource_limited")


def retry_delay(attempt: int) -> int:
    """Bounded exponential retry delay in seconds."""
    return min(300, 2 ** max(1, min(attempt, 8)))


async def claim_next_run(tenant_id: UUID, lease_seconds: int) -> tuple[UUID, UUID, int] | None:
    """Atomically lease one due nonterminal run for this trusted tenant."""
    now = datetime.now(timezone.utc)
    async with SessionLocal() as session:
        await set_tenant_context(session, str(tenant_id))
        run = await session.scalar(
            select(CodeRun)
            .where(
                CodeRun.tenant_id == tenant_id,
                CodeRun.status.notin_(_TERMINAL),
                # A submitting row is not yet confirmed as accepted by the runner.
                # Only an idempotent POST retry has the source needed to safely
                # recover that ambiguous dispatch after its lease expires.
                CodeRun.status != "submitting",
                or_(CodeRun.dispatch_lease_until.is_(None), CodeRun.dispatch_lease_until <= now),
                or_(CodeRun.next_reconcile_at.is_(None), CodeRun.next_reconcile_at <= now),
                or_(CodeRun.reconcile_lease_until.is_(None), CodeRun.reconcile_lease_until <= now),
            )
            .order_by(CodeRun.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if run is None:
            await session.rollback()
            return None
        token = uuid4()
        run.reconcile_lease_token = token
        run.reconcile_lease_until = now + timedelta(seconds=lease_seconds)
        run.reconcile_attempts += 1
        attempt = run.reconcile_attempts
        run_id = run.id
        await session.commit()
        return run_id, token, attempt


async def _finish(
    tenant_id: UUID,
    run_id: UUID,
    lease_token: UUID,
    *,
    result=None,
    error_code: str | None = None,
    retry_at: datetime | None = None,
) -> bool:
    """Persist a result only while this worker still owns the lease."""
    async with SessionLocal() as session:
        await set_tenant_context(session, str(tenant_id))
        run = await session.scalar(select(CodeRun).where(
            CodeRun.id == run_id,
            CodeRun.tenant_id == tenant_id,
            CodeRun.reconcile_lease_token == lease_token,
        ))
        if run is None:
            await session.rollback()
            return False
        if result is not None:
            run.status = result.status
            run.stdout = result.stdout
            run.stderr = result.stderr
            run.exit_code = result.exit_code
            run.duration_ms = result.duration_ms
            run.test_results = list(result.test_results)
            run.error_code = None
            if result.status in _TERMINAL:
                run.completed_at = datetime.now(timezone.utc)
            run.next_reconcile_at = None
        elif retry_at is not None:
            run.next_reconcile_at = retry_at
            run.error_code = error_code
        else:
            run.status = "failed"
            run.error_code = error_code or "runner_reconciliation_failed"
            run.completed_at = datetime.now(timezone.utc)
            run.next_reconcile_at = None
        run.reconcile_lease_token = None
        run.reconcile_lease_until = None
        await session.commit()
        return True


async def process_one(tenant_id: UUID) -> bool:
    settings = get_settings()
    if not settings.code_execution_enabled:
        logger.info("code_run_reconciler_disabled")
        return False
    if not settings.code_runner_url or not settings.code_runner_token:
        logger.error("code_run_reconciler_runner_not_configured")
        return False
    lease_seconds = settings.code_run_reconcile_lease_seconds
    if not 10 <= lease_seconds <= 300:
        logger.error("code_run_reconciler_invalid_lease_configuration")
        return False

    claimed = await claim_next_run(tenant_id, lease_seconds)
    if claimed is None:
        return False
    run_id, lease_token, attempt = claimed
    try:
        provider = HttpsRunnerProvider(settings.code_runner_url, settings.code_runner_token)
        result = await provider.get(run_id)
        updated = await _finish(tenant_id, run_id, lease_token, result=result)
        if updated:
            logger.info("code_run_reconciled", extra={
                "tenant_id": str(tenant_id), "run_id": str(run_id), "status": result.status,
            })
    except RunnerUnavailable:
        retry_at = datetime.now(timezone.utc) + timedelta(seconds=retry_delay(attempt))
        await _finish(
            tenant_id, run_id, lease_token, error_code="runner_unavailable", retry_at=retry_at,
        )
        logger.warning("code_run_reconcile_retry", extra={
            "tenant_id": str(tenant_id), "run_id": str(run_id), "attempt": attempt,
        })
    except (RunnerRejected, RunnerProtocolError):
        await _finish(
            tenant_id, run_id, lease_token, error_code="runner_reconciliation_rejected",
        )
        logger.error("code_run_reconcile_failed", extra={
            "tenant_id": str(tenant_id), "run_id": str(run_id),
        })
    except Exception:
        retry_at = datetime.now(timezone.utc) + timedelta(seconds=retry_delay(attempt))
        await _finish(
            tenant_id, run_id, lease_token, error_code="reconciliation_error", retry_at=retry_at,
        )
        logger.exception("code_run_reconcile_unexpected_error", extra={
            "tenant_id": str(tenant_id), "run_id": str(run_id),
        })
    return True


async def run_worker(
    tenant_id: UUID, poll_seconds: float = 3.0, once: bool = False,
) -> None:
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
    parser = argparse.ArgumentParser(description="Tenant-scoped external code-run reconciler")
    parser.add_argument(
        "--tenant-id", default=os.getenv("ACADEMY_WORKER_TENANT_ID"),
        required=os.getenv("ACADEMY_WORKER_TENANT_ID") is None,
    )
    parser.add_argument("--poll-seconds", type=float, default=3.0)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    asyncio.run(run_worker(UUID(args.tenant_id), args.poll_seconds, args.once))


if __name__ == "__main__":
    main()
