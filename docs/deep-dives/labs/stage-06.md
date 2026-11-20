# Stage 06 — Individual lesson lab pack: AI Agents & Agentic Systems

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## agent-loop — Implement observe→decide→validate→execute with a hard step budget.

**Implementation task:** Tool add(2,3), max_steps=3; second scenario repeats same call.

**Worked fixture:** Returns 5 and terminates; repeated action hits budget and stops safely.

**Expected result:** Test unknown tool, invalid schema and timeout.

**Verification tests:** Why must model decisions pass server-side validation?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## planning — Convert a user task into a typed dependency DAG and topologically order it.

**Implementation task:** Tasks: fetch→summarize→review; review depends on summarize.

**Worked fixture:** Valid order respects dependencies; cycle is rejected.

**Expected result:** Test missing dependency, cycle and impossible task.

**Verification tests:** When should planner re-plan rather than retry?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## memory — Implement memory records with source, timestamp, expiry and sensitivity labels.

**Implementation task:** Fact A valid until date X; newer fact B contradicts A.

**Worked fixture:** Retrieval prefers current supported fact and reports conflict when unresolved.

**Expected result:** Test stale memory, sensitive field exclusion and injected memory text.

**Verification tests:** How should memory deletion/retention be enforced?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## state — Persist state before/after a side effect and resume after simulated crash.

**Implementation task:** Payment-like mock side effect with idempotency key order-123.

**Worked fixture:** Retry returns same result without duplicate side effect.

**Expected result:** Crash before write, after write and duplicate event.

**Verification tests:** What is the exactly-once illusion and how is idempotency used?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## human-loop — Require approval for an irreversible tool and bind approval to exact arguments.

**Implementation task:** Transfer amount=100 to account A; change amount to 1000 after approval.

**Worked fixture:** Original approved action allowed; modified arguments rejected.

**Expected result:** Test expired, denied and replayed approval.

**Verification tests:** What should an approval record bind to?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## patterns — Compare router and supervisor/worker for a three-task read-only workflow.

**Implementation task:** Tasks: search docs, calculate total, summarize evidence.

**Worked fixture:** Router selects correct specialist; supervisor aggregates with provenance.

**Expected result:** Test worker failure and contradictory outputs.

**Verification tests:** When is a deterministic pipeline better than multi-agent delegation?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## langgraph — Model a conditional graph with checkpoint and approval interrupt.

**Implementation task:** Nodes classify→retrieve→draft; mutation node requires approval.

**Worked fixture:** Checkpoint resumes at correct node; unauthorized edge never runs.

**Expected result:** Test cyclic edge, state schema change and resume.

**Verification tests:** What does checkpointing persist in a graph workflow?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## frameworks — Implement same two-tool workflow with raw functions and one orchestration framework.

**Implementation task:** Tools lookup_policy and add_numbers; same fixtures and max steps.

**Worked fixture:** Compare trace, retries, code size and latency; outputs match.

**Expected result:** Test framework upgrade and adapter boundary.

**Verification tests:** Which requirements justify a framework dependency?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## agent-eval — Evaluate agent traces against task success and tool-call expectations.

**Implementation task:** 10 deterministic tasks; 2 include tool failure.

**Worked fixture:** Report completion, correct tool-call rate, policy violations, latency.

**Expected result:** Test flaky tool, extra calls and adversarial instruction.

**Verification tests:** Why is final-answer evaluation insufficient for agents?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
