-- Durable source-object retention and concurrent cleanup leases.
ALTER TABLE ingestion_jobs
  ADD COLUMN IF NOT EXISTS raw_object_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS raw_object_delete_lease_until timestamptz;

CREATE INDEX IF NOT EXISTS ix_ingestion_jobs_raw_object_cleanup
  ON ingestion_jobs(tenant_id, status, completed_at, raw_object_delete_lease_until)
  WHERE raw_object_deleted_at IS NULL;
