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
- PDF and DOCX parsing currently runs in the learner's browser; file bytes are not sent to an API.
- Accept only `.pdf` and `.docx`, and validate the PDF or ZIP container signature before parsing.
- Enforce a 10 MB file limit, 50-page PDF limit and 500,000-character extracted-text limit.
- Treat extracted text as untrusted input. Do not render it as HTML or execute macros/scripts. DOCX extraction is raw-text only.
- Scanned PDF OCR is not implemented. Do not claim image/table OCR or visual understanding from this text parser.
- This client-side parser is an educational ingestion feature, not a malware scanner or a substitute for server-side isolation, antivirus scanning, quotas and tenant ACL enforcement in a production ingestion service.
