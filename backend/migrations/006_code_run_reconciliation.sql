-- Lease metadata for safe, multi-worker polling of external code runs.
-- Learner source remains intentionally absent from the database.
ALTER TABLE code_runs
  ADD COLUMN IF NOT EXISTS reconcile_attempts integer NOT NULL DEFAULT 0
    CHECK (reconcile_attempts >= 0),
  ADD COLUMN IF NOT EXISTS next_reconcile_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconcile_lease_until timestamptz,
  ADD COLUMN IF NOT EXISTS reconcile_lease_token uuid;

CREATE INDEX IF NOT EXISTS ix_code_runs_reconcile_due
  ON code_runs(tenant_id, next_reconcile_at, created_at)
  WHERE status NOT IN ('succeeded','failed','timed_out','resource_limited');
