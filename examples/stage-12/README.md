# Stage 12 Topic 1 — Agent orchestration simulator

Run:
```bash
python examples/stage-12/agent_orchestration.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

The reference implementation demonstrates typed task contracts, dependency validation, cycle detection, bounded worker batches, retry budgets, checkpoint snapshots and an in-process idempotency ledger.

## Important production limitations

This is a deterministic teaching simulator. Its checkpoint and idempotency ledger are process-local and are not crash-durable or safe for multiple independent processes. A production implementation needs transactional persistence, plan/schema digests, atomic destination-side idempotency, worker leases, durable queues, cancellation/deadline propagation, compensation, tenant fairness and observability. Exactly-once distributed side effects do not follow from retry logic alone.

The implementation never calls an LLM, external API or network service. No infrastructure is provisioned.
