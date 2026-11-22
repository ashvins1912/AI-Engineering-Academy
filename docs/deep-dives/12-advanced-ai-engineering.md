# Stage 12 — Advanced AI Engineering & Production Mastery

## Outcome
Engineer durable, interoperable, measurable and secure AI systems under realistic production constraints. This stage extends the Stage 11 integrated capstone with deeper execution semantics and production evidence.

## Topic 1 — Advanced Agent Orchestration and Durable Execution

### 1. Start with the boundary: workflow or agent?
A workflow is the right default when steps, approvals and side effects are known. An agent is useful for bounded decisions—classify a request, propose a plan, select among approved retrieval strategies—but it must not own the authority to execute arbitrary actions. A strong design often uses an agent to propose a typed task graph and a deterministic orchestrator to validate and execute it.

### 2. Model the work as a DAG
A task record should include a stable ID, registered operation name, validated payload, dependency IDs, deadline, retry budget and optional compensation. An edge A→B means B cannot start until A completes. Reject duplicate IDs, unknown dependencies, self-dependencies and cycles before dispatch. Use a deterministic topological order to make planning and tests reproducible.

For a ready task set R and worker bound W, the scheduler may dispatch at most min(|R|, W) tasks. A task becomes eligible only when every dependency is complete. A join node such as publish(draft, review) must wait for both branches.

### 3. Bound execution
Concurrency is a resource budget, not merely a performance setting. Bound workers, queue depth, per-task attempts, wall-clock deadlines, tool calls, tokens and tenant-level concurrency. Apply backpressure instead of creating unbounded work. Propagate cancellation and deadlines to workers; do not assume cancelling a future reverses a side effect already in progress.

### 4. Make retries safe
Classify errors as transient, permanent or ambiguous. Retry only transient failures and only within a finite budget. A timeout is ambiguous: the remote service may have committed the operation while its response was lost. Bind a stable idempotency key to a canonical payload digest and let the destination return the original result. Reject reuse of the same key with different arguments.

### 5. Persist and resume
Persist state transitions and completed results. On restart, reload the checkpoint, skip completed tasks, reconcile interrupted tasks and resume only work that is safe to repeat. Atomic file replacement protects a local JSON journal from partial writes; it does not create a distributed transaction with a remote API. Production systems need durable storage, destination idempotency, transactional outbox/inbox, leases/fencing and reconciliation.

### 6. Compensate instead of pretending to roll back
A saga compensation is a new business action: release a reservation, void an authorization or withdraw a publication. Execute compensations in reverse completion order, persist their outcomes and escalate failures. Compensation may be incomplete, visible or impossible. Keep the original event history.

## Worked numerical example

A plan has four tasks: collect; draft depends on collect; review depends on collect; publish depends on draft and review. With W=2:
- Layer 1: collect (one active worker).
- Layer 2: draft and review (two active workers).
- Layer 3: publish (one active worker only after both branches complete).

If retry_limit=1, a task has at most 1+1=2 attempts. If retry_limit=2, it has at most 3 attempts. This is a hard upper bound, not a promise that retries are safe.

## Architecture and trust boundaries

See [task graph flow](../../examples/stage-12/agent_orchestration/task-graph-flow.mmd). The planner and model output are untrusted. The server validates task schemas and operation names; only registered adapters execute. Identity and tenant context come from verified server state. Workers cannot widen permissions by editing task payloads. Journal storage is integrity-sensitive. Worker output must be validated before downstream use.

## Implementation lab

Run:

```bash
python examples/stage-12/agent_orchestration/durable_runtime.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

The reference implementation demonstrates graph validation, bounded worker concurrency, atomic local checkpoints, a local idempotency ledger, bounded retries, dependency blocking and reverse-order compensation. It uses synthetic operations and does not execute model-generated code.

## Failure diagnosis

| Symptom | Likely cause | Safe response |
|---|---|---|
| No task becomes ready | Dependency cycle or missing dependency | Reject plan before dispatch |
| Side effect repeats after timeout | No destination idempotency | Reconcile using the same stable key |
| Queue grows without bound | No admission control/backpressure | Bound queue, workers and deadlines |
| Publish starts too early | Join dependency not enforced | Require all dependencies completed |
| Restart repeats completed work | Missing durable result/checkpoint | Persist task outcome and operation key |
| Compensation does not restore state | Compensation is not a true rollback | Escalate, reconcile and retain audit evidence |

## Production hardening checklist

- Validate a typed plan against a strict schema and allowlisted operation registry.
- Enforce principal, tenant, capability and resource authorization at each operation boundary.
- Bound concurrency, queue size, retries, deadlines, tokens, spend and tool calls.
- Use destination-native idempotency for every externally visible side effect.
- Persist state transitions, payload digests, outcomes and audit correlation.
- Add lease ownership and fencing tokens for distributed workers.
- Use transactional outbox/inbox patterns for database-to-queue consistency.
- Reconcile ambiguous outcomes; never infer failure from a timeout alone.
- Test duplicate delivery, worker crash, stale owner, partial completion and compensation failure.
- Keep human approval for high-impact actions.

## Mastery defense

1. When is a deterministic workflow safer than an autonomous agent?
2. Why is a DAG cycle rejected before execution?
3. How do you prove a worker limit is respected?
4. Why does a timeout create an ambiguous outcome?
5. What must an idempotency key be bound to?
6. Why can a local checkpoint not guarantee exactly-once remote side effects?
7. What is the difference between retry and compensation?
8. Why do compensations run in reverse completion order?
9. What do fencing tokens protect against?
10. Which properties must be enforced by the destination service?

## Stage 12 sequencing

Topic 1 is the first mastery gate. Topics 2–8 follow only after each preceding topic passes its tests and review. Topic 9 integrates all prior topics in the Advanced Production Practicum. A lesson is not complete merely because its content file exists; it must run from a clean checkout, pass positive and negative tests, demonstrate failure recovery and satisfy its assessment.
