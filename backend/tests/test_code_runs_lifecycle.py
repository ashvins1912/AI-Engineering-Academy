from datetime import datetime, timezone
from hashlib import sha256
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.config import Settings
from app.models import CodeRun
from app.security import Principal


def _run(*, tenant_id, owner_id, idempotency_key, source, status="queued"):
    return CodeRun(
        id=uuid4(),
        tenant_id=tenant_id,
        owner_id=owner_id,
        idempotency_key=idempotency_key,
        runtime_id="python-3.11",
        lesson_id="python-basics",
        test_suite_id=None,
        source_sha256=sha256(source.encode()).hexdigest(),
        status=status,
        stdout="",
        stderr="",
        test_results=[],
        created_at=datetime.now(timezone.utc),
    )


class FakeSession:
    def __init__(self, scalar_values=()):
        self.scalar_values = list(scalar_values)
        self.statements = []
        self.last_run = None
        self.added = []
        self.commits = 0
        self.rollbacks = 0

    async def execute(self, statement, params=None):
        self.statements.append((str(statement), params or {}))

    async def scalar(self, statement):
        sql = str(statement).lower()
        self.statements.append((str(statement), {}))
        if "update code_runs" in sql:
            self.last_run = self.added[-1] if self.added else self.last_run
            if self.last_run is not None and self.claim_available:
                self.last_run.dispatch_lease_token = uuid4()
                return self.last_run.id
            return None
        if "dispatch_lease_token" in sql and self.last_run is not None:
            return self.last_run
        if not self.scalar_values:
            return None
        value = self.scalar_values.pop(0)
        if isinstance(value, CodeRun):
            self.last_run = value
        return value

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1


def _principal(tenant_id=None, user_id=None, roles=()):
    return Principal(
        tenant_id=tenant_id or uuid4(),
        user_id=user_id or uuid4(),
        roles=roles,
    )


@pytest.mark.asyncio
async def test_same_idempotency_key_replays_existing_run_without_resubmitting(monkeypatch):
    import app.code_runs as module
    from app.schemas import CodeRunCreate

    principal = _principal()
    key = uuid4()
    source = "print('hello')"
    existing = _run(
        tenant_id=principal.tenant_id,
        owner_id=principal.user_id,
        idempotency_key=key,
        source=source,
    )
    session = FakeSession([existing])
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)

    settings = Settings(_env_file=None, code_execution_enabled=True)
    monkeypatch.setattr(module, "get_settings", lambda: settings)

    class ProviderMustNotBeCalled:
        async def submit(self, *_args, **_kwargs):
            raise AssertionError("idempotent replay must not submit twice")

    monkeypatch.setattr(module, "_provider_from_settings", lambda _settings: ProviderMustNotBeCalled())

    result = await module.submit_code_run(
        body=CodeRunCreate(runtime_id="python-3.11", lesson_id="python-basics", source=source),
        idempotency_key=key,
        principal=principal,
        session=session,
    )
    assert result.id == existing.id
    assert result.status == "queued"
    assert session.commits == 0
    assert session.added == []


@pytest.mark.asyncio
async def test_reusing_idempotency_key_with_different_source_returns_conflict(monkeypatch):
    import app.code_runs as module
    from app.schemas import CodeRunCreate

    principal = _principal()
    key = uuid4()
    existing = _run(
        tenant_id=principal.tenant_id,
        owner_id=principal.user_id,
        idempotency_key=key,
        source="print('original')",
    )
    session = FakeSession([existing])
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)
    monkeypatch.setattr(module, "get_settings", lambda: Settings(_env_file=None, code_execution_enabled=True))
    monkeypatch.setattr(module, "_provider_from_settings", lambda _settings: object())

    with pytest.raises(HTTPException) as error:
        await module.submit_code_run(
            body=CodeRunCreate(runtime_id="python-3.11", lesson_id="python-basics", source="print('changed')"),
            idempotency_key=key,
            principal=principal,
            session=session,
        )
    assert error.value.status_code == 409
    assert session.added == []


@pytest.mark.asyncio
async def test_hourly_quota_is_enforced_before_a_new_run_is_inserted(monkeypatch):
    import app.code_runs as module
    from app.schemas import CodeRunCreate

    principal = _principal()
    session = FakeSession([None, 10])
    settings = Settings(
        _env_file=None,
        code_execution_enabled=True,
        code_run_max_per_hour=10,
        code_run_max_per_day=30,
    )
    monkeypatch.setattr(module, "get_settings", lambda: settings)
    monkeypatch.setattr(module, "_provider_from_settings", lambda _settings: object())
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)

    with pytest.raises(HTTPException) as error:
        await module.submit_code_run(
            body=CodeRunCreate(runtime_id="python-3.11", lesson_id="python-basics", source="print(1)"),
            idempotency_key=uuid4(),
            principal=principal,
            session=session,
        )
    assert error.value.status_code == 429
    assert session.added == []
    assert session.commits == 0


@pytest.mark.asyncio
async def test_daily_quota_is_enforced_when_hourly_quota_has_capacity(monkeypatch):
    import app.code_runs as module
    from app.schemas import CodeRunCreate

    principal = _principal()
    session = FakeSession([None, 0, 30])
    settings = Settings(
        _env_file=None,
        code_execution_enabled=True,
        code_run_max_per_hour=10,
        code_run_max_per_day=30,
    )
    monkeypatch.setattr(module, "get_settings", lambda: settings)
    monkeypatch.setattr(module, "_provider_from_settings", lambda _settings: object())
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)

    with pytest.raises(HTTPException) as error:
        await module.submit_code_run(
            body=CodeRunCreate(runtime_id="python-3.11", lesson_id="python-basics", source="print(1)"),
            idempotency_key=uuid4(),
            principal=principal,
            session=session,
        )
    assert error.value.status_code == 429
    assert session.added == []
    assert session.commits == 0


@pytest.mark.asyncio
async def test_get_run_query_scopes_non_admin_to_owner_and_tenant(monkeypatch):
    import app.code_runs as module
    from uuid import uuid4

    principal = _principal()
    session = FakeSession([None])
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)

    with pytest.raises(HTTPException) as error:
        await module.get_code_run(uuid4(), principal=principal, session=session)
    assert error.value.status_code == 404
    query = session.statements[-1][0]
    assert "code_runs.tenant_id" in query
    assert "code_runs.owner_id" in query


@pytest.mark.asyncio
async def test_get_run_query_allows_tenant_admin_to_view_other_owner(monkeypatch):
    import app.code_runs as module

    principal = _principal(roles=("tenant_admin",))
    session = FakeSession([None])
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)

    with pytest.raises(HTTPException) as error:
        await module.get_code_run(uuid4(), principal=principal, session=session)
    assert error.value.status_code == 404
    query = session.statements[-1][0]
    assert "code_runs.tenant_id" in query
    where_clause = query.split("WHERE", 1)[1]
    assert "code_runs.owner_id" not in where_clause


async def _noop_tenant_context(_session, _tenant_id):
    return None


@pytest.mark.asyncio
async def test_stuck_submitting_replay_reuses_durable_run_id(monkeypatch):
    import app.code_runs as module
    from app.runner_provider import RunnerResult
    from app.schemas import CodeRunCreate

    principal = _principal()
    key = uuid4()
    source = "print('retry')"
    existing = _run(
        tenant_id=principal.tenant_id,
        owner_id=principal.user_id,
        idempotency_key=key,
        source=source,
        status="submitting",
    )
    session = FakeSession([existing])
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)
    monkeypatch.setattr(module, "get_settings", lambda: Settings(_env_file=None, code_execution_enabled=True))
    seen = {}

    class Provider:
        async def submit(self, run_id, submission):
            seen["run_id"] = run_id
            seen["source"] = submission.source
            return RunnerResult(
                provider_run_id=str(run_id), status="queued",
            )

    monkeypatch.setattr(module, "_provider_from_settings", lambda _settings: Provider())
    result = await module.submit_code_run(
        body=CodeRunCreate(runtime_id="python-3.11", lesson_id="python-basics", source=source),
        idempotency_key=key,
        principal=principal,
        session=session,
    )
    assert seen == {"run_id": existing.id, "source": source}
    assert result.id == existing.id
    assert result.status == "queued"
    assert session.commits == 2  # dispatch claim and result persistence




@pytest.mark.asyncio
async def test_active_dispatch_lease_prevents_duplicate_provider_submission(monkeypatch):
    import app.code_runs as module
    from app.schemas import CodeRunCreate

    principal = _principal()
    key = uuid4()
    source = "print('already dispatching')"
    existing = _run(
        tenant_id=principal.tenant_id,
        owner_id=principal.user_id,
        idempotency_key=key,
        source=source,
        status="submitting",
    )
    # Simulate another API worker owning the lease. The conditional UPDATE
    # returns no row, so this request must return the durable in-progress run.
    session = FakeSession([existing], claim_available=False)
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)
    monkeypatch.setattr(module, "get_settings", lambda: Settings(_env_file=None, code_execution_enabled=True))

    class ProviderMustNotBeCalled:
        async def submit(self, *_args, **_kwargs):
            raise AssertionError("an active dispatch lease must prevent duplicate submission")

    monkeypatch.setattr(module, "_provider_from_settings", lambda _settings: ProviderMustNotBeCalled())
    result = await module.submit_code_run(
        body=CodeRunCreate(runtime_id="python-3.11", lesson_id="python-basics", source=source),
        idempotency_key=key,
        principal=principal,
        session=session,
    )
    assert result.id == existing.id
    assert result.status == "submitting"
    assert session.commits == 1

@pytest.mark.asyncio
async def test_runner_unavailable_keeps_run_retryable_and_sanitizes_error(monkeypatch):
    import app.code_runs as module
    from app.runner_provider import RunnerUnavailable
    from app.schemas import CodeRunCreate

    principal = _principal()
    session = FakeSession([None, 0, 0])
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)
    monkeypatch.setattr(module, "get_settings", lambda: Settings(_env_file=None, code_execution_enabled=True))

    class Provider:
        async def submit(self, *_args, **_kwargs):
            raise RunnerUnavailable("private upstream details")

    monkeypatch.setattr(module, "_provider_from_settings", lambda _settings: Provider())
    with pytest.raises(HTTPException) as error:
        await module.submit_code_run(
            body=CodeRunCreate(runtime_id="python-3.11", lesson_id="python-basics", source="print(2)"),
            idempotency_key=uuid4(),
            principal=principal,
            session=session,
        )
    assert error.value.status_code == 503
    run = session.added[0]
    assert run.status == "submitting"
    assert run.error_code == "runner_unavailable"
    assert "private upstream" not in run.error_code
    assert session.commits == 3  # insert, dispatch claim, and sanitized failure


@pytest.mark.asyncio
async def test_runner_rejection_marks_run_failed_with_sanitized_code(monkeypatch):
    import app.code_runs as module
    from app.runner_provider import RunnerRejected
    from app.schemas import CodeRunCreate

    principal = _principal()
    session = FakeSession([None, 0, 0])
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)
    monkeypatch.setattr(module, "get_settings", lambda: Settings(_env_file=None, code_execution_enabled=True))

    class Provider:
        async def submit(self, *_args, **_kwargs):
            raise RunnerRejected("do not expose runner response")

    monkeypatch.setattr(module, "_provider_from_settings", lambda _settings: Provider())
    with pytest.raises(HTTPException) as error:
        await module.submit_code_run(
            body=CodeRunCreate(runtime_id="python-3.11", lesson_id="python-basics", source="print(3)"),
            idempotency_key=uuid4(),
            principal=principal,
            session=session,
        )
    assert error.value.status_code == 502
    assert session.added[0].status == "failed"
    assert session.added[0].error_code == "runner_rejected"


@pytest.mark.asyncio
async def test_runner_protocol_error_marks_run_failed_without_leaking_payload(monkeypatch):
    import app.code_runs as module
    from app.runner_provider import RunnerProtocolError
    from app.schemas import CodeRunCreate

    principal = _principal()
    session = FakeSession([None, 0, 0])
    monkeypatch.setattr(module, "set_tenant_context", _noop_tenant_context)
    monkeypatch.setattr(module, "get_settings", lambda: Settings(_env_file=None, code_execution_enabled=True))

    class Provider:
        async def submit(self, *_args, **_kwargs):
            raise RunnerProtocolError("sensitive malformed response")

    monkeypatch.setattr(module, "_provider_from_settings", lambda _settings: Provider())
    with pytest.raises(HTTPException) as error:
        await module.submit_code_run(
            body=CodeRunCreate(runtime_id="python-3.11", lesson_id="python-basics", source="print(4)"),
            idempotency_key=uuid4(),
            principal=principal,
            session=session,
        )
    assert error.value.status_code == 502
    assert session.added[0].status == "failed"
    assert session.added[0].error_code == "runner_protocol_error"
    assert session.commits == 3  # insert, dispatch claim, and sanitized failure
