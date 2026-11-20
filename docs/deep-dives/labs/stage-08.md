# Stage 08 — Individual lesson lab pack: Automation & Workflow Orchestration

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## workflow-patterns — Draw and implement a saga with compensation branches.

**Implementation task:** Reserve stock→authorize payment→book shipment; shipment fails.

**Worked fixture:** Payment void and stock release execute in reverse dependency order.

**Expected result:** Test compensation failure and ambiguous outcome.

**Verification tests:** How does saga differ from a database transaction?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## event-driven — Publish typed CloudEvent and deduplicate consumer deliveries.

**Implementation task:** event id evt-1 delivered twice, then evt-2 out of order.

**Worked fixture:** evt-1 side effect happens once; ordering policy is explicit.

**Expected result:** Test poison event, schema version and replay.

**Verification tests:** Why use an outbox for DB-write plus event publication?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## durable — Persist workflow state and recover after worker crash.

**Implementation task:** Wait activity then continue; crash after activity completion before state update.

**Worked fixture:** Resume does not repeat non-idempotent effect.

**Expected result:** Test retry exhaustion, heartbeat timeout and deterministic replay.

**Verification tests:** Which steps must be idempotent in durable execution?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## automation-tools — Verify webhook signature and map provider payload to internal event.

**Implementation task:** Valid HMAC payload, altered payload and expired timestamp.

**Worked fixture:** Valid accepted; altered/expired rejected; normalized event emitted.

**Expected result:** Test replay, schema drift and rate limit.

**Verification tests:** Why validate signature before processing webhook body?

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
