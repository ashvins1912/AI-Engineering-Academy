# Document Ingestion and Retrieval API

FastAPI service for PDF/DOCX parsing, scanned-PDF OCR, sentence-transformer embeddings, PostgreSQL/pgvector search and tenant-scoped hybrid retrieval. The async ingestion path stores private source objects and queues durable processing jobs.

## Local requirements

- Python 3.11+
- PostgreSQL 16+ with pgvector
- Tesseract OCR and Poppler installed
- First-use model download for sentence-transformers/all-MiniLM-L6-v2 (384 dimensions, CPU supported; first load is memory intensive)
- Optional ClamAV daemon for upload malware scanning

## Run locally

1. Create a restricted application DB role. The local Docker Compose stack creates `academy_app` with a disposable password; never reuse it in production.
2. Configure a trusted HTTPS JWKS endpoint (preferred) or RS256 PEM public key, issuer and audience. See [auth_claims.md](app/auth_claims.md).
3. Apply `migrations/000_local_role.sql`, `migrations/001_initial.sql` and `migrations/002_document_acl_ingestion_jobs.sql` as a database administrator.
4. From this directory run `docker compose up --build`, or install `requirements.txt` in a Python 3.11 virtual environment and run `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

The API listens on port 8000.

## API

- `GET /health/live`, `GET /health/ready`
- `POST /v1/ingestion-jobs` multipart `file`, optional `visibility=private|tenant`; returns 202 and a durable job ID
- `GET /v1/ingestion-jobs/{id}` owner/tenant-admin job status
- `POST /v1/documents` synchronous compatibility path; prefer the async job API
- `GET /v1/documents`
- `DELETE /v1/documents/{id}` owner or tenant admin
- `POST /v1/search` JSON `{"query":"...","top_k":5}`
- `GET /v1/admin/tenant-health` tenant admin

## Asynchronous ingestion, storage and malware scanning

The preferred upload path validates size and declared PDF/DOCX type, scans the upload when configured, stores the raw object privately and creates an RLS-protected ingestion job. Run a tenant-scoped worker with:

```bash
python -m app.worker --tenant-id <trusted-tenant-uuid>
# Process at most one queued job:
python -m app.worker --tenant-id <trusted-tenant-uuid> --once
```

The tenant ID is an operator-supplied trusted worker scope, never a browser parameter. The worker claims jobs with `FOR UPDATE SKIP LOCKED`, leases and renews active work, retries with bounded exponential backoff and moves exhausted/expired jobs to `dead`. Run a worker instance for each tenant scope or use a trusted tenant scheduler.

`ACADEMY_STORAGE_BACKEND=local` is for local development only. Production should use `ACADEMY_STORAGE_BACKEND=s3`, a private bucket, KMS key, bucket policy blocking public access, lifecycle/retention and deletion controls. The S3 adapter uses SSE-KMS. Configure `ACADEMY_MALWARE_SCAN_REQUIRED=true` and a reachable ClamAV daemon for public uploads; the API fails closed if scanning is required but unavailable. Local storage is not durable or shared across ephemeral instances.

The synchronous `/v1/documents` endpoint remains for compatibility. The worker currently uses the local SentenceTransformers model path; isolate it from the API process and provision worker memory/CPU separately before deployment.

## OCR and parsing

PDF text is extracted page-by-page with pypdf. Pages with fewer than 20 characters are rendered by Poppler and processed by Tesseract (20-page OCR budget, 60-second render timeout and 25-second OCR timeout per page). DOCX paragraphs and tables are extracted as text. Upload limit is 10 MB, PDF limit 50 pages and extracted text limit 500,000 characters. A streaming ASGI request-body guard rejects requests above the configured 11 MB default before multipart parsing. DOCX compressed archives are checked for expanded-size and entry-count limits. OCR confidence is not stored yet; complex layouts and images are not preserved.

## Embeddings and retrieval

SentenceTransformers `all-MiniLM-L6-v2` creates normalized 384-dimensional vectors. pgvector cosine search retrieves semantic candidates. The lexical path calculates Okapi BM25 using tenant-local corpus size, average chunk length, document frequency and term frequency, with k1=1.2 and b=0.75. Hybrid ordering uses reciprocal-rank fusion (RRF, k=60). Tokenization is lowercase alphanumeric; language-specific stemming/analyzers need benchmarking. Do not change models/dimensions without versioned re-embedding.

## Tenant security and identity

Tenant and user UUIDs come only from signed RS256 JWT claims. The verifier checks issuer, audience, expiry, issued-at and required UUID claims. Prefer `ACADEMY_JWKS_URL` over a static public key; JWKS sets are cached for five minutes and refreshed for unknown key IDs. The algorithm is pinned to RS256. Tenant IDs are never read from request bodies or headers.

Documents default to private visibility. Tenant-wide visibility requires an administrator. List/search filters enforce owner, tenant visibility and explicit user ACL grants; document ACL and ingestion-job tables have forced RLS. The current branch intentionally does not expose a public ACL-grant endpoint: a trusted membership resolver must verify that a target user belongs to the tenant before grant/revoke operations are enabled. Run the API and worker using a restricted non-owner DB role with no BYPASSRLS.

## Verification

Run `python -m pytest tests -q` from this directory. Unit tests cover RS256 token handling, private storage, traversal protection, malware scanner outcomes, access predicates, retry policy and API contracts. The PostgreSQL RLS integration test is enabled by setting `ACADEMY_TEST_DATABASE_URL` to a disposable connection using the restricted, non-superuser, non-BYPASSRLS application role after applying all migrations. It verifies documents, ACL rows and jobs are invisible across tenants and rolls back its test transaction.

## Remaining production gates

- Integrate the actual Academy identity provider and validate tenant membership before enabling public ACL grant/revoke operations.
- Add per-tenant worker concurrency quotas, cancellation, dead-letter review/replay and orphan-object cleanup/retention reconciliation.
- Add raw-object retention/deletion workflows and encrypted backup/restore verification.
- Replace the in-memory single-process rate limiter with a distributed limiter and add audit events, metrics and trace correlation.
- Store OCR confidence and layout/region metadata; add sandboxed parser isolation and multilingual OCR evaluation.
- Add a configured generation provider, structured grounded-answer output, citation validation and abstention tests before enabling answer generation.
- Run migration verification, load/security tests, backup/restore drills and independent security review.

No cloud resources, external model APIs or paid hosting were provisioned. This API is not yet production-certified or deployed. It is not suitable for a 512 MB Render Free instance: the sentence-transformer model, OCR and parsing can exceed that memory budget.
