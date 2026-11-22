# Stage 12 — Individual lesson lab pack: Advanced AI Engineering & Production Mastery

Run all exercises locally with synthetic fixtures. The Academy does not execute learner code. Capture the test output, checkpoint snapshots and short design explanations as submission evidence.

## agent-orchestration — Advanced Agent Orchestration and Durable Execution

**Implementation task:** Build a typed task DAG, validate IDs/actions/dependencies/cycles, schedule ready work with a bounded worker pool, record attempts and terminal states, retry transient failures within a fixed budget, and resume from a serialized checkpoint. Use stable idempotency keys for side effects.

**Worked fixture:** A report workflow has ingest → retrieve → answer. A separate sentiment task also depends on ingest and can run in parallel with retrieve. The worker limit is two. A retrieve worker fails transiently once; a separate run simulates a permanent failure. Another scenario commits a write but loses the acknowledgement before checkpointing.

**Expected result:** Invalid graphs are rejected before side effects; only ready tasks run; in-flight work never exceeds the configured bound; transient failure retries within budget; permanent failure blocks dependents; restored completed tasks are not repeated; a repeated key with changed payload is rejected.

**Verification tests:** Run `python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v`. The suite covers dependency ordering, checkpoint restore, cycles, unknown dependencies, duplicate IDs, unknown actions, retry limits, dependency failure propagation, idempotency and invalid checkpoint state.

**Debugging checklist:** Inspect graph edges and topological readiness; verify task IDs and action registry; record max in-flight count; distinguish transient from permanent errors; inspect attempt counters; compare checkpoint plan/version; confirm idempotency key stability and payload digest; ensure tenant and capability context comes from verified server state.

**Interview checks:** Why use a DAG rather than a prompt-only plan? What is the difference between retry and compensation? Why does a checkpoint alone not guarantee exactly-once effects? How do you handle a crash after a destination commits but before the worker acknowledges? What must be bounded besides concurrency? How do you prevent a delegated agent from expanding authority?

**Submission evidence:** Include the task graph, execution trace, test output, serialized checkpoint, failure-injection result, idempotency demonstration, concurrency-bound explanation and a production gap analysis covering durable storage, leases, transactional idempotency, cancellation, compensation and tenant fairness.

---
