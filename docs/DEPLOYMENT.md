# Deployment strategy

## Local-first development
- `npm install && npm run dev` for the curriculum frontend.
- Use Docker Compose for local PostgreSQL/pgvector and the optional FastAPI ingestion API.
- Keep sample data and local provider mocks available; never silently trigger paid model usage.

## Render Free compatibility
A free-tier deployment must account for cold starts, limited memory, ephemeral filesystems and sleeping services. Do not assume a long-running worker, GPU, durable local disk or always-on background process is available.

Recommended low-cost topology:
- Static frontend on a static hosting target.
- Lightweight account API only after the identity and database design is selected.
- Keep the sentence-transformer/OCR ingestion service local or on explicitly approved worker capacity. It is not safe to run beside the web app on a 512 MB service.
- Do not provision a paid database, worker, object store or model provider without explicit approval.
- Use only a managed free database after validating its current limits, durability, backups and connection policy.

## Phase 6 ingestion API
The optional backend lives in `backend/`. It requires Python 3.11, PostgreSQL with pgvector, Tesseract and Poppler. Configure the actual identity provider's HTTPS JWKS URL, issuer, audience and tenant/user claim mapping before connecting the UI. Apply SQL migrations using a DBA role, then run the API with a separate restricted application role. See [backend/README.md](../backend/README.md).

The current API does OCR and model inference synchronously, so it is a local integration foundation rather than a public production service. A durable isolated worker/queue, malware scanning, quotas, audit/observability and independent security review remain mandatory before public ingestion.

## Release checklist
- [ ] Trusted identity provider and JWKS rotation verified with real issuer/audience/claims.
- [ ] Frontend obtains and sends short-lived access tokens; no client-supplied tenant identifiers.
- [ ] Apply versioned migrations and confirm API DB role is non-owner, non-superuser and non-BYPASSRLS.
- [ ] Run `ACADEMY_TEST_DATABASE_URL=... pytest backend/tests/test_tenant_isolation.py` against disposable PostgreSQL.
- [ ] Move parsing/OCR/embeddings to bounded isolated workers with retries, dead-letter handling and tenant quotas.
- [ ] Add malware scanning, audit events, distributed rate limiting and metrics.
- [ ] Load, security, backup/restore and deployment smoke tests pass.
- [ ] Verify memory/CPU under realistic load; never deploy the model/OCR stack to 512 MB Render Free.
- [ ] Review costs and obtain explicit approval before provisioning external resources.

No cloud resources are provisioned by this repository.
