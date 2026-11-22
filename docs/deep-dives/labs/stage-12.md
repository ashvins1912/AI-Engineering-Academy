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

## ai-red-team — AI Red Teaming and Adversarial Validation

**Implementation task:** Build a versioned synthetic attack corpus and deterministic runner for direct/indirect prompt injection, retrieval poisoning, cross-tenant access, tool abuse, approval replay, argument tampering, canary exfiltration, denial of wallet, jailbreaks and model artifact supply-chain attacks. Map each attack to a control and remediation regression test.

**Worked fixture:** A Tenant-A user asks a RAG-agent to summarize a policy. A retrieved document contains an indirect instruction to export all tenant data. A tool proposal targets a Tenant-B ticket, a synthetic canary is placed in candidate output, and a second run attempts to load a model artifact with a mismatched digest.

**Expected result:** Retrieved content remains untrusted and cannot grant tool authority; cross-tenant and unapproved mutations are denied before side effects; canary output is detected/redacted; step/token/spend budgets stop runaway execution; and invalid/untrusted model artifacts are rejected before load. Every unblocked attack creates a risk-ranked finding with a remediation owner and regression case.

**Verification tests:** Run `python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v`. Test tool allowlist/scope/tenant/approval/idempotency, canary redaction, step/token/spend budgets, artifact digest/source/signature/provenance, direct/indirect injection, cross-tenant denial, denial-of-wallet, supply-chain attacks, attack coverage, remediation findings and risk-score bounds.

**Debugging checklist:** Identify the asset and attacker capability; trace the entry point and trust boundary; verify the source is labeled untrusted; inspect server-derived principal/tenant; confirm authorization before resource access; bind approval to exact arguments and idempotency; inspect budget counters; verify canary scanning before output; compare artifact bytes/digest/source/signature/provenance; retain redacted evidence and convert each finding to a regression test.

**Interview checks:** Why is a prompt injection detector not an authorization boundary? How do direct and indirect injection differ? What is a confused deputy? How can a retrieved document poison an agent's memory or tool choice? Why must approval bind to exact arguments? How do you prevent denial of wallet? What does a hash prove and what does it not prove? How do you measure red-team coverage without claiming certification?

**Submission evidence:** Include a threat model and attack tree, versioned attack corpus, per-category coverage report, blocked/unblocked results, redacted evidence, risk-ranked findings, remediation owners, regression tests and a production rules-of-engagement checklist.

---

## inference-performance — Inference Performance and Capacity Engineering

**Implementation task:** Build a hardware-independent serving simulator that calculates KV-cache memory, separates queue wait/prefill/TTFT from decode/ITL, models bounded continuous batches and queues, enforces admission/deadline/per-tenant limits, isolates versioned prefix caches, and compares quantization and speculative-decoding assumptions. Add a capacity planner using available memory, Little's Law and service-rate estimates, plus round-robin tenant scheduling and paged KV allocation/release.

**Worked fixture:** A 32-layer decoder with 8 KV heads, head dimension 128 and FP16 KV values receives a 4,096-token request. One sequence uses 512 MiB; a second identical request arrives under a 512 MiB KV budget. A burst from tenant A competes with tenants B/C, and one request has an unachievable deadline.

**Expected result:** The second sequence is rejected before allocation; queue overflow and impossible deadlines receive stable reason codes; round-robin scheduling gives B/C a turn before A's second queued request; per-tenant concurrency is enforced; TTFT and decode ITL are reported separately; prefix cache keys change across tenant/model/prompt/policy versions; quantization memory savings include a quality penalty; and canceled requests release their KV pages.

**Verification tests:** Run `python examples/stage-12/inference_performance/inference_simulator.py`, `python examples/stage-12/inference_performance/capacity_sweep.py` and `python -m unittest discover -s examples/stage-12 -p 'test_inference_performance.py' -v`. Tests cover KV arithmetic, precision scaling, invalid configuration, prefill/decode, speculative acceptance, quantization quality, cache isolation, context/deadline, batch/queue/KV limits, throughput, tenant concurrency, fair scheduling, Little's Law, capacity planning, paged allocation and release.

**Debugging checklist:** Verify model layers/KV heads/head dimension and bytes/value; check sequence/concurrency assumptions; include queue wait in TTFT; separate prefill and decode throughput; inspect batch memory before admission; confirm prefix cache tenant/model/prompt/policy scope; compare precision and quality; inspect speculative acceptance; inspect tenant queue rotation and active counts; trace p95 and rejection reasons; check page allocations are released; benchmark the real serving engine before making production capacity claims.

**Interview checks:** Derive the KV formula; explain prefill vs decode; compare static and continuous batching; explain paged attention and fragmentation; describe prefix cache isolation; discuss quantization and speculative decoding trade-offs; calculate Little's Law concurrency; explain tenant fairness, deadline admission and load shedding.

**Submission evidence:** Include hand-derived KV estimate, capacity plan, synthetic capacity sweep, per-request latency trace, p95/throughput report, queue/deadline/memory rejection tests, fair scheduling trace, tenant-safe cache proof, quality-aware optimization comparison, KV page release evidence and a production hardware benchmark plan.

---

## multimodal-systems — Multimodal AI Systems: Vision, Audio and Video

**Implementation task:** Build an offline evidence pipeline that normalizes OCR blocks and tables, audio transcript segments with speaker/timestamps, and sampled video frames. Preserve source references, page/region or time/speaker provenance, confidence, tenant/user/group ACL and retention metadata through retrieval and citations.

**Worked fixture:** A policy PDF contains a retention sentence on page 2 at a bounding box. A meeting recording contains a matching transcript segment from 1,200–3,200 ms by speaker-1, aligned to a video frame near 2,100 ms. A tenant-B PDF has an even higher lexical match, an OCR stamp has low confidence and an old media asset has expired retention.

**Expected result:** OCR blocks are sorted by page/region and invalid boxes are rejected; tables preserve rows/columns; WER/CER are calculated against labeled references; audio segments preserve timestamps/speakers; video sampling is deterministic and distant frames remain unaligned; tenant/user/group and confidence filters run before ranking; expired assets are excluded; citations retain page/bbox or timestamp/speaker; and no authorized evidence produces abstention. Extracted media instructions remain untrusted data.

**Verification tests:** Run `python examples/stage-12/multimodal_systems/multimodal_pipeline.py` and `python -m unittest discover -s examples/stage-12 -p 'test_multimodal_systems.py' -v`. Tests cover OCR reading order/confidence/bbox, table structure, audio time/speaker/confidence, WER/CER, frame sampling/alignment, tenant/user/group ACL, confidence thresholds, retention expiry, citation provenance, abstention, untrusted media text and malformed evidence.

**Debugging checklist:** Verify asset ID and source reference; inspect OCR page/bbox and reading order; check table headers/row boundaries; compare transcript with reference using WER; inspect diarization/timestamps; verify video frame interval and alignment tolerance; check evidence confidence and retention; confirm tenant/user/group ACL before scoring; trace page/region/time/speaker citation fields; ensure media text cannot authorize tools.

**Interview checks:** Why is multimodal RAG more than converting everything to text? How do CER and WER differ? Why preserve table layout? What causes audio/video alignment error? How should low-confidence OCR be handled? Why must tenant ACL run before ranking? What metadata belongs in a video/audio citation? How do retention and consent affect media indexing?

**Submission evidence:** Include normalized OCR regions, table output, WER/CER calculation, audio transcript timeline, video sampling/alignment trace, cross-modal retrieval result, tenant/ACL denial, retention expiry result and citations with page/bbox/time/speaker provenance.

---

# Stage 12 — Individual lesson lab pack: Advanced AI Engineering & Production Mastery

Run all exercises locally with synthetic fixtures. The Academy service does not execute learner-supplied code. Save implementation, test output, failure traces and a short design defense as evidence.
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
- [x] Topic 5 adversarial attack coverage, remediation and regression tests pass before Topic 6.
- [ ] Topic 6 KV capacity, fairness, deadline, cache isolation and overload recovery tests pass before Topic 7.
- [ ] Topic 7 OCR/audio/video provenance, alignment, confidence, ACL and retention tests pass before Topic 8.

- [x] Topic 1 plan validator and coordinator pass all positive and negative tests from a clean checkout.
- [x] Worker concurrency never exceeds the configured bound; dependency barriers are demonstrated.
- [x] Restart and idempotency behavior is demonstrated with a persisted journal.
- [x] Failure handling blocks dependents and records reverse-order compensation.
- [x] Production limitations and external side-effect guarantees are explained accurately.
- [ ] Topic 1 closed-book mastery defense is completed before Topic 2.
- [x] Topic 2 protocol contract tests and migration gap analysis pass before Topic 3.
- [x] Topic 3 ACL-before-ranking, retrieval quality, citation and index migration tests pass before Topic 4.
- [x] Topic 4 dataset, confidence, judge-calibration, slice and fail-closed release-gate tests pass before Topic 5.
- [x] Topic 5 adversarial attack coverage, remediation and regression tests pass before Topic 6.
- [x] Topic 6 KV capacity, fairness, deadline, cache isolation and overload recovery tests pass before Topic 7.
- [ ] Topic 7 OCR/audio/video provenance, alignment, confidence, ACL and retention tests pass before Topic 8.


## enterprise-governance — Enterprise AI Governance, Risk and Lifecycle Controls

**Implementation task:** Build a version-bound release dossier that binds code, model, dataset, prompt and retrieval-index versions to model/dataset cards, risk assessment, privacy/security reviews, evaluation evidence, retention schedule and third-party inventory. Validate artifact digests, ownership, expiry, approval role, decision and version binding before promotion.

**Worked fixture:** A customer-support assistant candidate has eight required evidence artifacts and five independent approvals. The privacy approval is expired, one dataset is past retention, and a high-risk item has no mitigation test. The release gate must report all blocking reasons and must not promote the candidate.

**Expected result:** A complete synthetic dossier passes only when every required artifact is present and bound to the candidate, every approval is role-correct and unexpired, high/critical risks have an owner plus mitigation/test evidence or authorized residual-risk acceptance, personal data has consent/provenance, and no retention/deletion/transfer blocker remains. A passing dossier still cannot release unless the lifecycle state is approved.

**Run locally:**

```bash
python examples/stage-12/enterprise_governance/governance_engine.py
python -m unittest discover -s examples/stage-12 -p 'test_enterprise_governance.py' -v
```

**Verification tests:** Cover missing/duplicate artifacts, digest and manifest-version mismatch, wrong reviewer role, rejected or expired approval, unowned critical risk, absent mitigation evidence, missing consent/provenance, expired retention, pending deletion, unreviewed cross-border transfer, invalid lifecycle transition, audit event tampering and release-gate denial.

**Debugging checklist:** Inspect the release manifest first; compare every artifact's bound versions; check approval role, decision, expiry and artifact version; inspect each risk's owner and evidence; verify consent, retention and deletion state; confirm the lifecycle is approved; then inspect audit sequence and previous-hash linkage. Do not weaken a gate to make a fixture pass.

**Production boundary:** The local simulator uses synthetic data and in-memory evidence. Production requires authenticated identity and role mapping, cryptographic signatures, durable append-only audit storage, evidence access controls, policy versioning, storage-specific deletion receipts, legal/privacy/security review and an independently protected audit trust boundary.

**Interview checks:** Why should approval bind to a digest rather than a display name? Why is a release gate a conjunction rather than a weighted score? How do separation of duties and approval expiry reduce risk? What can a hash chain prove and what can it not prove? How do retention, deletion and consent affect model/data lineage? Why does a passing dossier not automatically constitute legal compliance?

**Submission evidence:** Include a complete passing dossier, at least five blocked negative fixtures, reason-code output, approval/version matrix, risk register, retention/deletion evidence, audit-chain tamper test, architecture diagram and a production gap analysis.


- [ ] Topic 8 governance evidence, approval expiry, retention, deletion and audit tampering tests pass before Topic 9.


## advanced-practicum — Advanced Production Practicum: Integrated Enterprise AI Operations Platform

**Implementation task:** Build a fixed-command acceptance runner that executes the repository-owned deterministic demos for durable orchestration, protocol interoperability, advanced retrieval, evaluation, red teaming, inference simulation, capacity sweep, multimodal evidence and governance, plus the Stage 11 integrated capstone. Convert each exit result into an evidence envelope bound to one tenant and release version. Apply a fail-closed release gate requiring all ten capabilities and no unresolved high/critical finding.

**Worked fixture:** Ten local demos succeed, but one evidence envelope belongs to another tenant and another refers to a previous candidate version. The integrated release must be denied even though every subprocess exited successfully. A second fixture adds an unresolved critical red-team finding and must also be denied.

**Expected result:** A clean-checkout run produces a machine-readable report with ten capability results. Release passes only when all required demos pass, each evidence reference is non-empty, all records match the same tenant and release version, no duplicate or unexpected capability exists, and unresolved high/critical findings are absent.

**Verification tests:** Run `python -m unittest discover -s examples/stage-12 -p 'test_advanced_practicum.py' -v` and `python examples/stage-12/advanced_practicum/practicum_acceptance.py`. Tests cover all demo paths, full acceptance, missing capability, failed demo, duplicate evidence, tenant mismatch, version mismatch and unresolved critical findings.

**Debugging checklist:** Inspect the fixed command manifest; verify each script exists; run the failing demo directly; check return code and captured stderr; inspect the capability name; compare tenant and release version; check duplicate and missing evidence; review unresolved high/critical findings. Never skip a failed demo or turn a blocking security finding into a warning to make the gate green.

**Interview checks:** Why can isolated unit tests pass while an integrated platform fails? Why is release evidence bound to both tenant and candidate version? Why is a ten-of-ten capability gate not a weighted score? What does subprocess timeout protect against? Which guarantees still require a real service mesh, signed attestations, durable storage and production SLO measurements?

**Submission evidence:** Include the ten-step acceptance JSON report, positive and negative gate test output, tenant/version evidence matrix, architecture diagram, clean-checkout instructions, resource-boundary analysis, rollback/incident notes and a production gap assessment.


- [ ] Topic 9 integrated clean-checkout acceptance, negative release-gate tests and architecture defense pass before Stage 12 completion.


---

## Final mastery and production-readiness certification

This certification is a post-topic gate, not a tenth topic. Automated CI success does not complete learner mastery defenses. Keep the existing unchecked learner-defense items open until actual evidence has been reviewed.

**Required evidence (all bound to one learner/tenant and candidate release):**
- [ ] Topic 1 — orchestration closed-book defense, including ambiguous timeout, idempotency and compensation.
- [ ] Topic 2 — MCP/A2A/ACP protocol selection and trust-boundary defense.
- [ ] Topic 3 — retrieval ranking, ACL-before-scoring and citation-lineage defense.
- [ ] Topic 4 — metric interpretation, confidence intervals and release-gate defense.
- [ ] Topic 5 — adversarial attack walkthrough, containment and regression defense.
- [ ] Topic 6 — KV-cache/capacity arithmetic, fairness and overload recovery defense.
- [ ] Topic 7 — OCR/audio/video provenance, alignment and retention defense.
- [ ] Topic 8 — governance dossier, approvals, deletion and audit-integrity defense.
- [ ] Topic 9 — integrated practicum and architecture defense.
- [ ] Clean-checkout acceptance report from the candidate commit.
- [ ] Cross-topic failure-injection report with expected fail-closed outcomes.
- [ ] Tenant-isolation/security review with negative cross-tenant evidence.
- [ ] Final architecture defense reviewed by an assessor.

**Certification gate:** Run `python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v`. The certification tests exercise complete and incomplete synthetic evidence. They do not generate learner evidence. The final decision requires all thirteen records, non-empty evidence references, a single tenant and release version, human assessor attribution for the required defenses, and zero unresolved high/critical findings.

**Failure-injection minimum set:** stale release evidence; cross-tenant retrieval/cache access; forged or mismatched protocol identity; tool permission denial; interrupted workflow with ambiguous side effect; retrieval poisoning; low-confidence evaluation slice; inference overload; multimodal provenance/retention failure; expired governance approval; and rollback after a failed canary.

**Architecture defense rubric (100 points):** correctness and trade-offs (20), identity/tenant/security boundaries (20), durable execution and recovery (15), retrieval/evaluation quality (15), inference capacity and cost (10), observability/incident response (10), governance/lineage/retention (10). A score alone cannot override a critical security or safety failure.

**Certification status:** Pending until learner evidence is submitted and reviewed. Passing CI means the repository's automated checks pass; it does not mean the learner has completed the human defenses or that a live production deployment has been validated.
