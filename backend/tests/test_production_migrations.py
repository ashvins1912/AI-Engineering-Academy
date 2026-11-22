import unittest
from pathlib import Path


class ProductionRAGMigrationTests(unittest.TestCase):
    def test_document_acl_and_job_tables_are_tenant_isolated(self):
        sql = (Path(__file__).parents[1] / "migrations" / "002_document_acl_ingestion_jobs.sql").read_text()
        self.assertIn("ALTER TABLE document_acl FORCE ROW LEVEL SECURITY", sql)
        self.assertIn("ALTER TABLE ingestion_jobs FORCE ROW LEVEL SECURITY", sql)
        self.assertIn("tenant_document_acl_isolation", sql)
        self.assertIn("tenant_ingestion_jobs_isolation", sql)

    def test_raw_object_retention_has_delete_marker_and_lease(self):
        sql = (Path(__file__).parents[1] / "migrations" / "003_raw_object_retention.sql").read_text()
        self.assertIn("raw_object_deleted_at", sql)
        self.assertIn("raw_object_delete_lease_until", sql)
        self.assertIn("ix_ingestion_jobs_raw_object_cleanup", sql)

    def test_distributed_rate_limit_table_has_expiry_and_grants(self):
        sql = (Path(__file__).parents[1] / "migrations" / "004_distributed_rate_limits.sql").read_text()
        self.assertIn("api_rate_limit_buckets", sql)
        self.assertIn("expires_at", sql)
        self.assertIn("GRANT SELECT, INSERT, UPDATE, DELETE ON api_rate_limit_buckets TO academy_app", sql)

    def test_document_visibility_defaults_to_private(self):
        sql = (Path(__file__).parents[1] / "migrations" / "002_document_acl_ingestion_jobs.sql").read_text()
        self.assertIn("visibility varchar(16) NOT NULL DEFAULT 'private'", sql)
        self.assertIn("CHECK (visibility IN ('private','tenant'))", sql)

    def test_code_runs_are_tenant_isolated_idempotent_and_source_free(self):
        sql = (Path(__file__).parents[1] / "migrations" / "005_code_runs.sql").read_text()
        self.assertIn("ALTER TABLE code_runs FORCE ROW LEVEL SECURITY", sql)
        self.assertIn("tenant_code_runs_isolation", sql)
        self.assertIn("uq_code_runs_owner_idempotency", sql)
        self.assertIn("source_sha256", sql)
        self.assertNotIn("source text", sql.lower())

    def test_job_queue_supports_leases_and_retry_state(self):
        sql = (Path(__file__).parents[1] / "migrations" / "002_document_acl_ingestion_jobs.sql").read_text()
        for column in ("attempts", "max_attempts", "next_attempt_at", "lease_until", "error_code", "completed_at"):
            self.assertIn(column, sql)


if __name__ == "__main__":
    unittest.main()


def test_code_run_reconciliation_migration_adds_leases_without_source_storage():
    sql = (Path(__file__).parents[1] / "migrations" / "006_code_run_reconciliation.sql").read_text()
    assert "reconcile_lease_token" in sql
    assert "FOR UPDATE" not in sql  # claim query is parameterized in the worker
    assert "CREATE INDEX" in sql
    assert "source text" not in sql.lower()
