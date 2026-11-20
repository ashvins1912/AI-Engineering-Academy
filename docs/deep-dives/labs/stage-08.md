# Stage 08 — Individual lesson lab pack: Automation & Workflow Orchestration

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## workflow-patterns — Workflow patterns

**Implementation task:** Workflow patterns

**Worked fixture:** Draw and implement a saga with compensation branches.

**Expected result:** Reserve stock→authorize payment→book shipment; shipment fails.

**Verification tests:** Payment void and stock release execute in reverse dependency order.

**Debugging checklist:** How does saga differ from a database transaction?

**Interview checks:** Test compensation failure and ambiguous outcome.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## event-driven — Event-driven automation

**Implementation task:** Event-driven automation

**Worked fixture:** Publish typed CloudEvent and deduplicate consumer deliveries.

**Expected result:** event id evt-1 delivered twice, then evt-2 out of order.

**Verification tests:** evt-1 side effect happens once; ordering policy is explicit.

**Debugging checklist:** Why use an outbox for DB-write plus event publication?

**Interview checks:** Test poison event, schema version and replay.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## durable — Durable workflow engines

**Implementation task:** Durable workflow engines

**Worked fixture:** Persist workflow state and recover after worker crash.

**Expected result:** Wait activity then continue; crash after activity completion before state update.

**Verification tests:** Resume does not repeat non-idempotent effect.

**Debugging checklist:** Which steps must be idempotent in durable execution?

**Interview checks:** Test retry exhaustion, heartbeat timeout and deterministic replay.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## automation-tools — Automation platform integration

**Implementation task:** Automation platform integration

**Worked fixture:** Verify webhook signature and map provider payload to internal event.

**Expected result:** Valid HMAC payload, altered payload and expired timestamp.

**Verification tests:** Valid accepted; altered/expired rejected; normalized event emitted.

**Debugging checklist:** Why validate signature before processing webhook body?

**Interview checks:** Test replay, schema drift and rate limit.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
