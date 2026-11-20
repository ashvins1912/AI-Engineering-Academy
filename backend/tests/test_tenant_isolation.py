import asyncio
import os
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv("ACADEMY_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="ACADEMY_TEST_DATABASE_URL is not configured")


def test_restricted_database_role_enforces_tenant_rls_for_documents_acl_and_jobs():
    async def run():
        engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
        tenant_a, tenant_b, owner, target = uuid4(), uuid4(), uuid4(), uuid4()
        document_id, acl_id, job_id = uuid4(), uuid4(), uuid4()
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
                INSERT INTO documents
                  (id, tenant_id, owner_id, title, media_type, sha256, status, visibility, page_count)
                VALUES
                  (:id, :tenant, :owner, 'rls-test', 'text/plain', :sha, 'ready', 'private', 1)
            """), {"id": document_id, "tenant": tenant_a, "owner": owner, "sha": uuid4().hex * 2})
            await connection.execute(text("""
                INSERT INTO document_chunks
                  (id, tenant_id, document_id, chunk_index, page_number, content, embedding)
                VALUES (:id, :tenant, :document, 0, 1, 'tenant A secret retrieval evidence',
                        CAST(:embedding AS vector))
            """), {
                "id": uuid4(), "tenant": tenant_a, "document": document_id,
                "embedding": "[" + ",".join(["0"] * 384) + "]",
            })
            await connection.execute(text("""
                INSERT INTO document_acl
                  (id, tenant_id, document_id, subject_type, subject_id, permission, created_by)
                VALUES (:id, :tenant, :document, 'user', :subject, 'read', :owner)
            """), {"id": acl_id, "tenant": tenant_a, "document": document_id, "subject": target, "owner": owner})
            await connection.execute(text("""
                INSERT INTO ingestion_jobs
                  (id, tenant_id, owner_id, object_key, filename, media_type, sha256, visibility, status)
                VALUES (:id, :tenant, :owner, 'tenant/job/object', 'rls.pdf', 'application/pdf', :sha, 'private', 'queued')
            """), {"id": job_id, "tenant": tenant_a, "owner": owner, "sha": uuid4().hex * 2})

            visible_a = await connection.scalar(
                text("SELECT count(*) FROM documents WHERE id=:id"), {"id": document_id}
            )
            acl_visible_a = await connection.scalar(
                text("SELECT count(*) FROM document_acl WHERE id=:id"), {"id": acl_id}
            )
            job_visible_a = await connection.scalar(
                text("SELECT count(*) FROM ingestion_jobs WHERE id=:id"), {"id": job_id}
            )
            chunk_visible_a = await connection.scalar(
                text("SELECT count(*) FROM document_chunks WHERE document_id=:id"), {"id": document_id}
            )
            assert (visible_a, acl_visible_a, job_visible_a, chunk_visible_a) == (1, 1, 1, 1)

            await connection.execute(
                text("SELECT set_config('app.tenant_id', :tenant, true)"),
                {"tenant": str(tenant_b)},
            )
            visible_b = await connection.scalar(
                text("SELECT count(*) FROM documents WHERE id=:id"), {"id": document_id}
            )
            acl_visible_b = await connection.scalar(
                text("SELECT count(*) FROM document_acl WHERE id=:id"), {"id": acl_id}
            )
            job_visible_b = await connection.scalar(
                text("SELECT count(*) FROM ingestion_jobs WHERE id=:id"), {"id": job_id}
            )
            chunk_visible_b = await connection.scalar(
                text("SELECT count(*) FROM document_chunks WHERE document_id=:id"), {"id": document_id}
            )
            assert (visible_b, acl_visible_b, job_visible_b, chunk_visible_b) == (0, 0, 0, 0)

            # An unset tenant context must expose no tenant rows.
            await connection.execute(text("SELECT set_config('app.tenant_id', '', true)"))
            no_context = await connection.scalar(text("SELECT count(*) FROM documents"))
            assert no_context == 0
        finally:
            await transaction.rollback()
            await connection.close()
            await engine.dispose()

    asyncio.run(run())
