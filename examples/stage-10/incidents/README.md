# Stage 10 — Incident response and recovery lab

This lab uses synthetic incident categories and redacted evidence fixtures. It does not connect to production services, revoke real credentials, modify traffic or execute containment actions.

## Run

```bash
python examples/stage-10/incidents/incident_engine.py
python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v
```

## Incident lifecycle

1. **Detect and declare:** create one incident record, correlate alerts and establish a canonical timeline.
2. **Classify:** assess user impact, security/privacy exposure, scope, persistence and urgency; assign an incident commander.
3. **Contain:** stop active harm using the narrowest effective control (disable a capability, revoke a credential/link, quarantine an artifact, pause a worker, cap spend).
4. **Preserve evidence:** collect redacted logs, traces, request IDs, artifact/config digests and queue metadata with source, collector, timestamp, access and transformation records.
5. **Eradicate:** remove the root cause, rotate exposed credentials, invalidate unsafe cache/index state and add regression tests.
6. **Recover:** restore a known-good immutable release through a canary only after security, data-integrity, AI quality/safety, SLO and cost gates pass.
7. **Learn:** publish a blameless timeline and corrective actions with owners, due dates and verification evidence.

## Category playbooks

- Tenant exposure: block affected data paths, revoke links, pause workers, inventory affected resources and validate RLS/cache/vector/object/queue boundaries.
- Artifact compromise: quarantine digest, stop promotion, identify deployed digests, restore trusted signed/provenance-verified artifact.
- Provider outage: open breaker, cap retries, use safe fresh cache/retrieval-only or explicit unavailable response.
- Unsafe tool action: disable capability, revoke tool credentials, inspect idempotency ledger and require human approval before re-enable.
- Cost runaway: cap/suspend expensive workflow, enforce tenant budget and preserve usage ledger.

## Evidence handling

Preserve originals under restricted access where policy permits; create redacted derived copies for broad response use. Record source, collector, collection time, digest, access history and redaction/transformation notes. Rotate exposed credentials; never keep a live secret solely for forensic convenience. Follow legal/privacy retention and notification requirements with authorized owners.

## Recovery gates

Do not resume normal traffic until relevant controls pass: tenant isolation, data integrity, artifact signature/provenance, credential rotation, cache/vector/object ACLs, queue authorization/idempotency, model quality/safety, SLO health, cost guardrails and monitoring. Roll back by immutable digest, not mutable tag.

## Postmortem

Include impact, detection, timeline, containment, root and contributing causes, what helped/hindered response, and corrective actions. Each action requires an owner, due date and verification method. Keep the review blameless and operationally accountable.

The simulator validates lifecycle and policy logic only. It does not determine real breach scope, legal notification duties or forensic attribution.
