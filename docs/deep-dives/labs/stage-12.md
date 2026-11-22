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

**Implementation task:** Build an offline hybrid retrieval engine with BM25 and dense cosine ranking, weighted reciprocal-rank fusion, pre-ranking tenant/user/group ACL filtering, optional parent-context expansion with an independent ACL check, a token-budget context packer and citation lineage.

**Worked fixture:** Tenant A's analyst Alice asks about retention policy. Tenant B has a secret chunk with the strongest lexical and vector match; Tenant A also has a legal-only chunk and an authorized child chunk whose parent is restricted. A stale corpus revision is then loaded while the same query cache is reused.

**Expected result:** Tenant B and legal-only chunks never enter Alice's candidate set; restricted parent text is not expanded; cache entries do not cross tenant, subject, group, policy-version or corpus-revision boundaries; returned citations retain document version, page and offsets; context stays within budget; no authorized evidence produces an explicit abstention.

**Verification tests:** Run `python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v` and `python examples/stage-12/advanced_retrieval/retrieval_engine.py`. Tests cover BM25, cosine dimensions, zero vectors, RRF, tenant/user/group filtering, pre-ranking isolation, cache partitioning and invalidation, parent ACL, citation metadata, context budget, abstention, request validation and Recall@K/MRR/NDCG.

**Debugging checklist:** Inspect verified identity resolution; confirm ACL predicates are pushed into candidate generation before top-k; compare lexical and dense candidate sets; inspect RRF ranks rather than raw score sums; verify parent ACL separately; compare cache keys and corpus revisions; trace source hash/version/page/offset; check tokenizer budget and abstention threshold; measure candidate recall before reranker lift.

**Interview checks:** Why is post-top-k filtering unsafe? When is BM25 useful alongside dense search? Why use RRF? What does a reranker fail to fix? Why must parent context be re-authorized? What do Recall@K, MRR and NDCG measure? Which dimensions prevent retrieval-cache leakage?

**Submission evidence:** Include the hybrid ranking trace, ACL-before-ranking negative test, tenant-safe cache test, restricted-parent denial, citation lineage sample, bounded context output, fixed relevance judgments and a slice-level retrieval metrics report. Document which guarantees require a production database/vector index rather than the local simulator.

---

## Stage completion evidence

- [x] Topic 1 plan validator and coordinator pass all positive and negative tests from a clean checkout.
- [x] Worker concurrency never exceeds the configured bound; dependency barriers are demonstrated.
- [x] Restart and idempotency behavior is demonstrated with a persisted journal.
- [x] Failure handling blocks dependents and records reverse-order compensation.
- [x] Production limitations and external side-effect guarantees are explained accurately.
- [ ] Topic 1 closed-book mastery defense is completed before Topic 2.
- [x] Topic 2 protocol contract tests and migration gap analysis pass before Topic 3.
- [ ] Topic 3 hybrid retrieval tests, ACL-before-ranking checks and citation lineage pass from a clean checkout.
- [ ] Topic 3 retrieval benchmark reports Recall@K, MRR and NDCG on fixed relevance judgments.
- [ ] Topic 3 parent-context, cache isolation and context-budget failure labs pass.
