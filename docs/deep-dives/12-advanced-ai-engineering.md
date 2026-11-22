# Stage 12 — Advanced AI Engineering & Production Mastery

## Outcome
Engineer durable, interoperable, measurable and secure AI systems under realistic production constraints. This stage extends the Stage 11 integrated capstone with deeper execution semantics and production evidence.

## Topic 1 — Advanced Agent Orchestration and Durable Execution

### 1. Start with the boundary: workflow or agent?
A workflow is the right default when steps, approvals and side effects are known. An agent is useful for bounded decisions—classify a request, propose a plan, select among approved retrieval strategies—but it must not own the authority to execute arbitrary actions. A strong design often uses an agent to propose a typed task graph and a deterministic orchestrator to validate and execute it.

### 2. Model the work as a DAG
A task record should include a stable ID, registered operation name, validated payload, dependency IDs, deadline, retry budget and optional compensation. An edge A→B means B cannot start until A completes. Reject duplicate IDs, unknown dependencies, self-dependencies and cycles before dispatch. Use a deterministic topological order to make planning and tests reproducible.

For a ready task set R and worker bound W, the scheduler may dispatch at most min(|R|, W) tasks. A task becomes eligible only when every dependency is complete. A join node such as publish(draft, review) must wait for both branches.

### 3. Bound execution
Concurrency is a resource budget, not merely a performance setting. Bound workers, queue depth, per-task attempts, wall-clock deadlines, tool calls, tokens and tenant-level concurrency. Apply backpressure instead of creating unbounded work. Propagate cancellation and deadlines to workers; do not assume cancelling a future reverses a side effect already in progress.

### 4. Make retries safe
Classify errors as transient, permanent or ambiguous. Retry only transient failures and only within a finite budget. A timeout is ambiguous: the remote service may have committed the operation while its response was lost. Bind a stable idempotency key to a canonical payload digest and let the destination return the original result. Reject reuse of the same key with different arguments.

### 5. Persist and resume
Persist state transitions and completed results. On restart, reload the checkpoint, skip completed tasks, reconcile interrupted tasks and resume only work that is safe to repeat. Atomic file replacement protects a local JSON journal from partial writes; it does not create a distributed transaction with a remote API. Production systems need durable storage, destination idempotency, transactional outbox/inbox, leases/fencing and reconciliation.

### 6. Compensate instead of pretending to roll back
A saga compensation is a new business action: release a reservation, void an authorization or withdraw a publication. Execute compensations in reverse completion order, persist their outcomes and escalate failures. Compensation may be incomplete, visible or impossible. Keep the original event history.

## Worked numerical example

A plan has four tasks: collect; draft depends on collect; review depends on collect; publish depends on draft and review. With W=2:
- Layer 1: collect (one active worker).
- Layer 2: draft and review (two active workers).
- Layer 3: publish (one active worker only after both branches complete).

If retry_limit=1, a task has at most 1+1=2 attempts. If retry_limit=2, it has at most 3 attempts. This is a hard upper bound, not a promise that retries are safe.

## Architecture and trust boundaries

See [task graph flow](../../examples/stage-12/agent_orchestration/task-graph-flow.mmd). The planner and model output are untrusted. The server validates task schemas and operation names; only registered adapters execute. Identity and tenant context come from verified server state. Workers cannot widen permissions by editing task payloads. Journal storage is integrity-sensitive. Worker output must be validated before downstream use.

## Implementation lab

Run:

```bash
python examples/stage-12/agent_orchestration/durable_runtime.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

The reference implementation demonstrates graph validation, bounded worker concurrency, atomic local checkpoints, a local idempotency ledger, bounded retries, dependency blocking and reverse-order compensation. It uses synthetic operations and does not execute model-generated code.

## Failure diagnosis

| Symptom | Likely cause | Safe response |
|---|---|---|
| No task becomes ready | Dependency cycle or missing dependency | Reject plan before dispatch |
| Side effect repeats after timeout | No destination idempotency | Reconcile using the same stable key |
| Queue grows without bound | No admission control/backpressure | Bound queue, workers and deadlines |
| Publish starts too early | Join dependency not enforced | Require all dependencies completed |
| Restart repeats completed work | Missing durable result/checkpoint | Persist task outcome and operation key |
| Compensation does not restore state | Compensation is not a true rollback | Escalate, reconcile and retain audit evidence |

## Production hardening checklist

- Validate a typed plan against a strict schema and allowlisted operation registry.
- Enforce principal, tenant, capability and resource authorization at each operation boundary.
- Bound concurrency, queue size, retries, deadlines, tokens, spend and tool calls.
- Use destination-native idempotency for every externally visible side effect.
- Persist state transitions, payload digests, outcomes and audit correlation.
- Add lease ownership and fencing tokens for distributed workers.
- Use transactional outbox/inbox patterns for database-to-queue consistency.
- Reconcile ambiguous outcomes; never infer failure from a timeout alone.
- Test duplicate delivery, worker crash, stale owner, partial completion and compensation failure.
- Keep human approval for high-impact actions.

## Mastery defense

1. When is a deterministic workflow safer than an autonomous agent?
2. Why is a DAG cycle rejected before execution?
3. How do you prove a worker limit is respected?
4. Why does a timeout create an ambiguous outcome?
5. What must an idempotency key be bound to?
6. Why can a local checkpoint not guarantee exactly-once remote side effects?
7. What is the difference between retry and compensation?
8. Why do compensations run in reverse completion order?
9. What do fencing tokens protect against?
10. Which properties must be enforced by the destination service?

## Topic 2 — Agent Protocol Interoperability: MCP, A2A and ACP

### 1. Pick the protocol by the boundary

These protocols are complementary, not synonyms:

| Protocol | Communication boundary | Main abstraction |
|---|---|---|
| Model Context Protocol (MCP) | Model host/client ↔ context server | Tools, resources and prompts |
| Agent2Agent (A2A) | Independent agent ↔ independent agent | Agent Cards, messages, tasks and artifacts |
| Agent Client Protocol (ACP) | IDE/editor client ↔ coding agent | JSON-RPC sessions, prompts, updates and client permissions |
| IBM/BeeAI Agent Communication Protocol (legacy ACP) | Historical agent ↔ agent | Legacy message interoperability now migrating into A2A |

The acronym ACP is overloaded. Every lesson, diagram and code sample must spell out which ACP is meant. IBM/BeeAI ACP is not Agent Client Protocol.

### 2. MCP version-aware engineering

The current MCP specification used by this lesson is **2026-07-28**. Its modern core is stateless: the old `initialize`/`initialized` exchange and `Mcp-Session-Id` session header are removed for this version. Requests carry protocol/version and client context per request; `server/discover` is an optional capability probe. Streamable HTTP requests use `Mcp-Method` and `Mcp-Name` routing headers. The modern protocol supports Multi Round-Trip Requests (MRTR): a tool can return `input_required`, and the client retries with `inputResponses`. List results can include `ttlMs` and `cacheScope` hints. OAuth hardening includes issuer validation and a move away from Dynamic Client Registration toward Client ID Metadata Documents. The legacy HTTP+SSE transport and roots/sampling/logging features are deprecated in this revision; do not teach them as the default for new integrations.

Earlier versions (for example 2025-11-25) still use the initialization/session model. Version negotiation must be explicit. Do not apply modern stateless assumptions to a legacy connection or send a legacy initialize handshake to a modern stateless endpoint.

MCP tools are callable capabilities, not trusted simply because they were discovered. Validate JSON-RPC envelopes, request IDs, protocol version, routing headers, tool name, argument schema, authorization issuer, scopes, resource ownership and output. Treat tool descriptions and server-provided content as untrusted input.

### 3. A2A 1.0 task interoperability

A2A 1.0.0 connects independent agents without requiring one agent to expose its internal memory or tools. An Agent Card describes identity, supported interfaces, skills, capabilities and authentication requirements. A client discovers or configures the card, verifies the peer and selects a supported protocol binding.

A message may return an immediate Message for a simple interaction or a Task for work that continues asynchronously. Tasks have stable IDs and context IDs, a state, history and artifacts. Artifacts are outputs; Messages are communication and should not be confused with durable task results. Task updates can be polled, streamed or pushed when the agent advertises the relevant capability. Streaming events must remain ordered. Terminal tasks cannot be restarted by sending another message to the same terminal task.

Model the task lifecycle explicitly: submitted → working → completed/failed/canceled/rejected, with input-required and auth-required interruption states. Validate state transitions, media types, task ownership, authentication and authorization. A signed Agent Card is evidence to verify, not a reason to skip TLS or runtime authorization. Keep task IDs and context IDs distinct, and do not use a caller-controlled context ID as an authorization grant.

### 4. Agent Client Protocol v2

Agent Client Protocol is an IDE/editor-to-coding-agent protocol. Both sides exchange JSON-RPC 2.0 requests, responses and notifications. A typical flow negotiates protocol version and capabilities, completes any advertised authentication, creates or resumes a session, sends prompts, receives session updates and permission requests, and can cancel foreground work. Request IDs are string or integer values; do not reuse an outstanding ID. ACP does not use JSON-RPC batches.

The client advertises capabilities such as filesystem read/write and terminal support. The agent must not assume those capabilities exist. Permission requests are explicit: the client decides whether to allow a requested operation. A coding agent running as a subprocess is not automatically authorized to read arbitrary host paths or launch arbitrary terminal commands. Keep filesystem roots, command allowlists, approval scope and cancellation behavior explicit.

### 5. IBM/BeeAI ACP migration

IBM Research identifies its Agent Communication Protocol as now part of A2A under the Linux Foundation. Treat IBM/BeeAI ACP as a legacy agent-to-agent lineage and use the official migration guidance when upgrading. A message mapper can preserve sender, receiver, conversation/context and content, but migration is not a field rename: authentication, task lifecycle, streaming, artifacts, error semantics, discovery and authorization may differ. Record every semantic gap and test it; do not claim wire compatibility from a successful message conversion.

### 6. Cross-protocol gateway

Normalize each inbound request into an internal envelope containing the verified principal, tenant, protocol/version, request ID, action, resource scope, correlation ID, deadline and capability evidence. Keep the verified identity outside model-generated or peer-supplied payloads. Protocol adapters validate wire semantics; the policy enforcement point independently decides whether the operation is allowed. Preserve protocol-specific state and errors rather than flattening everything into an untyped chat string.

## Topic 2 lab

Run:

```bash
python examples/stage-12/protocol_interop/protocol_lab.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

The simulator checks MCP modern/legacy version behavior, header routing, tool schema and OAuth issuer checks, MRTR input completion, A2A Agent Card/task/idempotency/streaming/capability rules, ACP v2 session and client permission boundaries, IBM/BeeAI ACP message mapping and trusted identity normalization. It does not open sockets or claim complete wire conformance.

## Topic 3 — Advanced Retrieval and Context Engineering

### 1. Security before similarity

A vector score is not an access-control decision. Resolve the authenticated principal, tenant, roles, allowed document set, classification and effective date before retrieval. Apply these predicates before candidate scoring and top-k. Filtering only after ranking can leak document existence, displace authorized evidence and contaminate reranker/context caches. Graph neighbors, parent chunks and cached results must pass the same authorization boundary.

### 2. Combine retrieval signals

- **Lexical retrieval** is strong for exact names, identifiers, dates, legal phrases and rare terms.
- **Dense retrieval** captures semantic similarity but can miss exact identifiers and may rank semantically related but incorrect passages.
- **Hybrid retrieval** combines independent rankings. Reciprocal Rank Fusion (RRF) gives each result a contribution (1/(k_0 + rank)) per ranking and avoids pretending lexical and vector scores share a calibrated scale.
- **Multi-vector / late interaction** preserves token-level representations. A MaxSim-style score can sum or average, for each query token vector, its maximum similarity to document token vectors. This can improve fine-grained matching but increases storage and compute.
- **Reranking** applies a more expensive relevance model to a bounded, already-authorized candidate set. It cannot repair an authorization filter that ran too late.

### 3. Query planning and graph expansion

Decompose multi-part questions into sub-queries, route exact identifier lookups differently from broad semantic questions, and request freshness-aware retrieval for “current/latest/as of” queries. Graph retrieval can add linked evidence such as policy → exception → approval, but graph edges are navigation hints, not permission grants. Re-check the ACL and freshness of every evidence chunk reached by graph expansion and bound traversal depth.

### 4. Context engineering

A good context pack is not simply the top-k chunks concatenated. Preserve document ID, immutable version, page, source offsets, section and retrieval score. Rerank authorized candidates, deduplicate overlapping chunks, retain parent context when required, compress only by selecting faithful source spans, and fit the final evidence within a measured token budget. If evidence is missing, stale, contradictory or over budget, abstain or ask a clarifying question rather than inventing a citation.

### 5. Cache isolation and freshness

A retrieval cache key must include normalized query plus tenant, subject/role/ACL scope, document set, as-of/freshness policy, model version, embedding version, index version and authorization-policy version. A cache key that omits tenant or ACL can turn a correct retrieval result into a cross-tenant disclosure. Invalidate on document version changes, deletion, permission changes and index promotion.

### 6. Index migration

Build a candidate index alongside the current one. Shadow the same authorized queries, compare overlap and quality slices, check embedding dimensions and source lineage, and require a minimum sample size and predeclared thresholds before promotion. Keep a compatible previous index for rollback. Do not switch solely because indexing completed successfully.

## Worked retrieval score

Suppose the query has two relevant chunks. Lexical ranking is [A, B, C] and dense ranking is [B, C, A]. With (k_0=60):
- RRF(A) = (1/61 + 1/63)
- RRF(B) = (1/62 + 1/61)
- RRF(C) = (1/63 + 1/62)

B ranks slightly above A because it appears first in the dense ranking and second in lexical. The fused score is a ranking signal, not a calibrated probability of correctness.

## Topic 3 lab

Run:

```bash
python examples/stage-12/advanced_retrieval/retrieval_engine.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

The local corpus tests lexical, dense, hybrid RRF and late-interaction ranking; tenant/document/subject/role and temporal filters before scoring; graph ACL re-checks; exact-source compression and citations; cache-key isolation; shadow-index promotion and rollback; and Recall@K/MRR metrics.

## Stage 12 sequencing

Topics 1 and 2 are merged. Topic 3 is the current implementation gate; Topics 4–9 follow only after each preceding topic passes its tests and review. Topic 9 integrates all prior topics in the Advanced Production Practicum. A lesson is not complete merely because its content file exists; it must run from a clean checkout, pass positive and negative tests, demonstrate failure recovery and satisfy its assessment.
