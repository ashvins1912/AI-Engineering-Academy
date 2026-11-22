# Secure Code Execution and Assessment Roadmap

## Assessment engine delivered

Every lesson detail view now includes a topic-aware workflow checkpoint. Questions are generated from that lesson's actual workflow sequence, rather than a generic question bank. Learners choose the next operation at several points, receive per-question explanations, and complete a four-part evidence-based self-assessment. Results are stored locally per lesson in the browser. A checkpoint pass requires a perfect workflow sequence score and at least three of four rubric statements.

This is formative assessment, not proctored certification. Local browser storage is not an authoritative record of identity, grades or completion; it can be cleared or modified by the learner. Server-side mastery, cohorts, instructor review and cross-device synchronization require authenticated persistence and are not included.

## Code execution security boundary

The existing lesson practice workbench is an editable learning surface, not an execution environment. Do not execute learner-provided code in the Academy API process, the browser main thread, or a shared long-lived worker. A production runner must be a separately deployed, isolated service with:

- Disposable per-run containers or microVMs; non-root UID, read-only root filesystem, no host mounts, no Docker socket and no ambient credentials.
- Default-deny network egress, no cloud metadata access, no cross-run filesystem or process visibility, and no access to Academy databases or object storage.
- Hard CPU, memory, process-count, file-size, output-size and wall-clock limits enforced outside the submitted process.
- Ephemeral workspace and teardown after every run; image allowlists and pinned, scanned runtime images.
- Authenticated submission, tenant/user quotas, abuse throttling, request size limits and auditable run metadata without storing secrets or unnecessary source code.
- Structured result contract: run ID, queued/running/finished state, stdout/stderr byte-limited, exit code, timeout/resource-limit status, and bounded test results.
- Security testing for fork bombs, infinite loops, memory exhaustion, filesystem traversal, network access, metadata endpoints, output flooding and malicious package installation.

### Proposed API contract (not implemented)

`POST /v1/code-runs` accepts a server-defined runtime ID, lesson ID, source text, and optional allowlisted test-suite ID. It must not accept arbitrary image names, shell commands, mount paths, environment variables or network settings. It returns `202` with a run ID. `GET /v1/code-runs/{id}` returns the bounded result after rechecking ownership and tenant scope on every poll. The API authenticates and authorizes but never executes code itself.

### Safe implementation sequence

1. Choose and threat-model a dedicated runner provider or isolated self-hosted runtime; estimate per-run and idle costs.
2. Build an adapter behind a disabled-by-default feature flag and a strict runtime/test-suite allowlist.
3. Add authenticated queueing, quotas, result polling, cleanup and audit events.
4. Run adversarial isolation tests and load tests in a disposable environment.
5. Enable only after independent security review and explicit deployment/cost approval.

No runner service, cloud resource, external execution provider or paid dependency has been provisioned. Executable learner code remains disabled until the isolation boundary exists.
