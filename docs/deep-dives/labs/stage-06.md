# Stage 06 — Individual lesson lab pack: AI Agents & Agentic Systems

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## agent-loop — Agent loop and control flow

**Implementation task:** Implement observe→decide→validate→execute with a hard step budget.

**Worked fixture:** Tool add(2,3), max_steps=3; second scenario repeats same call.

**Expected result:** Returns 5 and terminates; repeated action hits budget and stops safely.

**Verification tests:** Test unknown tool, invalid schema and timeout.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why must model decisions pass server-side validation?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## planning — Planning and task decomposition

**Implementation task:** Convert a user task into a typed dependency DAG and topologically order it.

**Worked fixture:** Tasks: fetch→summarize→review; review depends on summarize.

**Expected result:** Valid order respects dependencies; cycle is rejected.

**Verification tests:** Test missing dependency, cycle and impossible task.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** When should planner re-plan rather than retry?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## memory — Agent memory and context engineering

**Implementation task:** Implement memory records with source, timestamp, expiry and sensitivity labels.

**Worked fixture:** Fact A valid until date X; newer fact B contradicts A.

**Expected result:** Retrieval prefers current supported fact and reports conflict when unresolved.

**Verification tests:** Test stale memory, sensitive field exclusion and injected memory text.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How should memory deletion/retention be enforced?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## state — State, checkpoints and durable execution

**Implementation task:** Persist state before/after a side effect and resume after simulated crash.

**Worked fixture:** Payment-like mock side effect with idempotency key order-123.

**Expected result:** Retry returns same result without duplicate side effect.

**Verification tests:** Crash before write, after write and duplicate event.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What is the exactly-once illusion and how is idempotency used?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## human-loop — Human-in-the-loop controls

**Implementation task:** Require approval for an irreversible tool and bind approval to exact arguments.

**Worked fixture:** Transfer amount=100 to account A; change amount to 1000 after approval.

**Expected result:** Original approved action allowed; modified arguments rejected.

**Verification tests:** Test expired, denied and replayed approval.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What should an approval record bind to?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## patterns — Agent design patterns

**Implementation task:** Compare router and supervisor/worker for a three-task read-only workflow.

**Worked fixture:** Tasks: search docs, calculate total, summarize evidence.

**Expected result:** Router selects correct specialist; supervisor aggregates with provenance.

**Verification tests:** Test worker failure and contradictory outputs.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** When is a deterministic pipeline better than multi-agent delegation?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## langgraph — Graph-based agent orchestration

**Implementation task:** Model a conditional graph with checkpoint and approval interrupt.

**Worked fixture:** Nodes classify→retrieve→draft; mutation node requires approval.

**Expected result:** Checkpoint resumes at correct node; unauthorized edge never runs.

**Verification tests:** Test cyclic edge, state schema change and resume.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What does checkpointing persist in a graph workflow?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## frameworks — Framework comparison

**Implementation task:** Implement same two-tool workflow with raw functions and one orchestration framework.

**Worked fixture:** Tools lookup_policy and add_numbers; same fixtures and max steps.

**Expected result:** Compare trace, retries, code size and latency; outputs match.

**Verification tests:** Test framework upgrade and adapter boundary.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Which requirements justify a framework dependency?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## agent-eval — Agent evaluation

**Implementation task:** Evaluate agent traces against task success and tool-call expectations.

**Worked fixture:** 10 deterministic tasks; 2 include tool failure.

**Expected result:** Report completion, correct tool-call rate, policy violations, latency.

**Verification tests:** Test flaky tool, extra calls and adversarial instruction.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why is final-answer evaluation insufficient for agents?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
