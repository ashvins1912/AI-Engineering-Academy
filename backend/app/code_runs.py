"""Authenticated, tenant-scoped API for an external isolated Python runner.

The Academy API never executes learner code. This router stays disabled unless
an operator explicitly enables it and supplies a separately isolated HTTPS runner.
Learner source is forwarded to that runner and only its SHA-256 digest is retained.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from .code_execution_contract import CodeRunSubmission, validate_submission
from .config import get_settings
from .db import get_session, set_tenant_context
from .models import CodeRun
from .runner_provider import (
    HttpsRunnerProvider,
    RunnerError,
    RunnerProtocolError,
    RunnerRejected,
    RunnerResult,
    RunnerUnavailable,
)
from .schemas import CodeRunCreate, CodeRunOut
from .security import Principal, current_principal

router = APIRouter()
_TERMINAL = {"succeeded", "failed", "timed_out", "resource_limited"}


def _provider_from_settings(settings) -> HttpsRunnerProvider:
    if not settings.code_execution_enabled:
        raise HTTPException(503, "Python code execution is disabled")
    if not settings.code_runner_url or not settings.code_runner_token:
        raise HTTPException(503, "Isolated Python runner is not configured")
    if settings.code_run_max_per_hour < 1 or settings.code_run_max_per_day < 1:
        raise HTTPException(503, "Python code-run quotas are misconfigured")
    try:
        return HttpsRunnerProvider(settings.code_runner_url, settings.code_runner_token)
    except ValueError:
        raise HTTPException(503, "Isolated Python runner configuration is invalid") from None


def _out(run: CodeRun) -> CodeRunOut:
    return CodeRunOut(
        id=run.id, status=run.status, runtime_id=run.runtime_id, lesson_id=run.lesson_id,
        stdout=run.stdout, stderr=run.stderr, exit_code=run.exit_code,
        duration_ms=run.duration_ms, test_results=run.test_results or [],
        error_code=run.error_code,
        created_at=run.created_at.isoformat() if run.created_at else None,
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
    )


def _apply_result(run: CodeRun, result: RunnerResult) -> None:
    run.status = result.status
    run.stdout = result.stdout
    run.stderr = result.stderr
    run.exit_code = result.exit_code
    run.duration_ms = result.duration_ms
    run.test_results = list(result.test_results)
    run.error_code = None
    if result.status in _TERMINAL:
        run.completed_at = datetime.now(timezone.utc)


async def _find_run(
    session: AsyncSession, run_id: UUID, principal: Principal
) -> CodeRun | None:
    query = select(CodeRun).where(
        CodeRun.id == run_id,
        CodeRun.tenant_id == principal.tenant_id,
    )
    if not ({"tenant_admin", "platform_admin"} & set(principal.roles)):
        query = query.where(CodeRun.owner_id == principal.user_id)
    return await session.scalar(query)


@router.post("/v1/code-runs", response_model=CodeRunOut, status_code=202)
async def submit_code_run(
    body: CodeRunCreate,
    idempotency_key: UUID = Header(alias="Idempotency-Key"),
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()
    provider = _provider_from_settings(settings)
    try:
        submission = validate_submission(CodeRunSubmission(
            runtime_id=body.runtime_id, lesson_id=body.lesson_id,
            source=body.source, test_suite_id=body.test_suite_id,
        ))
    except (ValueError, UnicodeError):
        raise HTTPException(422, "Invalid code-run submission") from None

    source_digest = sha256(submission.source.encode("utf-8")).hexdigest()
    await set_tenant_context(session, str(principal.tenant_id))
    run = await session.scalar(select(CodeRun).where(
        CodeRun.tenant_id == principal.tenant_id,
        CodeRun.owner_id == principal.user_id,
        CodeRun.idempotency_key == idempotency_key,
    ))
    if run is not None:
        if (
            run.source_sha256 != source_digest
            or run.runtime_id != submission.runtime_id
            or run.lesson_id != submission.lesson_id
            or run.test_suite_id != submission.test_suite_id
        ):
            raise HTTPException(409, "Idempotency key was already used for a different submission")
        if run.status != "submitting":
            return _out(run)
    else:
        now = datetime.now(timezone.utc)
        hour_count = await session.scalar(select(func.count(CodeRun.id)).where(
            CodeRun.tenant_id == principal.tenant_id,
            CodeRun.owner_id == principal.user_id,
            CodeRun.created_at >= now - timedelta(hours=1),
        ))
        day_count = await session.scalar(select(func.count(CodeRun.id)).where(
            CodeRun.tenant_id == principal.tenant_id,
            CodeRun.owner_id == principal.user_id,
            CodeRun.created_at >= now - timedelta(days=1),
        ))
        if (hour_count or 0) >= settings.code_run_max_per_hour or (day_count or 0) >= settings.code_run_max_per_day:
            raise HTTPException(429, "Python code-run quota exceeded")
        run = CodeRun(
            id=uuid4(), tenant_id=principal.tenant_id, owner_id=principal.user_id,
            idempotency_key=idempotency_key, runtime_id=submission.runtime_id,
            lesson_id=submission.lesson_id, test_suite_id=submission.test_suite_id,
            source_sha256=source_digest, status="submitting",
        )
        session.add(run)
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            await set_tenant_context(session, str(principal.tenant_id))
            run = await session.scalar(select(CodeRun).where(
                CodeRun.tenant_id == principal.tenant_id,
                CodeRun.owner_id == principal.user_id,
                CodeRun.idempotency_key == idempotency_key,
            ))
            if run is None or run.source_sha256 != source_digest:
                raise HTTPException(409, "Code-run idempotency conflict") from None
            if run.status != "submitting":
                return _out(run)

    try:
        result = await provider.submit(run.id, submission)
        _apply_result(run, result)
        await session.commit()
    except RunnerUnavailable:
        run.error_code = "runner_unavailable"
        await session.commit()
        raise HTTPException(503, "Isolated Python runner is temporarily unavailable") from None
    except RunnerRejected:
        run.status = "failed"
        run.error_code = "runner_rejected"
        run.completed_at = datetime.now(timezone.utc)
        await session.commit()
        raise HTTPException(502, "Isolated Python runner rejected the submission") from None
    except RunnerProtocolError:
        run.status = "failed"
        run.error_code = "runner_protocol_error"
        run.completed_at = datetime.now(timezone.utc)
        await session.commit()
        raise HTTPException(502, "Isolated Python runner returned an invalid response") from None
    return _out(run)


@router.get("/v1/code-runs/{run_id}", response_model=CodeRunOut)
async def get_code_run(
    run_id: UUID,
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    await set_tenant_context(session, str(principal.tenant_id))
    run = await _find_run(session, run_id, principal)
    if run is None:
        raise HTTPException(404, "Code run not found")

    settings = get_settings()
    if run.status not in _TERMINAL and settings.code_execution_enabled:
        try:
            provider = _provider_from_settings(settings)
            result = await provider.get(run.id)
            _apply_result(run, result)
            await session.commit()
        except RunnerUnavailable:
            pass
        except RunnerRejected:
            run.status = "failed"
            run.error_code = "runner_rejected"
            run.completed_at = datetime.now(timezone.utc)
            await session.commit()
        except RunnerProtocolError:
            run.status = "failed"
            run.error_code = "runner_protocol_error"
            run.completed_at = datetime.now(timezone.utc)
            await session.commit()
    return _out(run)
