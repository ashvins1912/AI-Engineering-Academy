# Stage 12 — Final Mastery and Production Readiness Certification

## Purpose

This is a certification gate after the nine Stage 12 topics, not a tenth curriculum topic. It prevents automated repository checks from being mistaken for proof that a learner can explain and defend the engineering decisions.

## Evidence required

The gate requires thirteen candidate-bound records:

- Nine topic mastery records: orchestration, protocol interoperability, retrieval, evaluation, red teaming, inference performance, multimodal systems, governance and the integrated practicum.
- Clean-checkout acceptance report.
- Cross-topic failure-injection report.
- Tenant-isolation/security review.
- Final architecture defense.

Every record must pass, include a non-empty evidence reference, and match the same tenant and release version. Human review is mandatory for orchestration mastery, practicum defense, tenant-isolation review and architecture defense; each needs a named assessor. Duplicate, unexpected, missing, failed, cross-tenant or stale evidence blocks certification. Unresolved high/critical findings block certification.

## Local verification

```bash
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

The CI test uses synthetic evidence to test both allow and deny paths. It does not create learner evidence or mark a learner certified.

## Human mastery protocol

For each topic, the learner should explain the design without notes, draw the data flow and trust boundaries, solve a changed scenario, implement or debug a small variant, and explain production limitations. The assessor records the prompt, learner response, result, date and evidence location.

The architecture defense must explain the end-to-end system, identity/tenant boundaries, failure handling, observability, cost/capacity limits, rollback, governance and unresolved production gaps.

## Safety and scope

All fixtures are synthetic and local. No learner code is executed by the Academy service. No cloud infrastructure is provisioned, no deployment is performed, and no production data or secrets are required. Passing the repository's automated tests is not a claim of regulatory compliance or live production readiness.
