# Python Runner Provider Adapter — Milestone 2

## What this adds

- An HTTPS-only client for a separately operated isolated runner service.
- Operator-only base URL and bearer token configuration; the browser cannot choose a destination host.
- Fixed API paths, short timeouts, no environment proxy inheritance, no redirects, idempotency keys, bounded response payloads and strict result-state validation.
- Sanitized transport/rejection errors so provider response bodies and source snippets are not leaked into application errors.
- The API sends only a server-allowlisted runtime ID, lesson ID, source text and optional test-suite ID. It does not accept shell commands, images, mounts, environment variables or network settings.

## Runner service protocol

The adapter expects:
- `POST /v1/runs` with JSON `run_id`, `runtime_id`, `lesson_id`, `source`, `test_suite_id` and an `Idempotency-Key` header. The runner must return the same run ID and a state.
- `GET /v1/runs/{run_id}` for status/result polling.
- States: `queued`, `running`, `succeeded`, `failed`, `timed_out`, `resource_limited`.
- Result fields are bounded stdout/stderr, optional exit code/duration, and bounded structured test results.

## Important deployment requirements

This adapter is only a network client; it does not create a sandbox. The configured HTTPS endpoint must be operated independently and must enforce disposable microVM/container isolation, default-deny egress, no metadata access, no credentials, non-root execution, read-only base filesystem, hard CPU/memory/PID/file/output/wall-clock limits, teardown and adversarial security testing. The bearer token must be stored in a secret manager and rotated. The endpoint must be reachable only by the Academy API, not by learners.

No runner URL or token is configured in this repository, and the adapter is not wired to a public endpoint or enabled by default. CI uses a mock HTTP transport. No real code is executed in CI.


## Ambiguous dispatch recovery

A database row in `submitting` means the API has not yet durably recorded that the runner accepted the request. The reconciler deliberately does not poll these rows, even after their dispatch lease expires: a GET for a not-yet-created runner job cannot recover it, and polling could race a retried POST. The client must retry the same `POST /v1/code-runs` with the same idempotency key and identical source while the row remains `submitting`. The API reuses the durable run UUID; the runner's atomic idempotency contract makes this safe whether the original POST was accepted or not. Once the API persists a `queued` or `running` response, the reconciler owns subsequent status polling. Do not expire or delete ambiguous rows automatically.
