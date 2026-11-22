-- Durable metadata for isolated code runs. Learner source is intentionally not stored.
CREATE TABLE IF NOT EXISTS code_runs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  idempotency_key uuid NOT NULL,
  runtime_id varchar(40) NOT NULL CHECK (runtime_id IN ('python-3.11')),
  lesson_id varchar(120) NOT NULL,
  test_suite_id varchar(80),
  source_sha256 varchar(64) NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  status varchar(24) NOT NULL DEFAULT 'submitting'
    CHECK (status IN ('submitting','queued','running','succeeded','failed','timed_out','resource_limited')),
  stdout text NOT NULL DEFAULT '' CHECK (char_length(stdout) <= 16000),
  stderr text NOT NULL DEFAULT '' CHECK (char_length(stderr) <= 16000),
  exit_code integer,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  test_results jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(test_results) = 'array' AND jsonb_array_length(test_results) <= 100),
  error_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT uq_code_runs_owner_idempotency UNIQUE (tenant_id, owner_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS ix_code_runs_owner_created
  ON code_runs(tenant_id, owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_code_runs_tenant_created
  ON code_runs(tenant_id, created_at DESC);
ALTER TABLE code_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_code_runs_isolation ON code_runs;
CREATE POLICY tenant_code_runs_isolation ON code_runs
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON code_runs TO academy_app;
