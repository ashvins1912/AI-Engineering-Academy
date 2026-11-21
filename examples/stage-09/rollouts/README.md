# Deployment strategies lab

This lab uses deterministic local policy code. It does not connect to a cluster, route production traffic, deploy a model or provision infrastructure.

## Run

```bash
python examples/stage-09/rollouts/rollout_policy.py --scenario examples/stage-09/rollouts/rollout-scenario.json
python -m unittest discover -s examples/stage-09 -p 'test_rollouts.py' -v
```

## Release contract

Treat a release as one immutable bundle: model and tokenizer digests, prompt version, retrieval-index/schema version, runtime image, tool policy, evaluation report and configuration. Validate backward compatibility and preserve the last known-good bundle before traffic changes.

## Strategy selection

| Strategy | User exposure | Main strength | Main risk |
|---|---|---|---|
| Rolling | Gradual replacement | Simple and capacity efficient | Mixed-version compatibility |
| Blue-green | Atomic switch | Fast reversal | Duplicate environment capacity |
| Canary | Small real cohort first | Measures production behavior | Sampling bias and low traffic |
| Shadow | Candidate sees copied requests | Safe output comparison | Compute and privacy costs |
| A/B | Stable cohorts | Experiment measurement | Statistical and cohort contamination |

## Promotion policy

- Pin the candidate artifacts and verify provenance, compatibility and evaluation.
- Start at the first configured traffic weight; observe a fixed window and minimum sample count.
- Gate on p95/p99, error rate, model quality, safety and cost—not average latency alone.
- Missing or stale telemetry means hold, never promote.
- A breached guardrail stops progression and restores the last known-good bundle.
- Make promotion and rollback idempotent and append a privacy-safe audit record.

## Production checklist

1. Declare owner, hypothesis, rollout strategy, observation window and abort conditions.
2. Confirm rollback artifacts and schema/index compatibility before starting.
3. Keep shadow tools read-only and suppress external side effects.
4. Keep A/B assignment stable and isolate tenant cohorts.
5. Verify post-release SLOs and execute a rollback drill.

The included simulator's values are policy fixtures, not benchmark or production telemetry.
