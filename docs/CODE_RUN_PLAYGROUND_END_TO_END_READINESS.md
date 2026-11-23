# End-to-end Python playground integration and readiness

## What this milestone delivers

The Academy lesson workbench can now host an authenticated Python execution panel backed by the existing API contract:

- `POST /v1/code-runs` with `runtime_id=python-3.11`, a normalized lesson slug, source, and a UUID `Idempotency-Key`.
- `GET /v1/code-runs/{run_id}` for accepted queued/running jobs.
- Same-key/same-source retry for ambiguous dispatch. The browser keeps the source and key in React memory only; it does not put source, tokens, or keys in localStorage, sessionStorage, URLs, analytics, or logs.
- Bounded source size (32 KiB), authenticated requests, no cross-origin credentials/cookies, explicit execution status, output and test-result rendering.
- No retry with a new key after a network ambiguity. Editing is locked until the learner starts a new run, preventing accidental idempotency conflicts.

## Enable the host integration

The public Academy UI intentionally remains disconnected unless both settings exist.

1. Set `VITE_CODE_RUNS_API_URL` to the HTTPS origin of the Academy API (for example, `https://api.example.edu`). Do not append an endpoint path.
2. The host authentication layer must inject a short-lived access-token callback before the lesson UI mounts:

```ts
window.__ACADEMY_AUTH__ = {
  getAccessToken: async () => authSession.getAccessToken(),
}
```

The callback must return a current access token or `null`; it must refresh through the host's supported auth SDK and must never expose refresh tokens to the playground. Do not implement token storage in this component. The existing repository does not yet include a learner sign-in provider, so this bridge is an integration seam, not a claim that authentication is configured.

3. Configure API CORS for the exact deployed Academy UI origin and ensure the API's existing JWT issuer, audience, tenant and owner checks remain enabled.
4. Keep `ACADEMY_CODE_EXECUTION_ENABLED=false` until the external runner passes the security acceptance criteria below. A configured UI or API URL alone does not enable execution.

## Submission and recovery behavior

- The browser generates one UUID idempotency key per learner submission.
- The exact source snapshot remains in component memory and is reused on retry. The editor is locked while that key is active; starting a new run creates a new key.
- A transport error, HTTP 503, or a `submitting` response is ambiguous. The learner may retry the original POST with the same key and unchanged source. The API dispatch lease and runner-side idempotency key prevent duplicate execution.
- The reconciler polls only confirmed `queued`/`running` jobs. It must not poll `submitting` rows because source is intentionally not stored by the API.
- Polling stops when the API reports a terminal state. A failed status refresh does not discard the run ID or source snapshot.

## External runner contract

The separately operated runner must:

- Accept only the documented `POST /v1/runs` and `GET /v1/runs/{run_id}` protocol over HTTPS.
- Atomically implement durable create-or-return semantics for `Idempotency-Key`: same key and identical request returns the original run; same key with a different payload is rejected.
- Persist the key-to-run mapping before acknowledging acceptance and survive process restarts.
- Enforce a real isolation boundary (dedicated ephemeral VM/microVM or equivalently hardened sandbox), non-root execution, read-only base image, disposable workspace, no host/container socket, no host mounts, no ambient credentials, and no access to Academy control-plane secrets.
- Deny outbound network by default; use explicit dependency images or reviewed package mirrors rather than learner-controlled package installation.
- Apply CPU, memory, process, file-size, disk, wall-clock, output, concurrency and queue limits; terminate the entire process tree on timeout/cancel.
- Validate runtime and test-suite allowlists server-side; never accept arbitrary image names, commands, mounts, environment variables or callback URLs from learners.
- Redact errors and logs; never log source, bearer tokens, or secret environment values.
- Return bounded, schema-valid output and stable run IDs; support cancellation and cleanup/retention policy before those capabilities are exposed in the UI.

## Production acceptance checklist

- [ ] A supported learner authentication provider is integrated through the token bridge.
- [ ] API CORS, JWT issuer/audience, tenant isolation, owner isolation and quotas are verified in the target environment.
- [ ] Runner idempotency is tested under concurrent duplicate POSTs and lost-response retries.
- [ ] Sandbox escape, filesystem, network, process, resource-exhaustion and cross-tenant isolation tests pass.
- [ ] Queue backpressure, worker restart, lease expiry, reconciliation, cancellation and cleanup are tested.
- [ ] Security review signs off on the runner image, host hardening, secrets, logging, retention and incident response.
- [ ] End-to-end learner tests cover success, syntax error, timeout, quota rejection, 401, runner unavailable, ambiguous dispatch and duplicate submission.
- [ ] Only then may an operator explicitly enable code execution and configure runner credentials.

## Explicit non-goals

This PR does not deploy or provision a runner, create credentials, enable execution, persist learner source, install dependencies at runtime, or claim that arbitrary learner code can currently execute. The local learning examples and deterministic visualizers remain available when remote execution is disconnected.


## Client resilience hardening

The playground client bounds network waits independently of the runner's server-side deadline:

- Submission requests abort after 25 seconds; status reads abort after 8 seconds. A submission timeout is treated as an ambiguous outcome, never as proof that execution did not start.
- An ambiguous timeout or transient service/session/quota condition exposes a same-key retry. The original source remains locked and unchanged for that retry.
- Idempotency conflicts and request validation failures do not offer a blind retry; the learner must start a new run after correcting the request.
- API run records are checked for required identity, recognized lifecycle state and correctly typed result fields before the UI renders them. Invalid records are surfaced as service-contract errors rather than trusted as successful execution.
- Status polling uses the same bounded request helper and retains the last known run when a refresh fails.

The timeout is a client-side wait bound only. It does not cancel server-side work or prove that a runner stopped; cancellation remains unavailable until the separately operated runner supports and verifies it.


### Authentication callback deadline

The same client deadline covers both host token acquisition and the HTTP request. A host `getAccessToken()` callback that stalls cannot leave the playground's submit or status request waiting indefinitely. If the deadline expires, the UI treats a submission as ambiguous and preserves the same-key retry behavior. The callback is still owned by the host application; this does not add or assume an identity provider.
