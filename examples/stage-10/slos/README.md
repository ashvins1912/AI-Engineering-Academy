# Stage 10 — SLOs and reliability lab

This deterministic simulator uses synthetic request outcomes and dependency states. It makes no network calls and does not contact providers or queue services.

## Run

```bash
python examples/stage-10/slos/reliability_engine.py
python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v
```

## SLI/SLO design checklist

- Define user-visible eligible events and numerator/denominator rules before selecting a target.
- Track availability, latency, queue wait, TTFT/ITL, freshness and task-quality separately where they represent distinct user outcomes.
- Keep service availability separate from answer correctness and safety. A successful HTTP 200 is not necessarily a successful AI task.
- Define measurement windows, exclusions, sample size, percentile calculation and missing-telemetry behavior.
- Calculate allowed bad events = eligible events × (1 − SLO target).
- Calculate burn rate = observed bad-event ratio / allowed bad-event ratio. Use short and long windows with documented paging and ticket thresholds.

## Resilience controls

- Propagate one end-to-end deadline; downstream timeout is bounded by remaining time.
- Retry only transient failures with capped attempts, exponential backoff, jitter, Retry-After and a shared retry budget.
- Never repeat side effects without idempotency and durable operation-state checks.
- Use per-dependency circuit breakers, bounded half-open probes and bulkheads.
- Bound queues and concurrency; reject/defer early with backpressure.
- Use only fresh, tenant-authorized cache or retrieval-only evidence as fallback. Otherwise return explicit unavailable status.
- Test timeout, 429/5xx, slow stream, queue saturation, duplicate side effects, breaker recovery and provider restoration.

The simulator illustrates arithmetic and state transitions; production requires real traffic measurements, alert routing, dependency-specific tuning and failure drills.
