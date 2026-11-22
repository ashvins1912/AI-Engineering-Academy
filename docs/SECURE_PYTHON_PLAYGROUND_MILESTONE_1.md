# Secure Python Playground — Milestone 1

## Delivered in this milestone

- A small, dependency-free Python submission contract at `backend/app/code_execution_contract.py`.
- A single allowlisted runtime identifier (`python-3.11`), lesson/test-suite identifier validation and a 32 KiB UTF-8 source limit.
- Unit tests for unsupported runtime names, path-like identifiers, empty/oversized source and the absence of caller-controlled execution settings.
- The validator performs metadata validation only. It never evaluates, imports, compiles or launches learner code.

## Deliberately not enabled

There is no `POST /v1/code-runs` execution endpoint yet, no process launcher and no runner credentials. This avoids presenting an API that appears to execute safely when the isolation layer is not present. The Academy API process must never execute submitted source.

## Next implementation gate

Build a separate runner service behind a private service boundary. The API should authenticate the learner, validate against this contract, enforce per-user/tenant quotas, enqueue an opaque run ID, and poll a bounded result. The runner must execute each submission in a disposable gVisor/Kata/Firecracker-class sandbox (provider decision still open), with default-deny egress, no host mounts or credentials, non-root identity, read-only base image, hard CPU/memory/pid/file/output/wall-clock limits, and guaranteed teardown.

The runner protocol must accept only server-owned runtime and test-suite IDs. It must never accept arbitrary image names, shell commands, environment variables, mounts, host paths or network policy from the browser. Test suites must be versioned and selected by the server from lesson metadata.

## Acceptance gates before enabling Run

1. Threat model and isolation technology reviewed.
2. Per-run sandbox lifecycle and cleanup tested under crashes/timeouts.
3. Adversarial tests cover fork bombs, memory exhaustion, filesystem traversal, network/metadata access, output flooding and process escape attempts.
4. Authentication, ownership checks on every poll, tenant/user quotas, abuse throttling and audit events are implemented.
5. CI tests validate the runner adapter and API authorization boundaries.
6. Cost estimate and explicit deployment approval are obtained.

No cloud resources, paid providers or deployments were created by this milestone.
