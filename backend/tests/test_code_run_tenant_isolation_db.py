import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv("ACADEMY_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="ACADEMY_TEST_DATABASE_URL is not configured")


def test_code_run_rows_are_isolated_by_tenant_under_restricted_role():
    async def run():
        engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
        tenant_a, tenant_b, owner, run_id = uuid4(), uuid4(), uuid4(), uuid4()
        connection = await engine.connect()
        transaction = await connection.begin()
        try:
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
                INSERT INTO code_runs
                  (id, tenant_id, owner_id, idempotency_key, runtime_id, lesson_id,
                   source_sha256, status, stdout, stderr, test_results)
                VALUES
                  (:id, :tenant, :owner, :idem, 'python-3.11', 'python-basics',
                   :digest, 'queued', '', '', '[]'::jsonb)
            """), {
                "id": run_id, "tenant": tenant_a, "owner": owner,
                "idem": uuid4(), "digest": "a" * 64,
            })
            visible_a = await connection.scalar(
                text("SELECT count(*) FROM code_runs WHERE id=:id"), {"id": run_id}
            )
            await connection.execute(
                text("SELECT set_config('app.tenant_id', :tenant, true)"),
                {"tenant": str(tenant_b)},
            )
            visible_b = await connection.scalar(
                text("SELECT count(*) FROM code_runs WHERE id=:id"), {"id": run_id}
            )
            assert (visible_a, visible_b) == (1, 0)
            await connection.execute(text("SELECT set_config('app.tenant_id', '', true)"))
            assert await connection.scalar(text("SELECT count(*) FROM code_runs")) == 0
        finally:
            await transaction.rollback()
            await connection.close()
            await engine.dispose()

    asyncio.run(run())


def test_code_run_idempotency_is_unique_per_tenant_and_owner():
    from sqlalchemy.exc import IntegrityError

    async def run():
        engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
        tenant_id, owner_id, other_owner = uuid4(), uuid4(), uuid4()
        idempotency_key = uuid4()
        connection = await engine.connect()
        transaction = await connection.begin()
        try:
            await connection.execute(
                text("SELECT set_config('app.tenant_id', :tenant, true)"),
                {"tenant": str(tenant_id)},
            )
            values = {
                "tenant": tenant_id, "owner": owner_id,
                "idem": idempotency_key, "digest": "b" * 64,
            }
            insert = text("""
                INSERT INTO code_runs
                  (id, tenant_id, owner_id, idempotency_key, runtime_id, lesson_id,
                   source_sha256, status, stdout, stderr, test_results)
                VALUES
                  (:id, :tenant, :owner, :idem, 'python-3.11', 'python-basics',
                   :digest, 'submitting', '', '', '[]'::jsonb)
            """)
            await connection.execute(insert, {**values, "id": uuid4()})
            duplicate_rejected = False
            try:
                async with connection.begin_nested():
                    await connection.execute(insert, {**values, "id": uuid4()})
            except IntegrityError:
                duplicate_rejected = True
            assert duplicate_rejected, "same tenant/owner/key must be unique"

            # The uniqueness scope includes owner_id, so another owner can use
            # the same opaque key without colliding with the first owner's run.
            await connection.execute(insert, {
                **values, "owner": other_owner, "id": uuid4(),
            })
            count = await connection.scalar(text(
                "SELECT count(*) FROM code_runs WHERE tenant_id=:tenant"
            ), {"tenant": tenant_id})
            assert count == 2
        finally:
            await transaction.rollback()
            await connection.close()
            await engine.dispose()

    asyncio.run(run())
