# Stage 12 — Individual lesson lab pack: Advanced AI Engineering & Production Mastery

Run all exercises locally with synthetic fixtures. The Academy service does not execute learner-supplied code. Save implementation, test output, failure traces and a short design defense as evidence.

## agent-orchestration — Advanced Agent Orchestration and Durable Execution

**Implementation task:** Build a typed task DAG planner and durable coordinator. Validate unique IDs, dependency existence and acyclicity; schedule ready work with a bounded worker pool; persist checkpoints and idempotency outcomes; implement bounded retries, dependency blocking and reverse-order compensation.

**Worked fixture:** A research assistant collects sources, drafts a report and runs an independent policy review in parallel. Publication depends on both branches. The review worker fails permanently after draft completes; the coordinator must block publish and compensate completed compensatable work.

**Expected result:** A valid plan completes with no more than two in-flight tasks. An invalid graph is rejected before dispatch. A completed journal can be reopened without repeating completed operations. Replaying an idempotency key with the same payload returns the original result; changed payload is rejected. A terminal failure blocks dependents and compensates in reverse completion order.

**Verification tests:** Run `python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v`. Tests cover topological order, duplicate IDs, unknown dependencies, cycles, bounded concurrency, dependency barriers, bounded retry, retry exhaustion, checkpoint resume, idempotency replay and payload mismatch, compensation order and operation allowlisting.

**Debugging checklist:** Inspect the task graph before worker dispatch; verify every edge direction; record the ready set and active worker count; inspect attempt numbers and error classification; compare journal task state with idempotency records; check canonical payload digest; confirm compensation ordering; distinguish local checkpoint guarantees from destination-side idempotency.

**Interview checks:** When should a workflow replace an agent loop? Why must publish wait for both branches? What is the maximum attempt count for retry_limit=2? Why is a timeout ambiguous? Why is local JSON persistence not enough for exactly-once remote mutations? Why is compensation not rollback? What do fencing tokens prevent?

**Submission evidence:** Include a task graph diagram, runnable demo output, passing test report, one cycle rejection trace, one retry/recovery trace, one idempotency replay trace, one compensation trace and a production-adapter gap analysis.

---

## protocol-interop — Agent Protocol Interoperability: MCP, A2A and ACP

**Implementation task:** Build offline, version-aware protocol adapters for MCP 2026-07-28 and a legacy MCP handshake version, A2A 1.0.0 task communication, Agent Client Protocol v2 IDE/client sessions, and a narrow IBM/BeeAI ACP-to-A2A message migration mapper. Normalize trusted identity separately from protocol payloads.

**Worked fixture:** An IDE client prompts a coding agent through ACP. The agent uses MCP to search an approved context server, then delegates policy review to an independent A2A agent. A legacy IBM/BeeAI ACP message must be mapped to an A2A message without pretending that task, auth, artifact and streaming semantics are identical.

**Expected result:** The MCP stateless request validates its version, client metadata and routing headers; legacy MCP requires its own initialization flow; malformed headers, unknown tools, schema mismatch and issuer mix-up are denied. A2A validates its Agent Card, task lifecycle, idempotency and advertised streaming/push capabilities. ACP negotiates session capabilities and refuses file/terminal access that the client did not advertise or approve. The IBM/BeeAI bridge preserves message context and labels migration gaps. Verified principal and tenant context are never sourced from wire claims.

**Verification tests:** Run `python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v`. Tests cover MCP modern/legacy versions, removed initialize, routing-header mismatch, tool registration/schema, OAuth issuer mix-up and MRTR input completion; A2A Agent Card, task idempotency, terminal-state rejection, event order and capability gates; ACP JSON-RPC IDs, initialization, session/prompt, filesystem and terminal capabilities, workspace boundary and cancellation; legacy ACP mapping and trusted identity normalization.

**Debugging checklist:** Pin the exact protocol revision; compare body fields with routing headers; inspect MCP version and legacy session state; verify OAuth issuer/audience before tool invocation; validate A2A Agent Card origin/signature and supported interface; trace task/context IDs and event sequence; inspect ACP client-advertised filesystem/terminal capabilities; confirm the client permission response; document every legacy ACP migration semantic that cannot be mapped one-to-one.

**Interview checks:** Why are MCP, A2A and Agent Client Protocol not interchangeable? What changed in MCP 2026-07-28? How does MRTR replace server-initiated round trips? What belongs in an A2A Agent Card? Why are Task and Artifact different from Message? What is the purpose of ACP client capabilities? Why is IBM/BeeAI ACP migration into A2A distinct from Agent Client Protocol?

**Submission evidence:** Include a protocol-boundary diagram, pinned-version compatibility matrix, passing contract tests, one malformed MCP request denial, one A2A task lifecycle trace, one ACP permission denial, one legacy ACP mapping and a written interoperability gap analysis.

---

## advanced-retrieval — Advanced Retrieval and Context Engineering

**Implementation task:** Build an offline retrieval benchmark for lexical, dense, hybrid RRF and late-interaction strategies. Enforce tenant/document/subject/role and temporal filters before scoring. Add reranking, bounded graph expansion with evidence ACL re-checks, source-preserving compression, citation provenance, security-aware cache keys and shadow index migration gates.

**Worked fixture:** Tenant-A asks for the current retention policy. A Tenant-B chunk has a stronger dense similarity score but must be filtered before ranking. A graph edge points to a related exception document that is also cross-tenant. The authorized source contains a sentence that must fit within a strict context budget while preserving document version, page and source offsets.

**Expected result:** Unauthorized and stale chunks never enter the candidate ranker. Lexical, dense, hybrid and late-interaction strategies produce deterministic rankings on the fixture. Graph expansion includes only authorized evidence. Compression selects exact source sentences and preserves citation metadata. Cache keys change with tenant, ACL, model, embedding, index and policy versions. A candidate index with insufficient shadow overlap cannot be promoted; a promoted candidate can be rolled back.

**Verification tests:** Run `python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v`. Tests cover tenant/document/subject/role filters, pre-ranking candidate sets, temporal validity, lexical/dense/hybrid/late-interaction scoring, cosine and RRF arithmetic, reranking, graph ACL checks, hop bounds, token-budget compression, citation lineage, cache-key isolation, index promotion/rollback, Recall@K/MRR and gateway defense in depth.

**Debugging checklist:** Inspect verified access context before query planning; confirm SQL/vector filters execute before top-k; compare lexical and dense rankings separately before RRF; validate vector dimensions and normalization; check reranker inputs contain only authorized candidates; inspect graph evidence ACLs and hop limits; compare compressed text to exact source spans; verify citation offsets and immutable versions; inspect every cache-key dimension; review shadow index overlap by query/tenant slice before promotion.

**Interview checks:** Why is post-ranking ACL filtering unsafe? When does lexical retrieval beat dense retrieval? How does RRF combine incompatible score scales? What is the trade-off of late interaction? Why are graph edges not permissions? How do you preserve citation fidelity during compression? Which dimensions belong in a retrieval cache key? What evidence should gate an index migration?

**Submission evidence:** Include an annotated synthetic corpus, score calculations, per-strategy rankings, pre-ranking ACL trace, graph expansion denial, compressed context with citations, cache-key isolation tests, shadow migration report and a short quality/latency/cost trade-off analysis.

---

## evaluation-scale — Evaluation at Scale and Continuous Quality

**Implementation task:** Build a versioned golden evaluation set and compute retrieval, answer, citation, abstention, tool, safety, latency, cost-per-successful-task and slice metrics. Add deterministic bootstrap confidence intervals, judge calibration against human labels, pairwise comparison, inter-rater agreement, drift detection and a fail-closed release gate.

**Worked fixture:** A candidate answers 28/30 answerable cases, abstains on 10/10 unanswerable cases, has strong citation precision and p95 latency under the target. Its quality lower confidence bound is just above the release threshold. Then inject one critical safety violation, an over-budget cost and an unreviewed high-risk case; show that each independently blocks release.

**Expected result:** Dataset fingerprint is stable and versioned; duplicate IDs and train/golden query or source leakage are rejected; predictions must cover the exact golden case set; metrics are computed separately and by slices; bootstrap results are reproducible for a fixed seed; judge calibration is measured against human labels; and release gates fail closed on insufficient sample count, low confidence bound, safety, latency, cost, poor calibration, incomplete high-risk human review or missing provenance.

**Verification tests:** Run `python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v`. Tests cover dataset validation/fingerprints, split leakage, prediction coverage, Recall@K/MRR, citation precision, abstention accuracy, deterministic judge injection resistance, bootstrap intervals, Brier/ECE, Cohen's kappa, pairwise win rate, slice counts/intervals, p95 latency, cost per successful task, high-risk human-review gates, release-gate failures and quality/distribution drift detection.

**Debugging checklist:** Confirm dataset version, fingerprint and split; inspect duplicate IDs and source fingerprints; verify exact prediction coverage; separate retrieval from answer/citation/safety metrics; inspect slice counts before aggregate metrics; reproduce bootstrap seed and sample count; compare judge scores with human labels; check judge prompt/version and ECE; verify release gate thresholds, per-task cost, high-risk review coverage and hard safety conditions; retain failing case IDs and candidate outputs for triage.

**Interview checks:** Why is a golden dataset a versioned artifact? How can train/test leakage inflate evaluation? Why report confidence intervals? What is ECE and why calibrate judges? Why should candidate output not control judge instructions? How can a slice regression hide behind aggregate quality? Which conditions should fail closed even when the mean score passes?

**Submission evidence:** Include dataset manifest/fingerprint, leakage report, metric report with confidence interval, slice analysis, judge calibration report, inter-rater agreement, drift result, release-gate pass/fail trace and a short human-review plan.

---

## red-team — AI Red Teaming and Adversarial Validation

**Implementation task:** Build a versioned adversarial corpus and offline runner for direct/indirect prompt injection, RAG poisoning, cross-tenant tool access, argument tampering, approval replay, canary exfiltration, resource exhaustion and artifact tampering. Enforce tool authorization before any registered side-effect handler.

**Worked fixture:** Tenant A's user retrieves a malicious policy passage that asks the agent to read tenant B's order, change a mutation argument and replay a previous approval. A synthetic canary is also inserted into a candidate answer, and an artifact digest is modified.

**Expected result:** Retrieved instructions remain untrusted evidence; tenant-B resource access and changed tool arguments are denied; approval replay is rejected; no denied operation invokes the handler; canary output is redacted; token/cost abuse and tampered artifacts are blocked; benign evidence remains usable; unresolved critical/high scenarios fail the release gate.

**Verification tests:** Run `python examples/stage-12/red_team/red_team_engine.py` and `python -m unittest discover -s examples/stage-12 -p 'test_red_team.py' -v`. Tests cover trust labels, benign controls, tenant/resource authorization, strict schemas, one-time request-bound approvals, expiry, handler non-invocation, canary redaction, token/cost budgets, artifact digests, scenario coverage and critical-severity release blocking.

**Debugging checklist:** Identify the protected asset and trust boundary; trace every untrusted input source; inspect verified principal and authoritative tenant/resource lookup; compare normalized tool arguments with schema and approval digest; verify atomic approval consumption; ensure the handler is not called after denial; inspect redacted canary evidence; check token/cost budgets; verify trusted artifact digest source; review severity, coverage and regression evidence.

**Interview checks:** Why is pattern-based injection detection insufficient? What is a confused deputy? How do you prevent cross-tenant tool use? Why bind approval to arguments? What makes approval single-use across processes? How should canary secrets be handled? Why is a digest not a signature? Why must critical findings block regardless of aggregate pass rate?

**Submission evidence:** Include threat matrix, attack corpus version, successful and blocked scenario traces, benign-control result, no-side-effect proof, approval replay proof, canary-redaction output, budget and artifact-integrity evidence, severity-aware gate decision and a production gap analysis.

---

## Stage completion evidence

- [x] Topic 1 plan validator and coordinator pass all positive and negative tests from a clean checkout.
- [x] Worker concurrency never exceeds the configured bound; dependency barriers are demonstrated.
- [x] Restart and idempotency behavior is demonstrated with a persisted journal.
- [x] Failure handling blocks dependents and records reverse-order compensation.
- [x] Production limitations and external side-effect guarantees are explained accurately.
- [ ] Topic 1 closed-book mastery defense is completed before Topic 2.
- [x] Topic 2 protocol contract tests and migration gap analysis pass before Topic 3.
- [x] Topic 3 ACL-before-ranking, retrieval quality, citation and index migration tests pass before Topic 4.
- [x] Topic 4 dataset, confidence, judge-calibration, slice and fail-closed release-gate tests pass before Topic 5.
- [ ] Topic 5 attack corpus, prompt-injection, tool authorization, approval replay, canary and critical-severity gate tests pass before Topic 6.
