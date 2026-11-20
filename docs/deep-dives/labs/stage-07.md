# Stage 07 — Individual lesson lab pack: MCP, A2A, ACP & Tool Ecosystems

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## mcp-architecture — Trace initialize→capability negotiation→list tools→call tool→shutdown.

**Implementation task:** Local add tool and status resource.

**Worked fixture:** Client discovers exactly one tool/resource and handles JSON-RPC response.

**Expected result:** Test unsupported version and malformed request.

**Verification tests:** What belongs to MCP host vs client vs server?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-primitives — Expose typed add tool, read-only status resource and prompt template.

**Implementation task:** add(a=2,b=3), resource academy://status.

**Worked fixture:** Tool returns 5; resource returns demo-ready; invalid types rejected.

**Expected result:** Test extra fields and large tool result.

**Verification tests:** How do tools differ from resources and prompts?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-advanced — Add progress and cancellation to a deliberately slow read-only operation.

**Implementation task:** Operation has 5 steps; cancel after step 2.

**Worked fixture:** Progress emitted; cancellation stops remaining work.

**Expected result:** Test disconnect and unsupported capability.

**Verification tests:** Why must capability support be negotiated?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-transport — Run a local stdio server and verify protocol stdout is clean.

**Implementation task:** Server emits one tool response; diagnostic logs go to stderr.

**Worked fixture:** Client parses frames without log noise.

**Expected result:** Test malformed frame, restart and secret in logs.

**Verification tests:** When would remote HTTP transport be preferable to stdio?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-security — Authorize tool calls by authenticated principal and resource scope.

**Implementation task:** User A can read doc A, not doc B; malicious tool metadata asks for secrets.

**Worked fixture:** A allowed, B denied; tool metadata cannot elevate permission.

**Expected result:** Test confused deputy, path traversal, SSRF and scope escalation.

**Verification tests:** Why is tool description not an authorization policy?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## a2a — Implement agent-card discovery and asynchronous task lifecycle.

**Implementation task:** Agent card advertises summarize capability; submit task then poll status.

**Worked fixture:** Task transitions submitted→working→completed with artifact reference.

**Expected result:** Test duplicate task, expired task and untrusted callback URL.

**Verification tests:** How does A2A differ from a tool invocation?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## ibm-acp — Build a protocol adapter mapping external message/task schema to internal typed message.

**Implementation task:** Mock incoming task, success and failure message variants.

**Worked fixture:** Known messages map; unknown version/type returns controlled error.

**Expected result:** Test version mismatch and unknown message type.

**Verification tests:** Why isolate protocol schemas behind an adapter?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## client-acp — Mock an editor client session with streaming updates and approval request.

**Implementation task:** Session sends update, asks permission, then completes.

**Worked fixture:** Client displays update; tool action waits for approval.

**Expected result:** Test cancellation, resume and denied permission.

**Verification tests:** How does editor-agent session protocol differ from MCP?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## tooling — Wrap an external API with timeout, retries, idempotency and redacted logs.

**Implementation task:** Mock 429 then 200; same idempotency key on retry.

**Worked fixture:** Backoff occurs and side effect is not duplicated.

**Expected result:** Test 5xx, malformed response, expired token and secret redaction.

**Verification tests:** Which failures are safe to retry?

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
