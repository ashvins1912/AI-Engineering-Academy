CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  media_type varchar(120) NOT NULL,
  sha256 varchar(64) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'ready' CHECK (status IN ('indexing','ready','failed','deleting')),
  page_count integer NOT NULL DEFAULT 0 CHECK (page_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_document_tenant_sha256 UNIQUE (tenant_id, sha256)
);
CREATE INDEX IF NOT EXISTS ix_documents_tenant_created ON documents(tenant_id, created_at DESC);
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  page_number integer,
  content text NOT NULL,
  embedding vector(384) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_chunk_tenant_doc_index UNIQUE (tenant_id, document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS ix_chunks_tenant_doc ON document_chunks(tenant_id, document_id);
CREATE INDEX IF NOT EXISTS ix_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_documents_isolation ON documents;
CREATE POLICY tenant_documents_isolation ON documents USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
DROP POLICY IF EXISTS tenant_chunks_isolation ON document_chunks;
CREATE POLICY tenant_chunks_isolation ON document_chunks USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO academy_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_chunks TO academy_app;
GRANT USAGE ON SCHEMA public TO academy_app;
