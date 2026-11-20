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

    def test_document_visibility_defaults_to_private(self):
        sql = (Path(__file__).parents[1] / "migrations" / "002_document_acl_ingestion_jobs.sql").read_text()
        self.assertIn("visibility varchar(16) NOT NULL DEFAULT 'private'", sql)
        self.assertIn("CHECK (visibility IN ('private','tenant'))", sql)

    def test_job_queue_supports_leases_and_retry_state(self):
        sql = (Path(__file__).parents[1] / "migrations" / "002_document_acl_ingestion_jobs.sql").read_text()
        for column in ("attempts", "max_attempts", "next_attempt_at", "lease_until", "error_code", "completed_at"):
            self.assertIn(column, sql)


if __name__ == "__main__":
    unittest.main()
