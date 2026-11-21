# Stage 10 — Individual lesson lab pack: Security, Observability & Production Architecture

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## prompt-injection — Prompt injection and data exfiltration

**Implementation task:** Build a defensive RAG trust boundary. Treat direct user text, retrieved documents and tool outputs as untrusted data; authorize retrieval and proposed tool actions in server-side code; keep secrets outside model context; redact classified output.

**Worked fixture:** Tenant-A user retrieves an untrusted document that asks the assistant to read tenant-B/report-9 and disclose a synthetic canary. The principal is allowed only tenant-A/report-4.

**Expected result:** Only authorized tenant-A evidence enters context. The cross-tenant tool proposal is denied before invocation, tool invocation count remains zero, and the canary is absent from model context, user output and audit serialization.

**Verification tests:** Run `python -m unittest discover -s examples/stage-10 -p 'test_*.py' -v`. Test tenant-scoped retrieval, restricted document rejection, untrusted labels, cross-tenant and unlisted-resource denial, unknown tool denial, allowed scoped read, canary redaction, safe output preservation, bounded context and privacy-safe audit evidence.

**Debugging checklist:** Verify tenant comes from authenticated identity; inspect ACL filtering before context construction; trace source IDs and trust labels; confirm secrets are absent before the LLM adapter; inspect server-side tool decision inputs; assert denied actions invoke no tool; verify output redaction and audit privacy.

**Interview checks:** Explain direct versus indirect injection, retrieval poisoning and tool-output injection. Why are prompt delimiters not authorization? Where should tool permissions be checked? Why must secrets be minimized before model invocation instead of relying only on output filtering?

**Submission evidence:** Include the threat model, trust-boundary diagram, simulator output, passing adversarial tests with negative cases, canary non-disclosure evidence and a short explanation of one failure and its recovery.

---


## tool-security — Tool authorization and sandboxing

**Implementation task:** Authorize each action using principal, verb, resource and context before invoking a tool.

**Worked fixture:** User has read permission on report A but no write permission on report B.

**Expected result:** Read A is allowed; write B is denied before the tool is called.

**Verification tests:** Test path traversal, SSRF, replay, argument tampering and privilege escalation.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What should a capability/authorization check evaluate?

**Submission evidence:** Include implementation and architecture artifacts, a successful run, positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

---

## tenant-security — Multi-tenant security

**Implementation task:** Apply tenant isolation consistently to database, vector search, cache and background jobs.

**Worked fixture:** Tenant A and B each own a document with the same external ID.

**Expected result:** A query returns only tenant A records in every data layer.

**Verification tests:** Test cache-key collision, async tenant-context loss and cross-tenant update.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why is a frontend-supplied tenant ID not a trusted identity claim?

**Submission evidence:** Include implementation and architecture artifacts, a successful run, positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

---

## supply-chain — AI supply-chain security

**Implementation task:** Create an inventory of dependencies and model artifacts and verify hashes and licenses.

**Worked fixture:** Two model artifacts: one checksum mismatch and one unknown license.

**Expected result:** Mismatched artifact is rejected; unknown license is held for review.

**Verification tests:** Test vulnerable dependency, altered model file and secret in build logs.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What provenance should accompany a model or dataset artifact?

**Submission evidence:** Include implementation and architecture artifacts, a successful run, positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

---

## tracing — Tracing and telemetry

**Implementation task:** Trace one request across API, retrieval, model and tool spans with redaction.

**Worked fixture:** One request has a retrieval timeout and two model spans; correlation ID req-42.

**Expected result:** Trace shows parent/child timing and failure; sensitive values are redacted.

**Verification tests:** Test missing spans, high-cardinality labels and sampling behavior.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Which data belongs in metrics, logs and traces respectively?

**Submission evidence:** Include implementation and architecture artifacts, a successful run, positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

---

## slos — SLOs and reliability

**Implementation task:** Calculate availability and latency SLI and compare them with an SLO.

**Worked fixture:** 1000 requests, 995 successful; p95 latency 1.8s; targets 99.5% and 2s.

**Expected result:** Availability=99.5%; p95 meets the 2s target.

**Verification tests:** Test denominator rules, invalid traffic and error-budget burn.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What operational action should a rapid error-budget burn trigger?

**Submission evidence:** Include implementation and architecture artifacts, a successful run, positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

---

## cost — AI cost engineering

**Implementation task:** Calculate end-to-end request cost across generation, embeddings, reranking and retries.

**Worked fixture:** 1000 input tokens, 200 output tokens, one embedding call, one rerank; prices supplied as config.

**Expected result:** Total cost is the sum of components; cost per successful task includes failed retries.

**Verification tests:** Test prompt bloat, duplicate retries and cache hits.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why optimize cost per successful task instead of cost per request?

**Submission evidence:** Include implementation and architecture artifacts, a successful run, positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

---

## incidents — Incident response and debugging

**Implementation task:** Run a provider-outage drill with mitigation, communication and postmortem evidence.

**Worked fixture:** Model provider returns 503 for five minutes while indexed documents remain available.

**Expected result:** Circuit breaker opens; service returns a clear degraded response or safe retrieval-only result; timeline is captured.

**Verification tests:** Test recovery, credential rotation, alerting and secret-free logs.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect identity, permissions, data flow and intermediate state; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What evidence belongs in a blameless incident postmortem?

**Submission evidence:** Include implementation and architecture artifacts, a successful run, positive and negative tests, a short failure analysis, and a 3–5 sentence explanation of the operational trade-off.

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected behavior is reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
