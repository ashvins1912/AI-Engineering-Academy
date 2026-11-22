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

## Stage completion evidence

- [ ] Topic 1 plan validator and coordinator pass all positive and negative tests from a clean checkout.
- [ ] Worker concurrency never exceeds the configured bound; dependency barriers are demonstrated.
- [ ] Restart and idempotency behavior is demonstrated with a persisted journal.
- [ ] Failure handling blocks dependents and records reverse-order compensation.
- [ ] Production limitations and external side-effect guarantees are explained accurately.
- [ ] Closed-book mastery defense is completed before Topic 2 begins.
