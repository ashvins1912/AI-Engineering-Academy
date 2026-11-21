# Stage 11 — Individual lesson lab pack: Enterprise Capstone & Architecture

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## capstone-design — Architecture and threat model

**Implementation task:** Produce a review-ready design pack for a multi-tenant knowledge and operations platform: functional/non-functional requirements, workload assumptions, context/container/component/deployment/DFD views, trust boundaries, ADRs, STRIDE and AI-specific threats, mitigations, negative tests and residual-risk owners.

**Worked fixture:** Tenant admins and members upload policy PDFs; ingestion stores originals and embeddings; RAG returns cited passages; agents may call read-only MCP tools while mutations require approval; A2A specialists receive bounded tasks. A missing vector/cache tenant filter is a critical information-disclosure threat.

**Expected result:** Tenant identity and authorization are explicit across SQL/vector/cache/object/queue paths; model output cannot grant tool permissions; ADRs record alternatives and consequences; critical threats have mitigations, negative tests and owners; architecture gate blocks missing controls.

**Verification tests:** Run `python -m unittest discover -s examples/stage-11 -p 'test_*.py' -v`. Test risk scoring, required component controls, encrypted/authenticated cross-boundary flows, tenant context, server authorization, ADR completeness and high-risk threat evidence.

**Debugging checklist:** Trace each identity and data path; mark trust transitions; compare deployed component responsibilities with diagrams; inspect ADR alternatives; map each abuse case to an asset and entry point; verify risk score, mitigation, test and owner; resolve all critical gate findings.

**Interview checks:** Which views answer different architecture questions? How do ADRs preserve trade-offs? How does STRIDE complement AI-specific abuse cases? Why can a model propose but not authorize a tool action? Which threat is a stop-ship condition regardless of aggregate risk score?

**Submission evidence:** Include diagrams, ADRs, workload and quality assumptions, threat register, control matrix, negative acceptance tests, residual-risk ownership and a short design-defense recording or presentation.

---

## capstone-build — Build RAG and agent services

**Implementation task:** Build one end-to-end vertical slice: authenticate a tenant member, ingest and version a document, retrieve only authorized chunks before ranking, return citations or abstain, propose a typed agent action, authorize it in a server-side tool gateway, require approval for mutation, and persist idempotent outcome/audit evidence.

**Worked fixture:** Two tenants have policy documents and order resources. Tenant B has a higher lexical match; a malicious Tenant A document instructs the agent to execute a mutation; an order update commits but the response times out.

**Expected result:** Tenant A receives only its own citation; no-evidence queries abstain; retrieved text cannot grant tool authority; only a scoped tenant-admin approval permits the exact mutation; cross-tenant resources are denied; retry with the same idempotency key does not repeat the side effect.

**Verification tests:** Run `python -m unittest discover -s examples/stage-11 -p 'test_*.py' -v`. Test membership, filter-before-ranking, citation lineage, abstention, malicious content, capability allowlist, approval scope, resource ownership, idempotency, budget and audit redaction.

**Debugging checklist:** Inspect principal and tenant resolution; confirm ACL predicates are pushed before ranking; trace document version/page/chunk through citations; separate proposal from authorization; verify approval fingerprint and approver role; inspect idempotency scope and operation state; confirm audit contains only safe metadata.

**Interview checks:** Why filter before top-k? How do you prove citation lineage? Why is a model tool call only a proposal? How should an approval be scoped? What happens when a side effect commits but the response times out?

**Submission evidence:** Include API/event contracts, a successful vertical-slice run, cross-tenant and no-evidence tests, injection/tool denial tests, approval/idempotency evidence, audit privacy test and a production-adapter gap analysis.

---

## capstone-delivery — Deploy and operate

**Implementation task:** Create an immutable release manifest for code/image/model/prompt/index/schema, run CI/security/evaluation/SBOM/provenance gates, apply compatible expand/backfill/switch/drain/contract migrations, deploy a canary, and promote or roll back the complete compatible bundle using reliability, quality and cost thresholds.

**Worked fixture:** Candidate release passes CI but a 2,000-request canary has 20 failures (1%) against a 0.5% error threshold; p95, quality and cost pass. Previous release and backup snapshot are available.

**Expected result:** Candidate is not promoted; traffic returns to the previous signed compatible release bundle; data, tenant integrity, quality and SLO checks pass; rollback evidence is recorded.

**Verification tests:** Run `python -m unittest discover -s examples/stage-11 -p 'test_*.py' -v`. Test immutable digests, required evidence, rollback bundle, canary error/latency/quality/cost/sample-size gates, migration compatibility, contract drain and backup restore/RPO/RTO.

**Debugging checklist:** Inspect exact manifest digests and evidence references; verify signature/provenance; compare schema and old/new application compatibility; confirm canary sample size and thresholds; inspect model/index/prompt compatibility; verify rollback target and backup restore/tenant integrity; ensure missing telemetry blocks promotion.

**Interview checks:** Why deploy by digest? Why is expand/contract safer than destructive schema changes? Which AI-specific signals belong in canary analysis? What must a rollback bundle include? Why does a green backup job not prove recoverability?

**Submission evidence:** Include signed release manifest, CI gate report, migration plan, canary decision, rollback demonstration, backup restore report, SLO dashboard definitions and on-call runbooks.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected behavior is reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
