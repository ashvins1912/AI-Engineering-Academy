# Stage 12 Topic 1 — Advanced agent orchestration

A local, deterministic lab for dependency graphs, bounded parallelism, checkpoints, retries, idempotency and compensating actions. No model API, cloud service or learner-supplied code execution is used.

## Run

```bash
python examples/stage-12/agent_orchestration/durable_runtime.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

Expected demo summary: `status=completed completed=4/4 max_in_flight=2`.

## Architecture

1. A planner accepts typed task records; it does not accept executable source.
2. Graph validation rejects duplicate IDs, missing dependencies and cycles.
3. The scheduler submits only tasks whose dependencies have completed.
4. A fixed worker pool bounds concurrency.
5. The journal atomically replaces a JSON checkpoint after each state transition.
6. An idempotency ledger binds an operation key to a canonical payload digest and result.
7. On terminal failure, dependent work is blocked and registered compensations run in reverse completion order.

## Failure drills

- Change a dependency to a missing task or create a cycle: plan validation fails before work begins.
- Set `retry_limit=1` and inject one transient error: exactly two attempts are allowed.
- Inject a permanent error: dependent tasks remain blocked and completed compensatable tasks are undone in reverse order.
- Reopen the same journal after completion: completed tasks are not executed again.
- Reuse an idempotency key with changed arguments: the journal rejects the payload mismatch.

## Important production boundary

The JSON journal is a local teaching checkpoint, not a distributed database. Atomic file replacement protects a local checkpoint from partial writes, but it cannot atomically commit a remote payment, email, database mutation or API request together with that file. Production side effects must use destination-native idempotency keys, transactional outboxes, durable workflow state, leases/fencing where appropriate, and reconciliation. Compensation is a new business action, not a magical rollback of an already observed external effect. This simulator is not a sandbox and never executes arbitrary code.
