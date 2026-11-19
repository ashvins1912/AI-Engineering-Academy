import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv("ACADEMY_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="ACADEMY_TEST_DATABASE_URL is not configured")


def test_restricted_database_role_enforces_tenant_row_level_security():
    async def run():
        engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
        tenant_a, tenant_b, owner = uuid4(), uuid4(), uuid4()
        document_id = uuid4()
        try:
            async with engine.begin() as connection:
                role = (await connection.execute(text(
                    "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user"
                ))).one()
                assert role.rolsuper is False
                assert role.rolbypassrls is False

                await connection.execute(
                    text("SELECT set_config('app.tenant_id', :tenant, true)"),
                    {"tenant": str(tenant_a)},
                )
                await connection.execute(text("""
                    INSERT INTO documents
                      (id, tenant_id, owner_id, title, media_type, sha256, status, page_count)
                    VALUES
                      (:id, :tenant, :owner, 'rls-test', 'text/plain', :sha, 'ready', 1)
                """), {"id": document_id, "tenant": tenant_a, "owner": owner, "sha": uuid4().hex * 2})
                visible_a = await connection.scalar(
                    text("SELECT count(*) FROM documents WHERE id=:id"), {"id": document_id}
                )
                assert visible_a == 1

                await connection.execute(
                    text("SELECT set_config('app.tenant_id', :tenant, true)"),
                    {"tenant": str(tenant_b)},
                )
                visible_b = await connection.scalar(
                    text("SELECT count(*) FROM documents WHERE id=:id"), {"id": document_id}
                )
                assert visible_b == 0
        finally:
            await engine.dispose()

    asyncio.run(run())
