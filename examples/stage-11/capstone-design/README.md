# Stage 11 — Architecture and threat-model lab

This lab uses a synthetic enterprise RAG/agent platform and an offline architecture gate. It does not connect to cloud services or execute deployment changes.

## Run

```bash
python examples/stage-11/capstone-design/architecture_gate.py
python -m unittest discover -s examples/stage-11 -p 'test_*.py' -v
```

## Required architecture package

1. **Requirements:** users, user journeys, functional requirements, data classes, retention/residency, workload assumptions and acceptance criteria.
2. **Quality attributes:** measurable security, availability, p95 latency, freshness, task quality, safety, recovery and cost objectives.
3. **System context:** users, external providers, data sources, trust boundaries and system scope.
4. **Container/component views:** gateway, identity, ingestion, data stores, retrieval, model gateway, agent runtime, tool gateway, queues and observability.
5. **Deployment view:** networks, runtime identities, secrets, scaling, failure domains, backup/restore and release artifacts.
6. **Data-flow diagrams:** data classification, encryption, tenant context, authorization, retention, audit and model/tool egress.
7. **ADRs:** context, options, decision, alternatives, consequences and revisit triggers for high-cost-to-reverse choices.
8. **Threat register:** STRIDE plus AI-specific abuse cases; assets, actors, entry points, attack path, likelihood, impact, controls, tests and residual owner.
9. **Acceptance gates:** negative tests for tenant escape, prompt injection, tool abuse, queue replay, supply-chain tampering, provider outage and rollback.

## Control matrix

The simulator checks required controls by component kind and cross-boundary flow properties. It also requires mitigations and test evidence for high/critical threats, plus an owner for critical residual risk. This is a design-completeness check, not proof that the controls are correctly implemented.

## ADR template

- **Title/status/date**
- **Context and constraints**
- **Decision**
- **Alternatives considered**
- **Consequences and trade-offs**
- **Security/reliability/cost implications**
- **Revisit trigger**

## Threat entry template

- ID, category (STRIDE/AI abuse), asset and data classification
- Actor, preconditions, entry point and attack path
- Likelihood and impact (1–5), inherent risk
- Preventive, detective and recovery controls
- Negative test or detection evidence
- Residual risk, owner and acceptance/expiry decision

The architecture package should be reviewed against deployed configuration and tests. A diagram or static checker is not a security certification.
