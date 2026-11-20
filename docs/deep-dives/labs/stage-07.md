# Stage 07 — Individual lesson lab pack: MCP, A2A, ACP & Tool Ecosystems

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## mcp-architecture — MCP architecture and lifecycle

**Implementation task:** MCP architecture and lifecycle

**Worked fixture:** Trace initialize→capability negotiation→list tools→call tool→shutdown.

**Expected result:** Local add tool and status resource.

**Verification tests:** Client discovers exactly one tool/resource and handles JSON-RPC response.

**Debugging checklist:** What belongs to MCP host vs client vs server?

**Interview checks:** Test unsupported version and malformed request.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-primitives — Tools, resources and prompts

**Implementation task:** Tools, resources and prompts

**Worked fixture:** Expose typed add tool, read-only status resource and prompt template.

**Expected result:** add(a=2,b=3), resource academy://status.

**Verification tests:** Tool returns 5; resource returns demo-ready; invalid types rejected.

**Debugging checklist:** How do tools differ from resources and prompts?

**Interview checks:** Test extra fields and large tool result.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-advanced — MCP advanced capabilities

**Implementation task:** MCP advanced capabilities

**Worked fixture:** Add progress and cancellation to a deliberately slow read-only operation.

**Expected result:** Operation has 5 steps; cancel after step 2.

**Verification tests:** Progress emitted; cancellation stops remaining work.

**Debugging checklist:** Why must capability support be negotiated?

**Interview checks:** Test disconnect and unsupported capability.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-transport — Transport and deployment

**Implementation task:** Transport and deployment

**Worked fixture:** Run a local stdio server and verify protocol stdout is clean.

**Expected result:** Server emits one tool response; diagnostic logs go to stderr.

**Verification tests:** Client parses frames without log noise.

**Debugging checklist:** When would remote HTTP transport be preferable to stdio?

**Interview checks:** Test malformed frame, restart and secret in logs.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## mcp-security — MCP security engineering

**Implementation task:** MCP security engineering

**Worked fixture:** Authorize tool calls by authenticated principal and resource scope.

**Expected result:** User A can read doc A, not doc B; malicious tool metadata asks for secrets.

**Verification tests:** A allowed, B denied; tool metadata cannot elevate permission.

**Debugging checklist:** Why is tool description not an authorization policy?

**Interview checks:** Test confused deputy, path traversal, SSRF and scope escalation.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## a2a — Agent2Agent protocol

**Implementation task:** Agent2Agent protocol

**Worked fixture:** Implement agent-card discovery and asynchronous task lifecycle.

**Expected result:** Agent card advertises summarize capability; submit task then poll status.

**Verification tests:** Task transitions submitted→working→completed with artifact reference.

**Debugging checklist:** How does A2A differ from a tool invocation?

**Interview checks:** Test duplicate task, expired task and untrusted callback URL.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## ibm-acp — IBM/BeeAI Agent Communication Protocol

**Implementation task:** IBM/BeeAI Agent Communication Protocol

**Worked fixture:** Build a protocol adapter mapping external message/task schema to internal typed message.

**Expected result:** Mock incoming task, success and failure message variants.

**Verification tests:** Known messages map; unknown version/type returns controlled error.

**Debugging checklist:** Why isolate protocol schemas behind an adapter?

**Interview checks:** Test version mismatch and unknown message type.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## client-acp — Agent Client Protocol

**Implementation task:** Agent Client Protocol

**Worked fixture:** Mock an editor client session with streaming updates and approval request.

**Expected result:** Session sends update, asks permission, then completes.

**Verification tests:** Client displays update; tool action waits for approval.

**Debugging checklist:** How does editor-agent session protocol differ from MCP?

**Interview checks:** Test cancellation, resume and denied permission.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## tooling — Tool integration engineering

**Implementation task:** Tool integration engineering

**Worked fixture:** Wrap an external API with timeout, retries, idempotency and redacted logs.

**Expected result:** Mock 429 then 200; same idempotency key on retry.

**Verification tests:** Backoff occurs and side effect is not duplicated.

**Debugging checklist:** Which failures are safe to retry?

**Interview checks:** Test 5xx, malformed response, expired token and secret redaction.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
