# Stage 08 — Individual lesson lab pack: Automation & Workflow Orchestration

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## workflow-patterns — Workflow patterns

**Implementation task:** Draw and implement a saga with compensation branches.

**Worked fixture:** Reserve stock→authorize payment→book shipment; shipment fails.

**Expected result:** Payment void and stock release execute in reverse dependency order.

**Verification tests:** Test compensation failure and ambiguous outcome.

**Debugging checklist:** How does saga differ from a database transaction?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## event-driven — Event-driven automation

**Implementation task:** Publish typed CloudEvent and deduplicate consumer deliveries.

**Worked fixture:** event id evt-1 delivered twice, then evt-2 out of order.

**Expected result:** evt-1 side effect happens once; ordering policy is explicit.

**Verification tests:** Test poison event, schema version and replay.

**Debugging checklist:** Why use an outbox for DB-write plus event publication?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## durable — Durable workflow engines

**Implementation task:** Persist workflow state and recover after worker crash.

**Worked fixture:** Wait activity then continue; crash after activity completion before state update.

**Expected result:** Resume does not repeat non-idempotent effect.

**Verification tests:** Test retry exhaustion, heartbeat timeout and deterministic replay.

**Debugging checklist:** Which steps must be idempotent in durable execution?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## automation-tools — Automation platform integration

**Implementation task:** Verify webhook signature and map provider payload to internal event.

**Worked fixture:** Valid HMAC payload, altered payload and expired timestamp.

**Expected result:** Valid accepted; altered/expired rejected; normalized event emitted.

**Verification tests:** Test replay, schema drift and rate limit.

**Debugging checklist:** Why validate signature before processing webhook body?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
