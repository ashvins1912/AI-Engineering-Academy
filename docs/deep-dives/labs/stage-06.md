# Stage 06 — Individual lesson lab pack: AI Agents & Agentic Systems

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## agent-loop — Agent loop and control flow

**Implementation task:** Agent loop and control flow

**Worked fixture:** Implement observe→decide→validate→execute with a hard step budget.

**Expected result:** Tool add(2,3), max_steps=3; second scenario repeats same call.

**Verification tests:** Returns 5 and terminates; repeated action hits budget and stops safely.

**Debugging checklist:** Why must model decisions pass server-side validation?

**Interview checks:** Test unknown tool, invalid schema and timeout.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## planning — Planning and task decomposition

**Implementation task:** Planning and task decomposition

**Worked fixture:** Convert a user task into a typed dependency DAG and topologically order it.

**Expected result:** Tasks: fetch→summarize→review; review depends on summarize.

**Verification tests:** Valid order respects dependencies; cycle is rejected.

**Debugging checklist:** When should planner re-plan rather than retry?

**Interview checks:** Test missing dependency, cycle and impossible task.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## memory — Agent memory and context engineering

**Implementation task:** Agent memory and context engineering

**Worked fixture:** Implement memory records with source, timestamp, expiry and sensitivity labels.

**Expected result:** Fact A valid until date X; newer fact B contradicts A.

**Verification tests:** Retrieval prefers current supported fact and reports conflict when unresolved.

**Debugging checklist:** How should memory deletion/retention be enforced?

**Interview checks:** Test stale memory, sensitive field exclusion and injected memory text.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## state — State, checkpoints and durable execution

**Implementation task:** State, checkpoints and durable execution

**Worked fixture:** Persist state before/after a side effect and resume after simulated crash.

**Expected result:** Payment-like mock side effect with idempotency key order-123.

**Verification tests:** Retry returns same result without duplicate side effect.

**Debugging checklist:** What is the exactly-once illusion and how is idempotency used?

**Interview checks:** Crash before write, after write and duplicate event.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## human-loop — Human-in-the-loop controls

**Implementation task:** Human-in-the-loop controls

**Worked fixture:** Require approval for an irreversible tool and bind approval to exact arguments.

**Expected result:** Transfer amount=100 to account A; change amount to 1000 after approval.

**Verification tests:** Original approved action allowed; modified arguments rejected.

**Debugging checklist:** What should an approval record bind to?

**Interview checks:** Test expired, denied and replayed approval.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## patterns — Agent design patterns

**Implementation task:** Agent design patterns

**Worked fixture:** Compare router and supervisor/worker for a three-task read-only workflow.

**Expected result:** Tasks: search docs, calculate total, summarize evidence.

**Verification tests:** Router selects correct specialist; supervisor aggregates with provenance.

**Debugging checklist:** When is a deterministic pipeline better than multi-agent delegation?

**Interview checks:** Test worker failure and contradictory outputs.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## langgraph — Graph-based agent orchestration

**Implementation task:** Graph-based agent orchestration

**Worked fixture:** Model a conditional graph with checkpoint and approval interrupt.

**Expected result:** Nodes classify→retrieve→draft; mutation node requires approval.

**Verification tests:** Checkpoint resumes at correct node; unauthorized edge never runs.

**Debugging checklist:** What does checkpointing persist in a graph workflow?

**Interview checks:** Test cyclic edge, state schema change and resume.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## frameworks — Framework comparison

**Implementation task:** Framework comparison

**Worked fixture:** Implement same two-tool workflow with raw functions and one orchestration framework.

**Expected result:** Tools lookup_policy and add_numbers; same fixtures and max steps.

**Verification tests:** Compare trace, retries, code size and latency; outputs match.

**Debugging checklist:** Which requirements justify a framework dependency?

**Interview checks:** Test framework upgrade and adapter boundary.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## agent-eval — Agent evaluation

**Implementation task:** Agent evaluation

**Worked fixture:** Evaluate agent traces against task success and tool-call expectations.

**Expected result:** 10 deterministic tasks; 2 include tool failure.

**Verification tests:** Report completion, correct tool-call rate, policy violations, latency.

**Debugging checklist:** Why is final-answer evaluation insufficient for agents?

**Interview checks:** Test flaky tool, extra calls and adversarial instruction.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
