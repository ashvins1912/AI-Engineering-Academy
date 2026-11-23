# Document Ingestion and Retrieval API

FastAPI service for PDF/DOCX parsing, scanned-PDF OCR, sentence-transformer embeddings, PostgreSQL/pgvector search and tenant-scoped hybrid retrieval. The async ingestion path stores private source objects and queues durable processing jobs.

## Local requirements

- Python 3.11+
- PostgreSQL 16+ with pgvector
- Tesseract OCR and Poppler installed
- Either a local first-use download of sentence-transformers/all-MiniLM-L6-v2 (384 dimensions; memory intensive) or a configured OpenAI-compatible remote embeddings endpoint
- Optional ClamAV daemon for upload malware scanning

## Run locally

1. Create a restricted application DB role. The local Docker Compose stack creates `academy_app` with a disposable password; never reuse it in production.
2. Configure a trusted HTTPS JWKS endpoint (preferred) or RS256 PEM public key, issuer and audience. See [auth_claims.md](app/auth_claims.md).
3. Apply migrations `000_local_role.sql` through `007_code_run_dispatch_claim.sql` as a database administrator, in numeric order.
4. From this directory run `docker compose up --build`, or install `requirements.txt` in a Python 3.11 virtual environment and run `uvicorn app.main:app --host 0.0.0.0 --port 8000`. The local Compose database initialization mounts migrations 000–006; if the PostgreSQL volume already existed before migrations 003 or 004 were added, apply those migrations manually once.

The API listens on port 8000. Rate limiting is shared across API instances through PostgreSQL. Set `ACADEMY_RATE_LIMIT_PER_MINUTE` to tune the fixed-window quota. If the service is behind a reverse proxy, set `ACADEMY_TRUSTED_PROXY_IPS` to a comma-separated allowlist of immediate proxy peer IPs or CIDR ranges; forwarded client headers are ignored from untrusted peers. The rate limiter stores only SHA-256 client-key digests and fails closed with 503 if PostgreSQL is unavailable.

## API

- `GET /health/live`, `GET /health/ready`
- `POST /v1/ingestion-jobs` multipart `file`, optional `visibility=private|tenant`; returns 202 and a durable job ID
- `GET /v1/ingestion-jobs/{id}` owner/tenant-admin job status
- `POST /v1/documents` synchronous compatibility path; prefer the async job API
- `GET /v1/documents`
- `DELETE /v1/documents/{id}` owner or tenant admin
- `POST /v1/search` JSON `{"query":"...","top_k":5}`
- `POST /v1/answer` grounded answer with validated exact-span citations; disabled by default
- `GET /v1/admin/tenant-health` tenant admin

## Asynchronous ingestion, storage and malware scanning

The preferred upload path validates size and declared PDF/DOCX type, scans the upload when configured, stores the raw object privately and creates an RLS-protected ingestion job. Run a tenant-scoped worker with:

```bash
python -m app.worker --tenant-id <trusted-tenant-uuid>
# Process at most one queued job:
python -m app.worker --tenant-id <trusted-tenant-uuid> --once
```

The tenant ID is an operator-supplied trusted worker scope, never a browser parameter. The worker claims jobs with `FOR UPDATE SKIP LOCKED`, leases and renews active work, retries with bounded exponential backoff and moves exhausted/expired jobs to `dead`. A PostgreSQL transaction-scoped advisory lock serializes each tenant's claim-and-quota check across worker processes; `ACADEMY_INGESTION_MAX_CONCURRENT_JOBS_PER_TENANT` defaults to 1. The quota counts unexpired processing leases, so expired work can be reclaimed. Run workers only with a trusted tenant scheduler; do not let browser input select worker tenant IDs.

Queued jobs can be cancelled with `DELETE /v1/ingestion-jobs/{id}` by the owner or a tenant admin. Cancellation is deliberately limited to queued jobs: a parser already executing in a worker is not forcibly interrupted, avoiding partial document commits. Tenant administrators can inspect the most recent 100 dead-letter jobs at `GET /v1/admin/ingestion-jobs/dead` and replay an inspected job with `POST /v1/admin/ingestion-jobs/{id}/replay`. Replay resets attempts and backoff; replay is rejected after the source object has passed retention and been deleted.

Terminal-job source objects are retained for `ACADEMY_INGESTION_RAW_OBJECT_RETENTION_DAYS` (default 30 days), then removed by a separate tenant-scoped cleanup worker. The cleanup worker uses database row leases so multiple cleanup processes do not delete the same job object concurrently. Run one sweep with `python -m app.cleanup --tenant-id <trusted-tenant-uuid> --once`, or keep it running with the default 60-second poll. With Docker Compose, set `ACADEMY_WORKER_TENANT_ID` and start the optional cleanup profile using `docker compose --profile cleanup up cleanup`. Configure `ACADEMY_INGESTION_CLEANUP_BATCH_SIZE` and `ACADEMY_INGESTION_CLEANUP_LEASE_SECONDS` to bound each sweep. Successful ingestion and queued cancellation still attempt immediate deletion; the retention worker reconciles failures and terminal objects that remain past the retention window. For bucket-level objects that have no corresponding database job row (for example, process death between object upload and job insert), use the object-store lifecycle policy or inventory-based reconciliation; this database worker cannot discover untracked keys.

`ACADEMY_STORAGE_BACKEND=local` is for local development only. Production should use `ACADEMY_STORAGE_BACKEND=s3`, a private bucket, KMS key, bucket policy blocking public access, lifecycle/retention and deletion controls. The S3 adapter uses SSE-KMS. Configure `ACADEMY_MALWARE_SCAN_REQUIRED=true` and a reachable ClamAV daemon for public uploads; the API fails closed if scanning is required but unavailable. Local storage is not durable or shared across ephemeral instances.

The synchronous `/v1/documents` endpoint remains for compatibility. The worker and API use the same configured embedding adapter. Set `ACADEMY_EMBEDDING_PROVIDER=http` with an authenticated OpenAI-compatible `/embeddings` endpoint to keep model weights out of API/worker memory; local SentenceTransformers remains the default for development.

## OCR and parsing

PDF text is extracted page-by-page with pypdf. Pages with fewer than 20 characters are rendered by Poppler and processed by Tesseract (20-page OCR budget, 60-second render timeout and 25-second OCR timeout per page). DOCX paragraphs and tables are extracted as text. Upload limit is 10 MB, PDF limit 50 pages and extracted text limit 500,000 characters. A streaming ASGI request-body guard rejects requests above the configured 11 MB default before multipart parsing. DOCX compressed archives are checked for expanded-size and entry-count limits. OCR confidence is not stored yet; complex layouts and images are not preserved.

## Embeddings and retrieval

The default local SentenceTransformers `all-MiniLM-L6-v2` adapter creates normalized 384-dimensional vectors. An opt-in HTTP adapter supports an OpenAI-compatible embeddings endpoint and validates response count, ordering, dimension and finite values. Remote endpoints are disabled until configured. pgvector cosine search retrieves semantic candidates. The lexical path calculates Okapi BM25 using tenant-local corpus size, average chunk length, document frequency and term frequency, with k1=1.2 and b=0.75. Hybrid ordering uses reciprocal-rank fusion (RRF, k=60). Tokenization is lowercase alphanumeric; language-specific stemming/analyzers need benchmarking. Do not change models/dimensions without versioned re-embedding.

## Grounded generation and citation validation

`POST /v1/answer` is disabled unless `ACADEMY_GENERATION_ENABLED=true` and a model endpoint, API key and model name are configured. It retrieves only ACL-filtered evidence, applies a bounded character budget, treats document content as untrusted instructions, requests structured JSON and verifies every cited source ID and exact quote span against the retrieved chunks. Invalid citations or provider abstention produce an empty abstained answer. Exact-span validation does not prove semantic entailment for every claim; golden-set faithfulness and human review remain release gates. No provider credentials are stored in this repository.

## Tenant security and identity

Tenant and user UUIDs come only from signed RS256 JWT claims. The verifier checks issuer, audience, expiry, issued-at and required UUID claims. Prefer `ACADEMY_JWKS_URL` over a static public key; JWKS sets are cached for five minutes and refreshed for unknown key IDs. The algorithm is pinned to RS256. Tenant IDs are never read from request bodies or headers.

Documents default to private visibility. Tenant-wide visibility requires an administrator. List/search filters enforce owner, tenant visibility and explicit user ACL grants; document ACL and ingestion-job tables have forced RLS. The current branch intentionally does not expose a public ACL-grant endpoint: a trusted membership resolver must verify that a target user belongs to the tenant before grant/revoke operations are enabled. Run the API and worker using a restricted non-owner DB role with no BYPASSRLS.

## Verification

Run `python -m pytest tests -q` from this directory. Unit tests cover RS256 token handling, private storage, traversal protection, malware scanner outcomes, access predicates, retry policy and API contracts. The PostgreSQL RLS integration test is enabled by setting `ACADEMY_TEST_DATABASE_URL` to a disposable connection using the restricted, non-superuser, non-BYPASSRLS application role after applying all migrations. It verifies documents, ACL rows and jobs are invisible across tenants and rolls back its test transaction.

## Remaining production gates

- Integrate the actual Academy identity provider and validate tenant membership before enabling public ACL grant/revoke operations.
- Add bucket inventory reconciliation for objects without job rows and encrypted backup/restore verification.
- Add audit events, metrics and trace correlation.
- Store OCR confidence and layout/region metadata; add sandboxed parser isolation and multilingual OCR evaluation.
- Configure and security-review the chosen generation/embedding provider; evaluate semantic entailment, citation completeness, prompt-injection resistance, abstention quality, privacy and provider data-retention terms before enabling answer generation.
- Run migration verification, load/security tests, backup/restore drills and independent security review.

No cloud resources, external model APIs or paid hosting were provisioned. This API is not yet production-certified or deployed. The local SentenceTransformer, OCR and parsing can exceed a 512 MB Render Free memory budget. Remote embeddings reduce model memory but do not remove OCR/worker CPU, queue, storage and database constraints.


## Secure Python playground foundation

The first code-playground milestone adds `app/code_execution_contract.py`, a metadata-only validator for an allowlisted `python-3.11` runtime, lesson/test-suite IDs and a 32 KiB UTF-8 source limit. It does not execute, compile or import learner code, and no code-run API or runner is enabled. Its unit tests run with the existing backend pytest suite. See [the milestone plan](../docs/SECURE_PYTHON_PLAYGROUND_MILESTONE_1.md) for the isolation, authorization, quota and security gates required before enabling execution.


## Isolated Python runner provider adapter

`app/runner_provider.py` is a transport boundary for a separately operated sandbox service. It requires an operator-configured HTTPS origin and bearer token, uses fixed paths and short timeouts, disables redirects and ambient proxy settings, sends an idempotency key, and validates bounded result fields. It does not launch code or provide a sandbox itself. No endpoint/token is configured and no execution API is enabled. See [the provider protocol and deployment gates](../docs/PYTHON_RUNNER_PROVIDER_MILESTONE_2.md).


## Authenticated Python code-run API (disabled by default)

The API now exposes `POST /v1/code-runs` and `GET /v1/code-runs/{id}`. A durable dispatch lease ensures only one API request can submit a given idempotent run at a time; a crashed dispatcher can be retried after the bounded lease expires. Both require a trusted Academy JWT. Submission requires a UUID `Idempotency-Key`; source is validated against the allowlisted runtime/lesson contract, sent only to the separately operated HTTPS runner, and never stored in PostgreSQL. The database retains the source SHA-256 digest, tenant/owner, request metadata, bounded output and lifecycle state. PostgreSQL row-level security enforces tenant isolation, while non-admins can read only their own runs. Per-owner hourly/daily quotas are serialized with a transaction-scoped advisory lock.

Execution is **disabled by default**. To enable only after a separately deployed and security-reviewed disposable sandbox is ready, an operator must set `ACADEMY_CODE_EXECUTION_ENABLED=true`, `ACADEMY_CODE_RUNNER_URL` (HTTPS origin), and `ACADEMY_CODE_RUNNER_TOKEN` (secret of at least 24 characters). Defaults are 10 runs/hour and 30/day per owner; tune with `ACADEMY_CODE_RUN_MAX_PER_HOUR` and `ACADEMY_CODE_RUN_MAX_PER_DAY`. If the flag, URL, token, or quota configuration is invalid, submissions fail closed with HTTP 503. No local process execution or shell invocation exists in the Academy API. A runner adapter is not itself a sandbox; do not enable this feature until the external runner enforces disposable isolation, no egress, no credentials/metadata access, hard resource limits and teardown.


## External Python code-run reconciliation

The optional `app.code_run_reconciler` process polls nonterminal code-run IDs against the configured external runner. It leases rows with PostgreSQL `FOR UPDATE SKIP LOCKED`, scopes every query to an operator-supplied tenant, and uses a lease token to prevent an expired worker from overwriting a newer worker's result. Transient runner/network failures are retried with bounded exponential backoff. Runner rejection or invalid protocol responses fail the affected run with a sanitized error code. The worker logs run/tenant IDs and status only; it never logs learner source or runner credentials.

Apply migrations `006_code_run_reconciliation.sql` and `007_code_run_dispatch_claim.sql` after migration 005. Start the optional local process only after an independently operated sandbox has been security-reviewed and explicitly configured:

```bash
ACADEMY_WORKER_TENANT_ID=<trusted-tenant-uuid> \
ACADEMY_CODE_EXECUTION_ENABLED=true \
ACADEMY_CODE_RUNNER_URL=https://<runner-origin> \
ACADEMY_CODE_RUNNER_TOKEN=<secret> \
docker compose --profile code-run-reconciler up code-run-reconciler
```

The feature flag remains false by default. This poller only retrieves existing runner results by durable run UUID; it does not persist or reconstruct learner source and cannot re-submit a run that never reached the runner. For an unknown runner ID, the adapter treats the response as unavailable and retries with backoff. No runner service, credentials, deployment or paid resources are provisioned by this repository change.
