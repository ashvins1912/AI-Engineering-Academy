# Stage 11 — Enterprise Capstone Mastery Defense

Use this pack after the integrated acceptance command passes. It is a learner-led defense: the CI report proves deterministic checks passed, but it does not replace your ability to explain decisions, reproduce behavior and operate the system.

## 1. Before the defense

Run from a clean checkout:

```bash
python examples/stage-11/capstone_acceptance.py
python -m unittest discover -s examples/stage-11 -p 'test_*.py' -v
```

Keep these artifacts ready:
- Context, container, deployment and data-flow diagrams with trust boundaries.
- ADRs for tenancy/storage, retrieval, model gateway, agent/tool boundary and deployment.
- STRIDE and AI abuse-case register with mitigations, negative tests and residual-risk owners.
- API/event contracts and data lineage for document → chunk → retrieval → citation.
- Evaluation report covering retrieval, grounded answers, safety, latency and cost.
- Release manifest with immutable digests, schema/index/prompt versions, SBOM, provenance, signature and rollback target.
- SLOs, error budget, dashboards, alert/runbook ownership, backup/restore and incident timeline.

## 2. Live demo — 20 minutes

| Time | Demonstration | Required evidence |
|---|---|---|
| 0–3 min | Architecture and decisions | Explain scope, requirements, quality attributes, trust boundaries and two important ADR trade-offs. |
| 3–7 min | Tenant-safe RAG | Show Tenant A retrieval, source/page/chunk citation, a no-evidence abstention and a cross-tenant negative test. |
| 7–11 min | Agent and tool authorization | Show a typed action proposal, denied unauthorized mutation, separate scoped approval and idempotent retry after a simulated timeout. |
| 11–14 min | Security and failure handling | Show malicious retrieved text cannot grant tool permissions; explain containment and evidence preservation for a tenant exposure. |
| 14–17 min | Release and rollback | Show immutable release manifest, migration compatibility and a canary threshold breach that halts promotion and selects the previous compatible bundle. |
| 17–20 min | Operations and recovery | Explain SLO/error-budget alert, cost-per-successful-task guardrail, backup restore evidence and incident runbook. |

## 3. Technical defense questions

Answer without reading the lesson. Use a diagram, test, trace or release artifact as evidence.

### Architecture and trade-offs
1. Why use multiple architecture views rather than one component diagram?
2. Which design decision is hardest to reverse, and what alternatives did you reject?
3. When would you choose shared PostgreSQL with RLS versus database-per-tenant? What changes in operations and cost?
4. Which trust boundaries carry identity, tenant context or execution authority?

### RAG, data and security
5. Why must tenant and ACL predicates be applied before retrieval ranking and top-k?
6. How do you prove a citation resolves to the exact source document version, page and chunk?
7. What happens when no authorized evidence is available?
8. How do you defend against indirect prompt injection in retrieved documents?
9. Why can a model-generated tool call never be treated as authorization?

### Agents, tools and protocols
10. How is an action proposal bound to a principal, tenant, capability and resource?
11. What must a human approval be bound to, and how do you prevent replay?
12. What happens if a tool commits a side effect but its response times out?
13. How do MCP and A2A boundaries avoid sharing unrestricted credentials or memory?

### Reliability, evaluation and cost
14. Which SLIs represent availability, latency, quality, freshness and safety? Why keep them distinct?
15. How do error budgets and burn rates change release decisions?
16. Why is cost per successful task more useful than cost per model call?
17. How do cache keys, model routing and retry budgets affect both security and unit economics?

### Delivery and operations
18. Which artifacts belong in an immutable AI release bundle?
19. Explain expand/backfill/switch/drain/contract and why image rollback alone may be unsafe.
20. Which canary signals block promotion even when HTTP health and latency pass?
21. How do you verify a backup can restore tenant-isolated data within RPO/RTO?
22. During a cross-tenant exposure, what do you contain first and what evidence do you preserve?

## 4. Scoring rubric

Score each area from 0 to 4 using demonstrated evidence, not confidence or slide quality.

| Area | 0 | 2 | 4 |
|---|---|---|---|
| Correctness | Core flow fails | Happy path works; edge cases incomplete | Positive and negative paths are reproducible |
| Architecture | Boundaries unclear | Main components shown | Multiple views, ADRs and trade-offs defended |
| Security | Tenant/authorization failure | Some controls, gaps remain | Isolation, least privilege, evidence and attack tests pass |
| Reliability | No failure plan | Basic retries/health checks | SLOs, budgets, breakers, rollback and recovery are tested |
| Evaluation | No quality evidence | Basic examples | Reproducible retrieval/answer/safety evaluation with gates |
| Observability | No useful telemetry | Logs or metrics only | Correlated traces, safe logs, actionable metrics and runbooks |
| Cost | No attribution | Token cost only | Component cost and cost per successful task with budgets |
| Documentation | Missing or stale | Main guide exists | Diagrams, ADRs, contracts and operations pack stay consistent |
| Operability | Cannot recover | Manual recovery described | Staged rollout, backup restore and incident drill demonstrated |

**Pass target:** at least 27/36, with no zero in security, tenant isolation, authorization or data handling. A critical isolation or authorization failure is an automatic stop-ship regardless of total score.

## 5. Incident drill

Run a tabletop or local simulation:
1. Alert indicates possible cross-tenant document exposure.
2. Declare severity and assign an incident commander.
3. Contain the affected retrieval/tool path and pause relevant workers.
4. Preserve redacted traces, audit decisions, release/config digests and affected resource IDs with custody metadata.
5. Rotate exposed credentials and eradicate the root cause.
6. Restore a known-good immutable release only after tenant, cache, vector, object, queue, quality and SLO gates pass.
7. Write a blameless postmortem with owners, due dates and verification tests.

Measure time to detect, contain and recover. Explain why restarting a process is not proof of recovery.

## 6. Final self-check

- [ ] I can draw the architecture and explain the important trust boundaries from memory.
- [ ] I can prove a cross-tenant read is denied before ranking and that citations resolve to authorized source evidence.
- [ ] I can explain why retrieved content and model output are untrusted and show a denied tool action.
- [ ] I can demonstrate scoped approval and idempotent retry after an uncertain tool outcome.
- [ ] I can explain the SLO, error budget, quality gate and cost-per-successful-task metric.
- [ ] I can show an immutable release manifest, compatible migration and canary rollback.
- [ ] I can run the incident drill and describe evidence handling and recovery gates.
- [ ] I can defend the trade-offs and answer the technical questions without the guide.

Do not mark this self-check complete merely because CI is green. CI validates the repository's deterministic acceptance; the learner must perform and explain the defense.
