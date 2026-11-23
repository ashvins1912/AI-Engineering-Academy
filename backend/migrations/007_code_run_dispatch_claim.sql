-- A durable, owner-scoped dispatch lease prevents concurrent idempotent retries
-- from submitting the same learner program to the external runner simultaneously.
-- Learner source is intentionally not stored.
ALTER TABLE code_runs
  ADD COLUMN IF NOT EXISTS dispatch_lease_token uuid,
  ADD COLUMN IF NOT EXISTS dispatch_lease_until timestamptz;

CREATE INDEX IF NOT EXISTS ix_code_runs_dispatch_lease
  ON code_runs(tenant_id, owner_id, dispatch_lease_until)
  WHERE status = 'submitting';
