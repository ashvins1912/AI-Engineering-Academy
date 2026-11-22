# Stage 12 — Advanced AI Engineering & Production Mastery

**Status:** Curriculum design proposal  
**Prerequisite:** Stage 11 — Enterprise Capstone & Architecture  
**Delivery rule:** Complete and validate each topic before beginning the next.  
**Execution constraint:** All required labs must run locally with deterministic fixtures or mocks. No paid API, hosted model, GPU, cloud resource, or infrastructure provisioning is required.

## Stage outcome

Design, build, evaluate, secure, optimize and operate advanced AI systems whose behavior is measurable and bounded. Learners must be able to defend architecture decisions, demonstrate failure recovery, and produce reproducible evidence—not merely assemble framework components.

## Learning contract

Every topic must include:
- Beginner-to-advanced explanations with terminology, intuition, equations where useful, and worked numerical examples.
- A hand-authored architecture/data-flow diagram and an explicit trust-boundary view.
- A runnable reference implementation with deterministic fixtures and pinned assumptions.
- A step-through trace or numerical animation showing intermediate state, not decorative motion.
- Normal, boundary, adversarial and failure-injection labs with expected outputs and debugging instructions.
- Unit, integration and regression tests; no network access in the default test path.
- A scored assessment, interview defense, production checklist and evidence artifact.
- Explicit limitations: what the local simulator proves and what still requires real infrastructure or specialist review.

## Topic sequence

### Topic 1 — Advanced Agent Orchestration and Durable Execution

**Scope:** Supervisor/worker and hierarchical delegation; planner/executor separation; dynamic task graphs; parallel fan-out/fan-in; bounded concurrency; state machines; checkpoints; resumability; cancellation; deadlines; retries; compensation; idempotency; human escalation; durable workflow vs autonomous agent boundaries.

**Build:** A deterministic multi-agent task coordinator with typed task contracts, dependency graph validation, bounded worker pool, checkpoint journal and resumable execution.

**Failure labs:** Cyclic plan, duplicate task delivery, worker timeout, partial fan-out failure, stale checkpoint, cancellation race, retry storm, unbounded delegation and unauthorized privilege propagation.

**Mastery gate:** Demonstrate successful execution, restart recovery without duplicate side effects, bounded resource use, correct compensation, and proof that delegated agents cannot acquire permissions absent from the initiating principal.

### Topic 2 — Agent Protocol Interoperability: MCP, A2A and ACP

**Scope:** Deep protocol comparison and practical interoperability. MCP host/client/server roles, JSON-RPC lifecycle, tools/resources/prompts, capability negotiation, transports, auth and consent. A2A Agent Cards, discovery, task lifecycle, messages, contexts, streaming and authentication. Distinguish IBM/BeeAI Agent Communication Protocol (ACP) history/evolution from the Agent Client Protocol (ACP) used for IDE-to-coding-agent sessions. Typed tool contracts, version negotiation, compatibility and protocol gateways.

**Build:** A local protocol lab with an MCP tool server, two independently addressed A2A-style agents and an ACP client-session adapter. Use protocol-faithful fixtures where a full external implementation would require network services.

**Failure labs:** Capability mismatch, malformed JSON-RPC, tool schema drift, expired credentials, confused deputy, replayed task, duplicate message, agent-card spoofing, session loss and unsupported protocol version.

**Mastery gate:** Trace a request across all protocol boundaries, negotiate capabilities safely, reject malformed or unauthorized messages, preserve identity and audit correlation, and explain precisely which ACP is being discussed in each example.

### Topic 3 — Advanced Retrieval and Context Engineering

**Scope:** Hybrid retrieval and score fusion; multi-vector and late-interaction retrieval; query planning and decomposition; reranking; graph retrieval; parent-child and contextual retrieval; temporal/freshness-aware search; ACL filtering before ranking; context compression and ordering; citation lineage; multimodal retrieval; retrieval caching and index migration.

**Build:** An offline retrieval benchmark comparing lexical, dense, hybrid, graph-assisted and reranked strategies over a versioned synthetic corpus.

**Failure labs:** Filter-after-top-k leakage, stale index, embedding dimension mismatch, poisoned metadata, duplicate chunks, missing citation offsets, misleading high scores, context truncation and cache contamination.

**Mastery gate:** Report Recall@K, MRR/NDCG, citation correctness, abstention, latency and token cost on a reproducible dataset; show that authorization filters execute before ranking and remain intact through caching and reranking.

### Topic 4 — Evaluation at Scale and Continuous Quality

**Scope:** Golden datasets and dataset governance; task and trajectory evaluation; deterministic unit tests vs model-based judges; judge calibration and bias; pairwise evaluation; confidence intervals and bootstrap; inter-annotator agreement; online monitoring; drift and slice analysis; canary evaluation; human review; release thresholds and regression triage.

**Build:** A versioned evaluation harness that computes retrieval, answer, citation, safety, tool-use, latency and cost metrics; includes a calibrated mock judge and a CI release gate.

**Failure labs:** Dataset leakage, judge prompt injection, judge disagreement, tiny sample false confidence, metric gaming, distribution shift, missing labels and threshold flapping.

**Mastery gate:** Produce a repeatable evaluation report with confidence intervals and slice-level results; justify thresholds, identify judge limitations, and demonstrate that an underpowered or incomplete evaluation cannot silently pass release.

### Topic 5 — AI Red Teaming and Adversarial Validation

**Scope:** Threat modeling across model, data, retrieval, tools, agents and supply chain; direct/indirect prompt injection; tool abuse; data exfiltration; cross-tenant attacks; jailbreaks; unsafe output; denial of wallet; model extraction concepts; poisoning; dependency/model artifact attacks; abuse-case coverage and remediation verification.

**Build:** A local adversarial scenario runner with attack corpus, policy controls, redacted evidence and regression tests.

**Failure labs:** Retrieved instruction treated as authority, cross-tenant citation, tool argument tampering, secret canary exposure, approval replay, unsafe fallback, resource exhaustion and untrusted model artifact.

**Mastery gate:** Map each attack to an asset, boundary, exploit precondition, expected control and regression test; demonstrate containment and verified remediation. A high-severity unresolved finding blocks the gate regardless of average score.

### Topic 6 — Inference Performance and Capacity Engineering

**Scope:** Prefill vs decode; TTFT and inter-token latency; continuous batching; KV-cache sizing and fragmentation; paged attention concepts; quantization trade-offs; speculative decoding; prefix/prompt caching; routing and admission control; queueing theory; concurrency and throughput; CPU/GPU memory budgets; load shedding and graceful degradation.

**Build:** A hardware-independent serving simulator with configurable model dimensions, request lengths, queue limits, batching, cache budgets and synthetic latency curves. Optional adapter instructions may describe real engines, but are not required for tests.

**Failure labs:** KV-cache exhaustion, queue overload, head-of-line blocking, unfair scheduling, cache-key collision, quantization quality regression, deadline miss and retry amplification.

**Mastery gate:** Calculate memory and capacity estimates by hand, benchmark controlled workload sweeps, explain throughput/latency trade-offs, enforce admission limits, and prove overload fails predictably without unbounded memory growth.

### Topic 7 — Multimodal AI Systems: Vision, Audio and Video

**Scope:** Image/document understanding; OCR and layout; visual grounding; audio ingestion, speech-to-text and text-to-speech concepts; timestamps and diarization; video frame sampling; cross-modal alignment; multimodal embeddings; privacy and retention; evaluation for modality-specific errors.

**Build:** A synthetic document-and-media pipeline using local fixtures and replaceable adapters. Preserve source, page/frame/time offsets and confidence metadata through retrieval and answer citations.

**Failure labs:** OCR ambiguity, table reading-order errors, low-confidence transcription, timestamp drift, missing frames, modality mismatch, prompt injection embedded in media and privacy metadata leakage.

**Mastery gate:** Trace each answer to source pages/regions or media timestamps, handle low-confidence evidence safely, compare modality-specific quality metrics and explain adapter boundaries without requiring a hosted model.

### Topic 8 — Enterprise AI Governance, Risk and Lifecycle Controls

**Scope:** Data classification and lifecycle; retention/deletion; consent and provenance; model cards and dataset documentation; risk registers; human oversight; policy-as-code; audit evidence; third-party/model risk; change management; incident obligations; regulatory mapping as jurisdiction-specific guidance, not legal advice.

**Build:** A policy and evidence registry that binds model, dataset, prompt, index and release versions to approvals, risk controls, evaluation reports and audit events.

**Failure labs:** Missing provenance, expired approval, incompatible model/data versions, retention violation, unreviewed high-risk change, incomplete audit chain and policy bypass.

**Mastery gate:** Produce a traceable release dossier, reject missing or expired evidence, prove lifecycle actions are auditable, and identify residual risks requiring legal, privacy or security review.

### Topic 9 — Advanced Production Practicum

**Scope:** Integrate the prior topics into one coherent platform with a user-facing workflow, retrieval, agent delegation, MCP tools, A2A communication, evaluation, red-team gates, multimodal evidence, governance, release controls and operational dashboards.

**Build:** An end-to-end, tenant-aware AI operations platform using local services, deterministic model/tool adapters, synthetic data and a reproducible deployment simulation.

**Required demonstrations:**
1. Complete a multi-step task with durable checkpoints and bounded delegation.
2. Call an MCP tool and delegate a scoped task to an independent A2A agent without privilege expansion.
3. Retrieve authorized evidence, cite source lineage and abstain when evidence is insufficient.
4. Pass the evaluation suite and reject a deliberately regressed candidate.
5. Detect and block a prompt-injection/tool-abuse scenario.
6. Demonstrate a multimodal citation with page/region or timestamp provenance.
7. Reject a release missing governance or supply-chain evidence.
8. Simulate overload, recover from a checkpoint and preserve idempotency.
9. Produce an auditable release dossier and incident-ready runbook.

**Mastery gate:** All mandatory acceptance tests pass from a clean checkout; all negative security tests demonstrate denial; the evaluation report meets predeclared thresholds; recovery and rollback are reproducible; architecture and residual risks are defended orally or in writing.

## Stage-wide mastery and sequencing

| Gate | Required evidence | Advancement rule |
|---|---|---|
| G0 — Prerequisite | Stage 11 capstone acceptance remains green | Do not start if baseline regresses |
| G1 — Agent orchestration | Task graph, checkpoint journal, recovery tests | All correctness and boundedness tests pass |
| G2 — Protocol interoperability | MCP/A2A/ACP traces and security tests | Identity, capability and version checks pass |
| G3 — Retrieval/context | Benchmark, ACL and citation evidence | Quality thresholds and pre-ranking isolation pass |
| G4 — Evaluation | Dataset, confidence-aware report, CI gate | Underpowered/incomplete evaluation fails closed |
| G5 — Red team | Threat matrix, attack corpus and remediation tests | No unresolved critical/high attack path |
| G6 — Performance | Capacity model and overload report | Memory/queue bounds and SLO guardrails pass |
| G7 — Multimodal | Provenance-rich outputs and modality tests | Low-confidence or ungrounded evidence is handled safely |
| G8 — Governance | Release dossier and policy evidence | Missing/expired approvals block release |
| G9 — Practicum | Clean-checkout integrated acceptance and defense | All mandatory checks pass; residual risks documented |

## Delivery plan

1. Add Stage 12 to the curriculum using the repository's existing namespaced lesson-ID convention.
2. Implement Topic 1 only, including lesson content, diagram, runnable lab, tests, animation/trace, assessment and lab-pack entry.
3. Run the full repository CI and inspect every failed check. Fix regressions before opening or merging the topic PR.
4. Merge only after all required checks pass and the PR head is revalidated.
5. Repeat the same topic-by-topic cycle for Topics 2–9. Never mark a topic complete from content presence alone.
6. Keep all test fixtures synthetic and default execution offline. Any optional hosted adapter must be clearly separated and opt-in.
7. After Topic 9, run the full clean-checkout acceptance, verify all topic mastery evidence and publish a stage completion report.

## Explicit non-goals

- No paid API keys or provider spend.
- No cloud/GPU provisioning or changes to existing hosting.
- No production data or real customer secrets in labs.
- No claim that a simulator certifies production security, compliance or capacity.
- No conflation of IBM/BeeAI ACP with Agent Client Protocol; protocol status and version claims must be checked against current primary specifications when each lesson is authored.
