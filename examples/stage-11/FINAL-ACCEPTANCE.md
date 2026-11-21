# Stage 11 — Final integrated capstone acceptance

Run the end-to-end offline acceptance:

```bash
python examples/stage-11/capstone_acceptance.py
python -m unittest discover -s examples/stage-11 -p 'test_*.py' -v
```

The acceptance script composes all three Stage 11 topics:
1. Architecture and threat model: validates component controls, trust-boundary flows and a critical threat with mitigation/test/owner evidence.
2. RAG and agent vertical slice: proves tenant-scoped citations, no-evidence abstention, untrusted retrieval cannot authorize tools, scoped approval and idempotent replay.
3. Deploy and operate: proves healthy promotion, canary rollback, compatible contract migration and backup restore/tenant-integrity gates.

All fixtures are synthetic and local. No hosted model, external tool, production data, cloud resource or deployment is used. This is a teaching acceptance gate, not production certification.
