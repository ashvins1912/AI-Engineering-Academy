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

## Stage completion evidence

- [ ] Topic 1 plan validator and coordinator pass all positive and negative tests from a clean checkout.
- [ ] Worker concurrency never exceeds the configured bound; dependency barriers are demonstrated.
- [ ] Restart and idempotency behavior is demonstrated with a persisted journal.
- [ ] Failure handling blocks dependents and records reverse-order compensation.
- [ ] Production limitations and external side-effect guarantees are explained accurately.
- [ ] Topic 1 closed-book mastery defense is completed before Topic 2.
- [ ] Topic 2 protocol contract tests and migration gap analysis pass before Topic 3.
