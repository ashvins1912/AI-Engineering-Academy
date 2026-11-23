from pathlib import Path

import pytest
from fastapi import HTTPException

from app.code_runs import _provider_from_settings
from app.config import Settings


def test_code_execution_is_disabled_by_default():
    settings = Settings(_env_file=None)
    assert settings.code_execution_enabled is False
    with pytest.raises(HTTPException) as error:
        _provider_from_settings(settings)
    assert error.value.status_code == 503


def test_enabled_execution_requires_an_operator_configured_https_runner():
    settings = Settings(
        _env_file=None,
        code_execution_enabled=True,
        code_runner_url="",
        code_runner_token="",
    )
    with pytest.raises(HTTPException) as error:
        _provider_from_settings(settings)
    assert error.value.status_code == 503


def test_code_run_migration_enforces_tenant_rls_and_does_not_store_source():
    sql = (Path(__file__).parents[1] / "migrations" / "005_code_runs.sql").read_text()
    assert "ALTER TABLE code_runs FORCE ROW LEVEL SECURITY" in sql
    assert "tenant_code_runs_isolation" in sql
    assert "uq_code_runs_owner_idempotency" in sql
    assert "source_sha256" in sql
    assert "source text" not in sql.lower()
    assert "GRANT SELECT, INSERT, UPDATE, DELETE ON code_runs TO academy_app" in sql


@pytest.mark.asyncio
async def test_submit_restores_transaction_local_tenant_context_before_result_update(monkeypatch):
    from uuid import uuid4

    import app.code_runs as module
    from app.runner_provider import RunnerResult
    from app.schemas import CodeRunCreate
    from app.security import Principal

    settings = Settings(
        _env_file=None,
        code_execution_enabled=True,
        code_runner_url="https://runner.example",
        code_runner_token="s" * 32,
    )
    monkeypatch.setattr(module, "get_settings", lambda: settings)

    class FakeProvider:
        async def submit(self, run_id, submission):
            return RunnerResult(
                provider_run_id=str(run_id), status="succeeded",
                stdout="ok", stderr="", exit_code=0, duration_ms=12,
            )

    monkeypatch.setattr(module, "HttpsRunnerProvider", lambda *args: FakeProvider())

    class FakeSession:
        def __init__(self):
            self.context_set = False
            self.commits = 0
            self.run = None
            self.scalar_calls = 0

        async def execute(self, statement, params=None):
            return None

        async def scalar(self, statement):
            self.scalar_calls += 1
            sql = str(statement).lower()
            if "update code_runs" in sql:
                self.run.dispatch_lease_token = dispatch_token
                return self.run.id
            if "dispatch_lease_token" in sql:
                return self.run
            if self.scalar_calls == 1:
                return None
            return 0

        def add(self, value):
            self.run = value

        async def commit(self):
            assert self.context_set, "RLS tenant context must be set for every write transaction"
            self.commits += 1
            self.context_set = False  # emulate PostgreSQL SET LOCAL reset at commit

    async def fake_set_tenant_context(session, tenant_id):
        session.context_set = True

    monkeypatch.setattr(module, "set_tenant_context", fake_set_tenant_context)

    session = FakeSession()
    dispatch_token = uuid4()
    principal = Principal(user_id=uuid4(), tenant_id=uuid4(), roles=())
    result = await module.submit_code_run(
        body=CodeRunCreate(
            runtime_id="python-3.11", lesson_id="python-basics",
            source="print('ok')",
        ),
        idempotency_key=uuid4(),
        principal=principal,
        session=session,
    )
    assert result.status == "succeeded"
    assert result.stdout == "ok"
    assert session.commits == 3  # insert, dispatch claim, and result persistence
    assert session.run.status == "succeeded"
    assert session.run.dispatch_lease_token is None
    assert session.run.dispatch_lease_until is None
