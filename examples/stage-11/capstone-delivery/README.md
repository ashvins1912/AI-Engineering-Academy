# Stage 11 — Deploy and operate lab

This is an offline release-policy simulator. It does not build containers, sign artifacts, deploy infrastructure or connect to cloud services.

## Run

```bash
python examples/stage-11/capstone-delivery/release_gate.py
python -m unittest discover -s examples/stage-11 -p 'test_*.py' -v
```

## Immutable release manifest

Bind at least:
- source commit and API/event contract versions
- container image digest
- model and embedding-model digests
- prompt/template version
- vector index snapshot/version
- database schema/migration version
- evaluation and safety report references
- SBOM, vulnerability/license report, provenance attestation and signature
- previous compatible rollback release ID and artifact references

Deploy by immutable digest, never by mutable `latest` or branch tags.

## CI/CD gates

Run type/lint, unit/integration/contract, PostgreSQL RLS, retrieval/citation, prompt/tool security, model quality/safety, load, cost, migration compatibility, SBOM/license/vulnerability, signature and provenance gates. Missing evidence blocks promotion.

## Migration lifecycle

1. Expand with backward-compatible schema additions.
2. Deploy code that can read old/new forms.
3. Backfill and verify data and indexes.
4. Switch reads/writes and drain old instances.
5. Contract only after old versions are gone and data is verified.

Destructive changes need a forward-fix or point-in-time restore plan; image rollback alone cannot reverse a schema migration.

## Canary and rollback

Compare candidate to baseline using sample-size-aware error rate, p95 latency, model quality/safety, cost per successful task, queue depth and saturation. Define thresholds before rollout. Any critical breach halts promotion and restores the complete previous compatible bundle (code/image/model/prompt/index/schema). Missing telemetry is not a healthy signal.

## Operations

- Dashboards: user-facing availability/latency, retrieval/model/tool errors, TTFT/ITL, queue wait, quality, safety, cost per successful task and tenant budget.
- Alerts: severity, owner, runbook, escalation and clear mitigation action.
- Health: distinguish liveness, readiness and dependency health; do not expose secrets.
- Recovery: test backup restore, tenant integrity, RPO/RTO, queue replay and rollback.
- Drills: provider outage, vector outage, failed migration, canary regression, compromised artifact and credential rotation.

The simulator checks release decisions and policy logic only. Production requires actual CI evidence, signing, deployment, monitoring and recovery exercises.
