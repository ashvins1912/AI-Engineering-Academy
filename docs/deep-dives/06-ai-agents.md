# Stage 06 — AI Agents & Agentic Systems

## Outcome
Design agents as bounded, observable stateful systems—not unbounded chat loops. Separate model reasoning from deterministic policy, authorization and execution.

### Agent loop and control flow
Model the loop as observe → decide → validate → authorize → execute → append result → stop/continue. Implement a deterministic loop with a maximum step count, timeout, token budget and typed tool results. Test tool errors, repeated calls, empty results and stop conditions. Never let model output directly bypass validation.

### Planning and task decomposition
Compare direct execution, plan-then-execute and hierarchical decomposition. Build a planner that emits a typed task DAG with dependencies and acceptance criteria. Test cycles, missing dependencies, impossible tasks and plan drift. Re-plan only on explicit evidence; cap depth and total actions.

### Memory and context engineering
Separate working context, conversation history, episodic memory and durable knowledge. Implement a memory policy with provenance, expiry, relevance and deletion semantics. Test stale facts, contradictory memories, prompt injection and sensitive data. Minimize retention and retrieve only authorized relevant records.

### State, checkpoints and durable execution
Define typed state, transitions, checkpoints, idempotency keys and recovery boundaries. Simulate a process crash between tool execution and state persistence. Test duplicate event delivery, retry, resume and partial completion. Use durable storage for production workflows.

### Human-in-the-loop controls
Classify actions as read-only, reversible or consequential. Require explicit approval for high-impact operations; show user the exact action and data scope. Test approval expiry, denied action, changed arguments and replay. Record who approved what and when.

### Agent design patterns
Implement router, tool-calling, planner/executor, supervisor/worker and evaluator loops. Compare failure isolation, latency and observability. Test tool hallucination, worker disagreement and runaway delegation. Prefer simple deterministic workflows when autonomy adds no measurable value.

### Graph-based orchestration
Represent nodes as typed functions and edges as conditional transitions. Add checkpoint, interrupt, retry and human approval nodes. Test cycles, state schema evolution and resumed execution. Keep authorization outside graph-generated instructions.

### Framework comparison
Compare raw SDK, LangGraph and other frameworks by state model, retries, persistence, observability, vendor coupling and testing. Reimplement one small workflow without a framework to understand abstractions. Pin versions and avoid framework-specific state leaking into domain logic.

### Agent evaluation
Create task-level golden cases and measure completion, correctness, tool-call precision, policy violations, latency and cost. Add adversarial tasks, flaky tools and multi-step failure injection. Evaluate traces, not only final text; gate releases on safety and task success.

## Stage project — Bounded research agent
Build a read-only research agent with two scoped tools, typed state, max five steps, timeout, citation-bearing output, trace log and human approval for any mutation. Include deterministic tests and a failure matrix.

## Mastery gate
Explain the state machine, demonstrate crash recovery and idempotency, enforce approval boundaries and produce reproducible trace-based evaluation.

## Primary references
- LangGraph: https://langchain-ai.github.io/langgraph/
- Pydantic: https://docs.pydantic.dev/
- OWASP Agentic AI guidance: https://genai.owasp.org/
