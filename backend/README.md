# Document Ingestion API

FastAPI service for server-side PDF/DOCX parsing, scanned-PDF OCR, real sentence-transformer embeddings, PostgreSQL/pgvector similarity and explicit Okapi BM25 hybrid retrieval.

## Local requirements

- Python 3.11+
- PostgreSQL 16+ with pgvector
- Tesseract OCR and Poppler installed
- First-use model download for sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, CPU supported; first load is memory intensive)

## Run locally

1. Create a restricted application DB role. For the local Docker Compose stack, the init scripts create `academy_app` with a disposable password; never reuse it in production.
2. Set a trusted RS256 public key, identity issuer and audience in the environment.
3. From this directory:

```bash
docker compose up --build
```

The API listens on port 8000. Alternatively, create a Python virtual environment, install `requirements.txt`, apply `migrations/000_local_role.sql` and `migrations/001_initial.sql` as a database administrator, then run `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## API

- `GET /health/live`, `GET /health/ready`
- `POST /v1/documents` multipart field `file`, bearer JWT required
- `GET /v1/documents`
- `DELETE /v1/documents/{id}` owner or tenant admin
- `POST /v1/search` JSON `{"query":"...","top_k":5}`
- `GET /v1/admin/tenant-health` tenant admin

## OCR and parsing

PDF text is extracted page-by-page with pypdf. Pages with fewer than 20 characters are rendered by Poppler and processed by Tesseract (20-page OCR budget, 60-second render timeout and 25-second OCR timeout per page). DOCX paragraphs and tables are extracted as text. Upload limit is 10 MB, PDF limit 50 pages and extracted text limit 500,000 characters. DOCX compressed archives are checked for expanded-size and entry-count limits. OCR confidence is not stored yet; complex layouts and images are not preserved.

## Embeddings and retrieval

SentenceTransformers `all-MiniLM-L6-v2` creates normalized 384-dimensional vectors. pgvector cosine search retrieves semantic candidates. The lexical path calculates Okapi BM25 using tenant-local corpus size, average chunk length, document frequency and term frequency, with k1=1.2 and b=0.75. Hybrid ordering uses reciprocal-rank fusion (RRF, k=60). Tokenization is lowercase alphanumeric; language-specific stemming/analyzers need benchmarking. Do not change models/dimensions without versioned re-embedding.

## Tenant security

The tenant and user UUIDs come only from signed JWT claims. Issuer, audience, expiry and issued-at are checked. Tenant IDs are never read from request bodies or headers. Every document/chunk query filters on tenant_id; PostgreSQL RLS is enabled and forced, and the API sets transaction-local app.tenant_id before tenant-scoped SQL. Run as a restricted non-owner DB role with no BYPASSRLS. Verify cross-tenant reads/deletes at the DB layer before onboarding tenants.

## Production gaps — do not skip

- OCR and embeddings currently run synchronously within a request (off the event loop but not through a durable job queue). Move them to bounded worker processes with queue retry/dead-letter and per-tenant concurrency quotas.
- The original uploaded file is not retained; extracted text/chunks/vectors are stored in PostgreSQL only. Add private encrypted object storage with retention and deletion workflows if raw-file preservation is needed.
- Integrate the actual Academy identity provider and JWKS rotation; current claim contract is documented in app/auth_claims.md.
- Replace the in-memory single-process rate limiter with a distributed limiter and add request quotas, upload concurrency limits, audit events and metrics.
- Add malware scanning, sandboxed parser workers, OCR confidence, multilingual OCR and parser timeouts.
- Add Alembic or equivalent migration lifecycle, cross-tenant integration tests using the restricted DB role, load tests, backup/restore drills and security review.
- Current BM25 is a mathematically explicit Okapi BM25 implementation but tokenization is intentionally simple; benchmark it against a golden query set before production relevance claims.
- Current API has no frontend identity integration. Browser uploader remains a local teaching path; do not send real documents until identity, privacy, retention and consent are integrated.

No cloud resources, external model APIs or paid hosting were provisioned.

This API is not yet production-certified or deployed. Complete every gate above and run integration/security/performance tests before use with real tenant data.

The lexical score is true Okapi BM25 (k1=1.2, b=0.75) using simple alphanumeric tokenization; relevance quality still needs evaluation against a golden query set.
