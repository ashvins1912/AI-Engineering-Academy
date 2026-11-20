ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS visibility varchar(16) NOT NULL DEFAULT 'private';
ALTER TABLE documents DROP CONSTRAINT IF EXISTS ck_documents_visibility;
ALTER TABLE documents ADD CONSTRAINT ck_documents_visibility CHECK (visibility IN ('private','tenant'));

CREATE TABLE IF NOT EXISTS document_acl (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  subject_type varchar(16) NOT NULL CHECK (subject_type IN ('user')),
  subject_id uuid NOT NULL,
  permission varchar(16) NOT NULL CHECK (permission IN ('read','write','admin')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_document_acl_subject UNIQUE (tenant_id, document_id, subject_type, subject_id)
);
CREATE INDEX IF NOT EXISTS ix_document_acl_subject
  ON document_acl(tenant_id, subject_type, subject_id, permission);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  object_key varchar(512) NOT NULL,
  filename varchar(255) NOT NULL,
  media_type varchar(120) NOT NULL,
  sha256 varchar(64) NOT NULL,
  visibility varchar(16) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','tenant')),
  status varchar(24) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','succeeded','dead','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  error_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ix_ingestion_jobs_claim
  ON ingestion_jobs(tenant_id, status, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS ix_ingestion_jobs_owner
  ON ingestion_jobs(tenant_id, owner_id, created_at DESC);

ALTER TABLE document_acl ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acl FORCE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_document_acl_isolation ON document_acl;
CREATE POLICY tenant_document_acl_isolation ON document_acl
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_ingestion_jobs_isolation ON ingestion_jobs;
CREATE POLICY tenant_ingestion_jobs_isolation ON ingestion_jobs
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON document_acl TO academy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ingestion_jobs TO academy_app;
