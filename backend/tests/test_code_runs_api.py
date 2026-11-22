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
