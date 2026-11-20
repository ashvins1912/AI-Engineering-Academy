# Stage 5 — RAG Production Acceptance Runbook

## Purpose and release status

This runbook defines the evidence required to promote the Stage 5 RAG curriculum and backend from a validated educational/integration baseline to a production-approved service.

**Current disposition: NOT PRODUCTION ACCEPTED.** The repository's automated CI is green, including the Stage 5 curriculum validator, production-RAG contract validator, Python unit tests and backend pytest suite. Those checks establish that the current code and declared contracts pass their automated tests; they do not establish that a live identity provider, PostgreSQL deployment, object store, malware scanner, embedding provider or generation provider has been configured and exercised.

Do not mark this release accepted until every mandatory gate below has an attached run ID, environment description, test result and reviewer sign-off. A skipped test is not a pass.

## Current implementation boundary

The current backend includes:

- RS256 JWT validation with issuer/audience checks and optional HTTPS JWKS.
- Tenant-scoped PostgreSQL/pgvector retrieval and row-level security.
- Dense retrieval, a tenant-local BM25 implementation and reciprocal-rank fusion.
- PDF/DOCX ingestion, optional OCR, asynchronous ingestion jobs, retry/lease handling and dead-letter replay.
- Private local storage and an S3-compatible SSE-KMS adapter.
- Optional ClamAV scanning.
- An OpenAI-compatible embeddings adapter and an OpenAI-compatible grounded-generation adapter.
- Exact retrieved-source and exact-quote citation validation, with abstention on invalid citations.
- PostgreSQL-backed shared API rate limiting and trusted-proxy IP resolution.

The following are intentional development defaults or documented limitations, not production approvals:

- Local object storage is the default and is not durable/shared across ephemeral instances.
- Malware scanning is not required by default.
- Local SentenceTransformers is the default embedding provider and can be memory-intensive.
- Grounded generation is disabled by default.
- OCR confidence is not persisted; complex page layouts and image evidence are not preserved by the current parser.
- The current ACL model supports user grants only; there is no public ACL grant/revoke endpoint or verified group-membership resolver.
- Exact quote validation proves that a quote exists in retrieved evidence; it does not prove that every answer claim is semantically entailed.
- Bucket objects orphaned before a job row exists require bucket lifecycle/inventory reconciliation.

## Mandatory release gates

### Gate A — Environment and configuration

- [ ] Production environment uses HTTPS end to end; no development CORS origins are allowed.
- [ ] Identity configuration uses the intended issuer and audience, trusted HTTPS JWKS (preferred) or a managed RS256 public key, key rotation and short-lived tokens.
- [ ] The API and workers use a restricted PostgreSQL role that is not a table owner, superuser or BYPASSRLS role.
- [ ] Migrations 000–004 are applied in order and recorded; schema drift is checked.
- [ ] Production storage uses a private S3-compatible bucket, public access blocks, SSE-KMS, least-privilege IAM, versioning/retention policy and tested deletion. Local storage is prohibited for horizontally scaled or ephemeral production.
- [ ] Malware scanning is required for untrusted uploads; scanner-unavailable behavior is verified to fail closed.
- [ ] Embedding provider, model ID/revision, dimension, normalization and tokenizer contract are pinned. Do not silently mix vectors from different models or dimensions.
- [ ] Generation remains disabled until a provider, key, model, timeout and output contract are explicitly configured.
- [ ] Secrets are supplied through a secret manager; no credentials appear in source, images, logs or CI artifacts.
- [ ] Trusted proxy IP/CIDR ranges are exact and verified; forwarded headers from untrusted peers are ignored.

**Evidence:** redacted effective configuration, migration ledger, IAM/bucket policy review, identity/JWKS rotation test and secret-scanning result.

### Gate B — Identity, tenant isolation and document authorization

Run integration tests against PostgreSQL using the actual restricted application role (not a superuser or owner).

- [ ] Missing, malformed, expired, not-yet-valid, wrong-issuer, wrong-audience, wrong-algorithm and unknown-key tokens are rejected.
- [ ] Tenant and user identity are derived only from signed claims; request body, query string and headers cannot override them.
- [ ] RLS is enabled and forced for documents, chunks, ACL rows, ingestion jobs and rate-limit counters as applicable.
- [ ] Tenant A cannot list, search, answer from, inspect, cancel, delete or replay Tenant B resources—even when IDs are guessed.
- [ ] A private document is visible only to its owner, an authorized user grant or a tenant administrator.
- [ ] Tenant-visible documents are visible only within the same tenant.
- [ ] Tenant administrator privileges never cross tenant boundaries.
- [ ] ACL grants cannot be created by a client-controlled tenant/user/group identifier. Any future grant endpoint must use a trusted membership resolver and audit grant/revoke events.
- [ ] Retrieval candidates are ACL-filtered before prompt construction; unauthorized evidence never reaches the generation provider.
- [ ] Deletion removes or renders inaccessible document chunks, raw objects and derived artifacts according to the retention policy.

**Hard stop:** any cross-tenant or unauthorized document disclosure is a release-blocking security defect.

### Gate C — Ingestion, parsing and durable job lifecycle

Exercise the real API, object store, scanner, database and worker together.

- [ ] Valid PDF and DOCX uploads produce immutable source hashes, page/chunk provenance and a durable queued job.
- [ ] Spoofed MIME, mismatched extension, corrupt/encrypted files, empty files, oversized files, excessive PDF pages, oversized DOCX expansion and parser timeouts are rejected safely.
- [ ] EICAR test file (or the security team's approved harmless scanner fixture) is blocked when scanning is required.
- [ ] Scanner outage fails closed; no upload silently bypasses a required scan.
- [ ] Worker crash before claim, during parsing, after object read and before commit is recoverable without duplicate chunks or partially visible documents.
- [ ] Concurrent workers cannot claim the same active job; expired leases can be reclaimed.
- [ ] Retry count, bounded backoff, terminal dead-letter state and administrator replay are verified.
- [ ] Queued cancellation, processing cancellation conflict and replay after raw-object retention expiry behave as documented.
- [ ] Duplicate document ingestion is idempotent within a tenant and does not leak across tenants.
- [ ] Retention cleanup and bucket-level orphan reconciliation are tested; deletion failures are observable and retried.

**Evidence:** sanitized end-to-end trace for success, rejection, retry, dead-letter, replay, cancellation and cleanup.

### Gate D — Embeddings and retrieval quality

Evaluate against a versioned, labeled corpus and held-out query set. Record embedding model/revision, corpus hash, chunking configuration and retrieval settings.

- [ ] Embedding responses are checked for count, order, dimension and finite values.
- [ ] Query and document embeddings use compatible model revisions and normalization.
- [ ] Re-indexing after model or chunking changes is versioned; mixed vector spaces are prohibited.
- [ ] Dense-only, BM25-only and hybrid RRF results are compared on the same held-out set.
- [ ] Report Recall@5, MRR@10, nDCG@10, answer-bearing chunk recall, p50/p95 retrieval latency and cost per query.
- [ ] Include exact identifier, paraphrase, spelling variation, multilingual, acronym, negation, stale-document, duplicate and no-answer queries.
- [ ] Confirm all retrieval SQL paths apply tenant and document ACL predicates before candidates are returned.
- [ ] Compare the in-database BM25 tokenizer/normalization against a trusted benchmark for supported languages; document unsupported language behavior.
- [ ] Set acceptance thresholds before the final run. Proposed starting release targets: Recall@5 ≥ 0.90 on the agreed answerable golden set; no-answer retrieval must not be mistaken for sufficient evidence; and no unauthorized result in the full adversarial suite. Thresholds must be reviewed against the actual domain and corpus before sign-off.

**Hard stop:** any unauthorized candidate or cross-tenant result is an automatic failure regardless of aggregate retrieval scores.

### Gate E — Grounded generation, citations and abstention

Generation must be explicitly enabled only in a controlled staging environment first.

- [ ] Provider authentication, TLS, timeout, rate limit, response schema and maximum token limits are tested.
- [ ] Provider outage, malformed JSON, schema mismatch, empty response and timeout return safe errors without leaking prompts or secrets.
- [ ] No evidence causes abstention without calling the provider.
- [ ] Fabricated source IDs, fabricated quotes, duplicate citations and quotes outside the retrieved context force abstention.
- [ ] Prompt injection inside retrieved documents is treated as untrusted data and cannot authorize tools, change policy or override system instructions.
- [ ] Every material answer claim is reviewed for entailment, not merely the existence of one exact quote.
- [ ] Conflicting, stale, irrelevant and insufficient evidence produces abstention or a clearly bounded answer.
- [ ] The answer evaluation set measures citation precision, claim-level support/faithfulness, answer correctness, abstention precision/recall and harmful false-answer rate.
- [ ] Human review signs off on the golden-set sample and adversarial cases.

**Hard stop:** a fabricated citation, unsupported high-impact claim or disclosure of unauthorized evidence blocks release. Exact-span matching alone is insufficient for semantic faithfulness acceptance.

### Gate F — Reliability, abuse resistance and observability

- [ ] Rate limiting is shared across API replicas and returns 429 with Retry-After at the configured threshold.
- [ ] Database outage fails closed for rate limiting; recovery does not reset counters per process.
- [ ] Trusted proxy CIDR handling is verified with valid, malformed and spoofed forwarded headers.
- [ ] Request body, upload, parser, OCR, embedding, generation and context budgets are bounded.
- [ ] Load tests cover expected concurrency and sustained ingestion/retrieval; record p50/p95/p99 latency, error rate, queue age, DB pool saturation, memory and provider throttling.
- [ ] Structured logs and traces include correlation/request IDs, tenant-safe identifiers, job state and provider timing without raw document text, secrets, tokens or unnecessary personal data.
- [ ] Alerts cover queue age, dead-letter growth, cleanup failures, provider errors, database saturation, 429/503 rates and storage failures.
- [ ] Backup restore, database point-in-time recovery, object recovery and incident response are rehearsed.
- [ ] Dependency and container image scanning, SBOM and vulnerability review are recorded.

### Gate G — Release decision

- [ ] Gates A–F have evidence attached and no unresolved critical/high severity issue.
- [ ] Security reviewer signs tenant isolation, identity, storage and upload controls.
- [ ] ML/product reviewer signs retrieval and answer-quality evaluation.
- [ ] Operations reviewer signs capacity, recovery, monitoring and rollback.
- [ ] Rollback procedure and data/migration compatibility are rehearsed.
- [ ] Production enablement is approved explicitly; do not provision paid services or deploy as part of this curriculum validation without separate approval.

Record: release candidate commit, environment, corpus/golden-set hashes, CI run URL, integration run IDs, metric report, security findings, reviewer names/roles and decision date.

## Execution sequence

1. Run the existing green CI suite on the exact release candidate.
2. Provision only an isolated, disposable staging environment approved for testing; use no production data.
3. Apply migrations 000–004 and verify the restricted-role RLS behavior.
4. Execute Gates A–C with real identity, storage, scanner and worker integrations.
5. Freeze the corpus and embedding revision; execute Gate D and agree thresholds before tuning.
6. Enable generation only in staging; execute Gate E with golden and adversarial tests.
7. Execute Gate F, recovery drills and security review.
8. Publish the evidence bundle and make a formal GO/NO-GO decision under Gate G.

A green CI result is necessary but not sufficient. Until all gates are signed, the accurate status remains **curriculum and code-contract validated; production acceptance pending**.
