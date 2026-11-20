# Stage 07 — Individual lesson lab pack: MCP, A2A, ACP & Tool Ecosystems

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## mcp-architecture — MCP architecture and lifecycle

**Implementation task:** Trace initialize→capability negotiation→list tools→call tool→shutdown.

**Worked fixture:** Local add tool and status resource.

**Expected result:** Client discovers exactly one tool/resource and handles JSON-RPC response.

**Verification tests:** Test unsupported version and malformed request.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** What belongs to MCP host vs client vs server?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-primitives — Tools, resources and prompts

**Implementation task:** Expose typed add tool, read-only status resource and prompt template.

**Worked fixture:** add(a=2,b=3), resource academy://status.

**Expected result:** Tool returns 5; resource returns demo-ready; invalid types rejected.

**Verification tests:** Test extra fields and large tool result.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How do tools differ from resources and prompts?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-advanced — MCP advanced capabilities

**Implementation task:** Add progress and cancellation to a deliberately slow read-only operation.

**Worked fixture:** Operation has 5 steps; cancel after step 2.

**Expected result:** Progress emitted; cancellation stops remaining work.

**Verification tests:** Test disconnect and unsupported capability.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why must capability support be negotiated?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-transport — Transport and deployment

**Implementation task:** Run a local stdio server and verify protocol stdout is clean.

**Worked fixture:** Server emits one tool response; diagnostic logs go to stderr.

**Expected result:** Client parses frames without log noise.

**Verification tests:** Test malformed frame, restart and secret in logs.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** When would remote HTTP transport be preferable to stdio?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-security — MCP security engineering

**Implementation task:** Authorize tool calls by authenticated principal and resource scope.

**Worked fixture:** User A can read doc A, not doc B; malicious tool metadata asks for secrets.

**Expected result:** A allowed, B denied; tool metadata cannot elevate permission.

**Verification tests:** Test confused deputy, path traversal, SSRF and scope escalation.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why is tool description not an authorization policy?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## a2a — Agent2Agent protocol

**Implementation task:** Implement agent-card discovery and asynchronous task lifecycle.

**Worked fixture:** Agent card advertises summarize capability; submit task then poll status.

**Expected result:** Task transitions submitted→working→completed with artifact reference.

**Verification tests:** Test duplicate task, expired task and untrusted callback URL.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How does A2A differ from a tool invocation?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## ibm-acp — IBM/BeeAI Agent Communication Protocol

**Implementation task:** Build a protocol adapter mapping external message/task schema to internal typed message.

**Worked fixture:** Mock incoming task, success and failure message variants.

**Expected result:** Known messages map; unknown version/type returns controlled error.

**Verification tests:** Test version mismatch and unknown message type.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why isolate protocol schemas behind an adapter?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## client-acp — Agent Client Protocol

**Implementation task:** Mock an editor client session with streaming updates and approval request.

**Worked fixture:** Session sends update, asks permission, then completes.

**Expected result:** Client displays update; tool action waits for approval.

**Verification tests:** Test cancellation, resume and denied permission.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How does editor-agent session protocol differ from MCP?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## tooling — Tool integration engineering

**Implementation task:** Wrap an external API with timeout, retries, idempotency and redacted logs.

**Worked fixture:** Mock 429 then 200; same idempotency key on retry.

**Expected result:** Backoff occurs and side effect is not duplicated.

**Verification tests:** Test 5xx, malformed response, expired token and secret redaction.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Which failures are safe to retry?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
