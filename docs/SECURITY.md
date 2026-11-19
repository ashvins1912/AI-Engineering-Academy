# Security requirements

## Agent and tool safety
- Least privilege for every tool; deny by default.
- Separate read-only and mutating tools.
- Require human approval for payments, deletion, external messaging, production changes and other consequential actions.
- Validate tool arguments against strict schemas.
- Apply per-tool timeouts, quotas, rate limits, retries and idempotency.
- Treat retrieved documents, browser content and tool output as untrusted input.
- Defend against direct and indirect prompt injection; do not rely on prompt instructions alone.

## Code execution
- Never execute student code inside the API process.
- Use disposable isolated workers/containers with CPU, memory, process, wall-clock and output limits.
- Disable network by default; use explicit allowlists when required.
- Run as non-root, read-only filesystem where possible, no host mounts and no secrets.
- Kill process trees and clean artifacts after completion.

## RAG and multi-tenancy
- Enforce authorization before retrieval and again before returning evidence.
- Partition indexes or apply server-enforced tenant/user filters.
- Do not trust metadata filters supplied by the client.
- Track document source, version, owner and access policy.
- Prevent cross-tenant cache leakage; include tenant and authorization scope in cache keys.

## Secrets and identity
- Provider keys live only in server-side secret management.
- Use short-lived tokens, scoped permissions and rotation.
- Record audit events for sensitive actions.
- Never log credentials, full sensitive prompts or personal data unnecessarily.

## Browser document ingestion safeguards
- PDF/DOCX parsing in the browser remains a teaching path; file bytes are not sent to an API.
- Accept only `.pdf` and `.docx`, validate file signatures and enforce 10 MB, 50-page and 500,000-character limits.
- Treat extracted text as untrusted input. Do not render it as HTML or execute macros/scripts.
- This client parser is not a malware scanner or production ingestion service.

## Server-side document API security
- Verify signed RS256 JWTs, issuer, audience, expiry, issued-at and required tenant/user UUID claims. Prefer HTTPS JWKS with bounded caching and key rotation; static RS256 PEM is fallback only.
- Derive tenant scope only from signed claims; never trust tenant IDs supplied by clients.
- Constrain every document/chunk query by tenant and enforce PostgreSQL RLS. Connect with a dedicated role that is neither superuser nor BYPASSRLS.
- Enforce request-body limits before multipart parsing. Keep upload, page and extracted-text limits.
- CI includes JWT verification tests and an opt-in PostgreSQL RLS integration test using `ACADEMY_TEST_DATABASE_URL`.
- Remaining release gates: actual Academy identity-provider integration, durable isolated ingestion workers, malware scanning, encrypted object storage if raw-file retention is required, distributed rate limiting and tenant quotas, audit/metrics, backups, load tests and independent security review.
- The current ingestion endpoint performs OCR and embeddings synchronously in the request and is not suitable for public production exposure or a 512 MB Render Free instance.
