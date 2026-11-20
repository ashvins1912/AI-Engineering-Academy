# Document Ingestion API

FastAPI service for server-side PDF/DOCX parsing, scanned-PDF OCR, real sentence-transformer embeddings, PostgreSQL/pgvector similarity and explicit Okapi BM25 hybrid retrieval.

## Local requirements

- Python 3.11+
- PostgreSQL 16+ with pgvector
- Tesseract OCR and Poppler installed
- First-use model download for sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, CPU supported; first load is memory intensive)

## Run locally

1. Create a restricted application DB role. For the local Docker Compose stack, the init scripts create `academy_app` with a disposable password; never reuse it in production.
2. Configure a trusted HTTPS JWKS endpoint (preferred) or RS256 PEM public key, issuer and audience. See [auth_claims.md](app/auth_claims.md).
3. From this directory:

```bash
docker compose up --build
```

The API listens on port 8000. Alternatively, create a Python virtual environment, install `requirements.txt`, apply `migrations/000_local_role.sql`, `migrations/001_initial.sql` and `migrations/002_document_acl_ingestion_jobs.sql` as a database administrator, then run `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## API

- `GET /health/live`, `GET /health/ready`
- `POST /v1/ingestion-jobs` multipart field `file`, optional `visibility=private|tenant`, returns 202 and a durable job ID\n- `GET /v1/ingestion-jobs/{id}` owner/tenant-admin job status\n- `POST /v1/documents` synchronous compatibility path; prefer the async job API
- `GET /v1/documents`
- `DELETE /v1/documents/{id}` owner or tenant admin
- `POST /v1/search` JSON `{"query":"...","top_k":5}`
- `GET /v1/admin/tenant-health` tenant admin

## OCR and parsing

PDF text is extracted page-by-page with pypdf. Pages with fewer than 20 characters are rendered by Poppler and processed by Tesseract (20-page OCR budget, 60-second render timeout and 25-second OCR timeout per page). DOCX paragraphs and tables are extracted as text. Upload limit is 10 MB, PDF limit 50 pages and extracted text limit 500,000 characters. A streaming ASGI request-body guard rejects requests above the configured 11 MB default before multipart parsing. DOCX compressed archives are checked for expanded-size and entry-count limits. OCR confidence is not stored yet; complex layouts and images are not preserved.

## Embeddings and retrieval

SentenceTransformers `all-MiniLM-L6-v2` creates normalized 384-dimensional vectors. pgvector cosine search retrieves semantic candidates. The lexical path calculates Okapi BM25 using tenant-local corpus size, average chunk length, document frequency and term frequency, with k1=1.2 and b=0.75. Hybrid ordering uses reciprocal-rank fusion (RRF, k=60). Tokenization is lowercase alphanumeric; language-specific stemming/analyzers need benchmarking. Do not change models/dimensions without versioned re-embedding.

## Tenant security and identity

The tenant and user UUIDs come only from signed RS256 JWT claims. The verifier checks issuer, audience, expiry, issued-at, and required UUID claims. Prefer `ACADEMY_JWKS_URL` over a static public key; JWKS sets are cached for five minutes and refreshed for unknown key IDs. The algorithm is pinned to RS256. Tenant IDs are never read from request bodies or headers. Every document/chunk/ACL/job query is tenant-scoped; PostgreSQL RLS is enabled and forced, and the API/worker set transaction-local app.tenant_id before tenant-scoped SQL. Documents default to private visibility; tenant-wide visibility requires an administrator. Explicit user grants are enforced by list/search predicates and the RLS-protected document_acl table. Grant provisioning must validate target tenant membership before it is exposed as an API operation. Run as a restricted non-owner DB role with no BYPASSRLS.

## Verification

Run `python -m pytest tests -q` from this directory. Unit tests validate RS256 token acceptance, role normalization and rejection of HS256. The PostgreSQL RLS test is enabled by setting `ACADEMY_TEST_DATABASE_URL` to a disposable database connection using the restricted, non-superuser, non-BYPASSRLS application role, after applying both migrations. The test inserts a tenant-A document and asserts it is invisible under tenant B; its transaction is rolled back.

## Remaining production gates

- Ingestion, OCR and embedding still execute synchronously within the API request (off the event loop, but not through a durable job queue). Do not expose this endpoint to untrusted public traffic until these operations move to bounded isolated workers with retry/dead-letter and per-tenant concurrency quotas.
- The original uploaded file is not retained; extracted text/chunks/vectors are stored in PostgreSQL only. Add private encrypted object storage with retention and deletion workflows only if raw-file preservation is required.
- Map the actual Academy identity provider to the claim contract and verify JWKS issuer/audience/claim behavior. No identity provider can be selected or configured without the Academy's actual provider details.
- Replace the in-memory single-process rate limiter with a distributed limiter and add per-tenant quotas, upload concurrency limits, audit events and metrics.
- Add malware scanning, sandboxed parser workers, OCR confidence, multilingual OCR and durable asynchronous processing.
- Add Alembic or equivalent migration lifecycle, run the opt-in PostgreSQL RLS integration test, load tests, backup/restore drills and independent security review.
- Benchmark BM25 against a golden query set before making relevance-quality claims.
- The frontend is not connected to this API because no trusted login/token flow is configured. Browser uploader remains a local teaching path. Do not send real documents until identity, privacy, retention and consent are integrated.

No cloud resources, external model APIs or paid hosting were provisioned. This API is not yet production-certified or deployed. It is not suitable for a 512 MB Render Free instance: the sentence-transformer model, OCR and parsing can exceed that memory budget.
