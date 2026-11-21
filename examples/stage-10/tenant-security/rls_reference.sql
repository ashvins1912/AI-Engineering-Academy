-- Reference only: apply in a disposable PostgreSQL database with a restricted app role.
-- Do not connect the application as a superuser or a role with BYPASSRLS.
CREATE TABLE IF NOT EXISTS tenant_documents (
  tenant_id text NOT NULL,
  external_id text NOT NULL,
  owner_id text NOT NULL,
  body text NOT NULL,
  PRIMARY KEY (tenant_id, external_id)
);

ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_document_isolation ON tenant_documents;
CREATE POLICY tenant_document_isolation ON tenant_documents
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

-- Provision this role separately; it must not own the table or have BYPASSRLS.
-- GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_documents TO academy_app;

-- Every protected operation must use the same transaction:
-- BEGIN;
-- SELECT set_config('app.tenant_id', 'tenant-A', true); -- true = transaction-local
-- SELECT external_id, body FROM tenant_documents WHERE external_id = 'invoice-7';
-- COMMIT;
--
-- Missing app.tenant_id yields NULL; the policy predicate is not TRUE, so access is denied.
-- Verify with SET ROLE academy_app and a disposable test database.
