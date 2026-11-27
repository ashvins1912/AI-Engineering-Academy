export type HarnessPillar = {
  id: string
  number: string
  title: string
  role: string
  plainEnglish: string
  concreteMechanisms: string[]
  withoutIt: string
}

export type HarnessDfdStep = {
  step: number
  nodeId: string
  title: string
  layer: string
  description: string
  payload: Record<string, unknown>
}

export type HarnessCaseStudy = {
  id: string
  tag: string
  title: string
  organizationContext: string
  problem: string
  harnessArchitecture: string[]
  beforeMetrics: { label: string; value: string }[]
  afterMetrics: { label: string; value: string }[]
  keyTakeaway: string
  implementationLang: string
  implementationCode: string
}

export const harnessEvolutionRows = [
  {
    era: 'Prompt Engineering (2023)',
    focus: 'Crafting instructions inside a single prompt string',
    strength: 'Fast iteration for one-shot formatting & summarization',
    ceiling: 'Fails on multi-step tasks; no feedback loop, state, or safety enforcement'
  },
  {
    era: 'Context Engineering (2024–2025)',
    focus: 'Curating what enters the token window (RAG, memory, tools, compaction)',
    strength: 'Grounds answers in fresh domain data and keeps tokens focused',
    ceiling: 'Still trusts the LLM to self-verify, self-terminate, and behave safely'
  },
  {
    era: 'Harness Engineering (2025–2026)',
    focus: 'Engineering the deterministic runtime, sandbox, hooks, verifiers, budgets & evals around the LLM',
    strength: 'Turns probabilistic LLMs into reliable, auditable, long-horizon production engineers (+15%–35% accuracy on frozen weights)',
    ceiling: 'Requires software systems discipline: sandboxing, tracing, and deterministic graders'
  }
]

export const harnessPillars: HarnessPillar[] = [
  {
    id: 'context-state',
    number: '01',
    title: 'Context & Filesystem State Manager',
    role: 'Prevents Context Rot & Token Overload',
    plainEnglish:
      'Instead of stuffing an entire codebase or chat history into the prompt, the harness exposes progressive disclosure (repo maps, targeted search tools), offloads large tool outputs to files, and compacts stale turns before attention degrades.',
    concreteMechanisms: [
      'Progressive disclosure (index first, read slices on demand)',
      'Auto-compaction / rolling summary at 65%–75% context budget',
      'Externalized scratchpad / plan.md persisted across restarts'
    ],
    withoutIt: 'Tool outputs flood the context window by turn 6; the LLM forgets the original objective and hallucinates paths.'
  },
  {
    id: 'sandbox-tools',
    number: '02',
    title: 'Isolated Sandbox & Typed Tool Runtime',
    role: 'Contains Blast Radius & Enforces Contracts',
    plainEnglish:
      'Every tool call executes inside an ephemeral container/microVM with strict JSON schema validation, explicit timeouts, allowlisted domains, and least-privilege credentials—never directly on the host machine.',
    concreteMechanisms: [
      'Ephemeral Docker / Firecracker sandbox per session',
      'Strict JSON Schema + path traversal & command denylist',
      'Per-tool wall-clock timeouts & output truncation caps'
    ],
    withoutIt: 'A single hallucinated shell command or prompt injection deletes production files, leaks env secrets, or hangs forever.'
  },
  {
    id: 'deterministic-backpressure',
    number: '03',
    title: 'Deterministic Verification & Backpressure',
    role: 'Replaces LLM Guessing with Objective Ground Truth',
    plainEnglish:
      'Never ask an LLM "are you sure this works?" The harness automatically runs deterministic verifiers—compilers, typecheckers, linters, unit tests, SQL dry-runs—and feeds exact error traces back into the loop until checks pass.',
    concreteMechanisms: [
      'Post-edit auto-lint, typecheck (tsc/mypy), and targeted unit tests',
      'Structured diff & schema verification before commit',
      'Objective stop condition: task completes ONLY when verifier exits 0'
    ],
    withoutIt: 'The agent confidently declares "Done!" while shipping broken syntax, failing tests, or invalid JSON.'
  },
  {
    id: 'hooks-budgets',
    number: '04',
    title: 'Lifecycle Hooks, Doom-Loop & Budget Guards',
    role: 'Guarantees Bounded Cost & Human Governance',
    plainEnglish:
      'Intercepts every step via PreToolUse / PostToolUse middleware hooks. Automatically halts runaway retry loops (same failing call 3×), enforces hard token/dollar/turn caps, and pauses for human approval on irreversible actions.',
    concreteMechanisms: [
      'PreToolUse policy gate (approve/deny/modify before execution)',
      'Doom-loop signature detector (breaks circular failing edits)',
      'Hard ceilings: max_turns, max_usd, and HITL approval gates'
    ],
    withoutIt: 'An agent stuck on a missing dependency burns $45 across 90 identical retry turns overnight.'
  },
  {
    id: 'eval-replay',
    number: '05',
    title: 'Trajectory Telemetry & Eval Replay Harness',
    role: 'Measures pass@1, pass^k & Prevents Regressions',
    plainEnglish:
      'Records every prompt, tool call, verifier exit code, latency, and token cost as a replayable trace. Benchmarks harness changes on golden task suites using both pass@1 (capability) and pass^k (consistency across k independent runs).',
    concreteMechanisms: [
      'OpenTelemetry span trace per turn + tool invocation',
      'Deterministic fixture replay for CI regression gating',
      'pass^k consistency tracking & cost-per-solved-task FinOps'
    ],
    withoutIt: 'Teams blindly tweak prompts and have no idea whether an edit improved reliability or silently broke 30% of edge cases.'
  }
]

export const harnessDfdMermaid = `flowchart LR
  TASK["1. User Task + Repo/Context Pack"] --> CTX["2. Context & Compaction Manager"]
  CTX --> LLM["3. Frontier LLM Reasoner"]
  LLM -->|Proposed Tool Call| HOOK{"4. Pre-Tool Policy, Budget & Doom-Loop Hook"}
  HOOK -->|Blocked / Escalate| HITL["Human Approval / Safe Abort"]
  HOOK -->|Allowed| SBX["5. Isolated Sandbox Execution"]
  SBX --> VER{"6. Deterministic Verifier (Tests/Lint/Schema)"}
  VER -->|Fail: Exact Error Trace| CTX
  VER -->|Pass: Exit 0| EVAL["7. Trace Logger & Eval Grader -> Final Output"]`

export const harnessDfdNodeLabels: Record<string, string> = {
  TASK: 'Task Intake',
  CTX: 'Context Compactor',
  LLM: 'LLM Reasoner',
  HOOK: 'Policy & Budget Hook',
  HITL: 'HITL / Safe Abort',
  SBX: 'Isolated Sandbox',
  VER: 'Deterministic Verifier',
  EVAL: 'Trace & Final Output'
}

export const harnessDfdSteps: HarnessDfdStep[] = [
  {
    step: 1,
    nodeId: 'TASK',
    title: 'Task Intake & Scoped Context Pack',
    layer: 'Intake Layer',
    description:
      'Instead of dumping 500 files, the harness injects a compact repository map, explicit success criteria, and available tool contracts.',
    payload: {
      task_id: 'fix-auth-401',
      repo_map_tokens: 1450,
      budget_usd: 0.75,
      max_turns: 12,
      allowed_tools: ['read_slice', 'apply_patch', 'run_tests']
    }
  },
  {
    step: 2,
    nodeId: 'CTX',
    title: 'Context Manager & Compaction Check',
    layer: 'State & Memory Layer',
    description:
      'Checks token occupancy (currently 42% < 70% compaction trigger). Large previous test logs are stored as file handles rather than raw prompt bloat.',
    payload: {
      turn: 3,
      context_used_pct: 42,
      compaction_triggered: false,
      pinned_plan: '1. Reproduce bug  2. Patch token parser  3. Pass pytest'
    }
  },
  {
    step: 3,
    nodeId: 'LLM',
    title: 'LLM Emits Structured Tool Call',
    layer: 'Probabilistic Engine',
    description:
      'The LLM inspects the failing stack trace and proposes a strictly typed JSON patch against auth/jwt_validator.py.',
    payload: {
      model: 'frontier-coder',
      tool_call: 'apply_patch',
      args: { path: 'auth/jwt_validator.py', lines: '44-52', change: 'enforce exp clock skew <= 30s' }
    }
  },
  {
    step: 4,
    nodeId: 'HOOK',
    title: 'Pre-Tool Policy, Budget & Doom-Loop Hook',
    layer: 'Deterministic Governance Layer',
    description:
      'Middleware verifies path is inside repo root (no ../.env), spend ($0.14) < budget ($0.75), and call signature has not failed 3× consecutively.',
    payload: {
      policy_check: 'ALLOW',
      path_sandbox_ok: true,
      doom_loop_streak: 0,
      cumulative_cost_usd: 0.14
    }
  },
  {
    step: 5,
    nodeId: 'SBX',
    title: 'Ephemeral Sandbox Execution',
    layer: 'Isolation Layer',
    description:
      'Applies patch inside an isolated container with no outbound internet access and runs a targeted 15s-timeout test command.',
    payload: {
      container_id: 'sbx-9f2a1',
      network: 'disabled',
      command: 'pytest tests/test_jwt.py -q',
      runtime_ms: 1420
    }
  },
  {
    step: 6,
    nodeId: 'VER',
    title: 'Deterministic Verifier Backpressure',
    layer: 'Verification Layer',
    description:
      'Objective exit-code check: if exit != 0, stderr feeds straight back to Step 2 so the LLM self-corrects. Exit 0 unlocks final delivery.',
    payload: {
      exit_code: 0,
      tests_passed: 18,
      tests_failed: 0,
      lint_errors: 0,
      verdict: 'VERIFIED_COMPLETE'
    }
  },
  {
    step: 7,
    nodeId: 'EVAL',
    title: 'Trace Persistence & Eval Telemetry',
    layer: 'Observability & FinOps Layer',
    description:
      'Commits structured OpenTelemetry trace, diff artifact, total cost ($0.19), and updates CI pass@1 / pass^3 benchmark metrics.',
    payload: {
      trace_id: 'tr_88412c',
      turns_used: 4,
      total_cost_usd: 0.19,
      status: 'SOLVED_AND_VERIFIED'
    }
  }
]

export const harnessCaseStudies: HarnessCaseStudy[] = [
  {
    id: 'cs-coding-agent',
    tag: 'Case Study 01 · Autonomous Software Engineering',
    title: 'How Harness Engineering Lifts SWE-Bench Solve Rates +30% on Frozen Model Weights',
    organizationContext: 'Coding Agents (Claude Code, Codex, Devin-class systems) resolving real GitHub issues across 200k-line repositories.',
    problem:
      'Wrapping a frontier LLM in a naive `while not done: llm -> bash` loop failed 58% of real bugs: the model dumped huge files into context, edited wrong line numbers, ignored test failures, and got stuck repeating the same broken patch 15 times.',
    harnessArchitecture: [
      'Replaced raw `cat` with AST symbol search + bounded line-range reader (cuts context bloat by 72%).',
      'Added deterministic edit-time verification hook: every `apply_patch` automatically triggers syntax + linter feedback before the model even chooses its next step.',
      'Enforced context compaction whenever prompt tokens hit 70% of window (summarizing old exploration turns while preserving active diff + failing test trace).',
      'Added a Doom-Loop Detector: if the same file/error signature repeats 3×, the harness injects a forced strategy-reset hint ("Stop patching blindly; inspect caller assumptions").'
    ],
    beforeMetrics: [
      { label: 'SWE-bench pass@1', value: '42.0%' },
      { label: '3-Run Consistency (pass^3)', value: '14.5%' },
      { label: 'Avg Cost / Solved Bug', value: '$4.80' },
      { label: 'Runaway Loop Incidents', value: '23%' }
    ],
    afterMetrics: [
      { label: 'SWE-bench pass@1', value: '74.5%' },
      { label: '3-Run Consistency (pass^3)', value: '56.2%' },
      { label: 'Avg Cost / Solved Bug', value: '$1.35' },
      { label: 'Runaway Loop Incidents', value: '< 1%' }
    ],
    keyTakeaway:
      'Zero model weights were changed. Simply giving the LLM cleaner tools, automatic verifier backpressure, context compaction, and loop guards produced a +32.5 point accuracy jump and cut cost per solved issue by 72%.',
    implementationLang: 'TypeScript (Production Agent Harness Loop)',
    implementationCode: `// Production Coding-Agent Harness Skeleton (Deterministic Wrapper Around LLM)
interface ToolResult { ok: boolean; output: string; verifierExitCode?: number }

export async function runAgentHarness(task: string, config: { maxTurns: number; maxUsd: number }) {
  const trace: Array<{ turn: number; tool: string; status: string }> = [];
  const failureCounts = new Map<string, number>();
  let spentUsd = 0;
  let messages = [{ role: "user", content: buildScopedContextPack(task) }];

  for (let turn = 1; turn <= config.maxTurns; turn++) {
    // 1. Context Compaction Guard (prevent context rot before 70% window)
    if (estimateTokens(messages) > 90_000) {
      messages = await compactStaleHistory(messages);
    }

    // 2. Budget Circuit Breaker
    if (spentUsd >= config.maxUsd) {
      return { status: "ABORTED_BUDGET_CAP", trace, spentUsd };
    }

    const step = await callLLM(messages);
    spentUsd += step.costUsd;

    if (step.type === "final_answer") {
      // 3. Deterministic Completion Gate — never trust LLM self-certification!
      const verify = await runSandboxCommand("npm run typecheck && npm test");
      if (verify.exitCode === 0) return { status: "SOLVED_VERIFIED", answer: step.text, trace, spentUsd };
      messages.push({ role: "user", content: \`Verifier failed (exit \${verify.exitCode}):\\n\${verify.stderr}\` });
      continue;
    }

    // 4. Pre-Tool Policy & Doom-Loop Hook
    const policy = evaluatePreToolPolicy(step.toolName, step.args);
    if (!policy.allow) {
      messages.push({ role: "tool", content: \`BLOCKED BY POLICY: \${policy.reason}\` });
      continue;
    }

    const sig = \`\${step.toolName}:\${JSON.stringify(step.args)}\`;
    const res: ToolResult = await executeInEphemeralSandbox(step.toolName, step.args, { timeoutMs: 15_000 });
    trace.push({ turn, tool: step.toolName, status: res.ok ? "ok" : "err" });

    if (!res.ok) {
      const streak = (failureCounts.get(sig) ?? 0) + 1;
      failureCounts.set(sig, streak);
      if (streak >= 3) {
        messages.push({ role: "user", content: "HARNESS INTERVENTION: Repeated failing call detected. Re-read source and try a different strategy." });
        continue;
      }
    }
    messages.push({ role: "tool", content: truncateOutput(res.output, 4000) });
  }
  return { status: "ABORTED_MAX_TURNS", trace, spentUsd };
}`
  },
  {
    id: 'cs-finops-remediation',
    tag: 'Case Study 02 · Regulated Enterprise FinOps Agent',
    title: 'Zero-Incident Financial Reconciliation & Refund Harness',
    organizationContext: 'Fintech operations agent investigating failed payouts, querying Postgres/Stripe, and issuing corrective credits.',
    problem:
      'In early pilots, an unharnessed agent retried a timed-out refund webhook twice (double-paying customers), ran an unfiltered SQL query across 80M rows, and got fooled by an indirect prompt injection hidden inside a support ticket note.',
    harnessArchitecture: [
      'Split tools into Read-Only tier (auto-approved, read-replica only, 5s SQL statement_timeout) vs. Mutating tier (requires dry-run preview + idempotency key).',
      'Pre-Tool Policy Hook automatically enforces a Human-in-the-Loop (HITL) approval gate for any refund > $250 or bulk mutation > 1 record.',
      'Wrapped every external ledger write with an Idempotency Key derived from `hash(ticket_id + action_type)` so retries never double-charge.',
      'Untrusted ticket text is delimited and stripped of tool-override privileges; policy decisions run in deterministic code outside the LLM.'
    ],
    beforeMetrics: [
      { label: 'Duplicate Payout Bugs', value: '4.2%' },
      { label: 'Policy Violations', value: '6 / month' },
      { label: 'Mean Resolution Time', value: '42 min (manual)' },
      { label: 'Audit Trace Coverage', value: '18%' }
    ],
    afterMetrics: [
      { label: 'Duplicate Payout Bugs', value: '0.0%' },
      { label: 'Policy Violations', value: '0 / month' },
      { label: 'Mean Resolution Time', value: '3.5 min' },
      { label: 'Audit Trace Coverage', value: '100%' }
    ],
    keyTakeaway:
      'Security and financial correctness must live in the deterministic harness (Pre-Tool policy code, idempotency keys, SQL timeouts, HITL gates)—never as a polite sentence inside the system prompt.',
    implementationLang: 'Python (Pre-Tool Policy & Idempotent Ledger Hook)',
    implementationCode: `# Deterministic FinOps Harness Policy Hook (Runs Outside the LLM)
import hashlib

def pre_tool_policy_hook(tool_name: str, args: dict, session: dict) -> dict:
    # 1. Enforce read-only SQL safety & row limits
    if tool_name == "query_warehouse":
        sql = args.get("sql", "").strip().upper()
        if not sql.startswith("SELECT") or any(k in sql for k in ("DROP", "DELETE", "UPDATE", "ALTER")):
            return {"decision": "DENY", "reason": "Only read-only SELECT queries permitted"}
        if "LIMIT" not in sql:
            args["sql"] = f"{args['sql'].rstrip(';')} LIMIT 200"
        return {"decision": "ALLOW", "args": args}

    # 2. Financial Mutation Guard: Idempotency + HITL Threshold
    if tool_name == "issue_refund":
        amount = float(args.get("amount_usd", 0))
        idem_key = hashlib.sha256(f"{session['ticket_id']}:refund:{args['order_id']}".encode()).hexdigest()[:20]
        args["idempotency_key"] = idem_key
        if amount > 250.0:
            return {"decision": "REQUIRE_HUMAN_APPROVAL", "reason": f"Refund \${amount:.2f} exceeds \$250 auto-limit", "args": args}
        return {"decision": "ALLOW", "args": args}

    return {"decision": "DENY", "reason": f"Unknown tool: {tool_name}"}`
  },
  {
    id: 'cs-eval-harness',
    tag: 'Case Study 03 · Continuous Evaluation & Regression Harness',
    title: 'Pass^k CI/CD Evaluation Harness Preventing Silent Agent Regressions',
    organizationContext: 'AI platform team shipping weekly tool updates, prompt revisions, and model migrations across 120 golden production tasks.',
    problem:
      'The team only measured single-run `pass@1` on 10 hand-picked examples. After switching models to save 40% cost, `pass@1` looked fine (82%), but `pass^3` (succeeding 3 times in a row on the same enterprise workflow) crashed to 55%—causing customer trust erosion.',
    harnessArchitecture: [
      'Deterministic Mock/Replay Fixture Layer intercepts external HTTP/DB calls so all 120 tasks replay reproducibly offline in CI.',
      'Runs each task k=3 independent trials to compute both `pass@1` (peak capability) and `pass^3` (production reliability consistency).',
      'Scores 3 independent axes: Final Outcome Grader (deterministic state diff), Trajectory Efficiency (turns & tool accuracy), and FinOps Cost Ceiling.',
      'Fail-closed GitHub Actions release gate blocks any PR if `pass^3` drops > 2% or p95 cost/task rises > 15%.'
    ],
    beforeMetrics: [
      { label: 'Hidden Prod Regressions', value: '5 / quarter' },
      { label: 'pass^3 Visibility', value: 'None' },
      { label: 'Eval Reproducibility', value: 'Flaky (live APIs)' },
      { label: 'PR Eval Runtime', value: '45 min' }
    ],
    afterMetrics: [
      { label: 'Hidden Prod Regressions', value: '0 / quarter' },
      { label: 'pass^3 CI Gate', value: '>= 80% enforced' },
      { label: 'Eval Reproducibility', value: '99.4% deterministic' },
      { label: 'PR Eval Runtime', value: '4.5 min (parallel)' }
    ],
    keyTakeaway:
      'In production agents, `pass^k` (consistency across repeated runs) matters far more than `pass@k` (best of k tries). An eval harness with mocked fixtures turns flaky agent tuning into disciplined software CI.',
    implementationLang: 'Python (CI Pass^k Harness Grader)',
    implementationCode: `# Continuous Eval Harness: Compute pass@1 vs. pass^k Reliability Gate
def evaluate_harness_release(task_results: dict[str, list[bool]], k: int = 3, min_pass_pow_k: float = 0.78):
    # task_results = {"task_01": [True, True, True], "task_02": [True, False, True], ...}
    n_tasks = len(task_results)
    pass_at_1 = sum(sum(trials) / len(trials) for trials in task_results.values()) / n_tasks
    pass_pow_k = sum(1 for trials in task_results.values() if len(trials) >= k and all(trials[:k])) / n_tasks

    gate_passed = pass_pow_k >= min_pass_pow_k
    return {
        "tasks_evaluated": n_tasks,
        "pass_at_1": round(pass_at_1, 4),
        "pass_pow_k": round(pass_pow_k, 4),
        "release_gate": "PASS" if gate_passed else "FAIL_CLOSED"
    }`
  }
]

export const harnessPlaygroundExecutableCode = `// Live Architect Sandbox — Complete Deterministic Agent Harness Runtime
// Try modifying flags below (e.g., set ENABLE_POLICY_HOOK = false or ENABLE_VERIFIER = false) and click Run!
const ENABLE_POLICY_HOOK = true;      // Blocks destructive/unapproved commands
const ENABLE_VERIFIER = true;         // Runs deterministic tests before allowing "Done"
const ENABLE_DOOM_LOOP_GUARD = true;  // Interrupts repeated identical failing calls
const MAX_BUDGET_USD = 0.60;
const CONTEXT_COMPACT_AT_TOKENS = 8000;

// Simulated trajectory of proposed LLM actions on a production bug-fix task
const proposedModelTurns = [
  { turn: 1, action: "read_slice", args: { file: "auth.ts", lines: "1-45" }, tokens: 1800, cost: 0.04 },
  { turn: 2, action: "shell", args: { cmd: "rm -rf /var/prod_logs" }, tokens: 2600, cost: 0.05 }, // Prompt-injection trap!
  { turn: 3, action: "apply_patch", args: { file: "auth.ts", patch: "v1_buggy" }, tokens: 3400, cost: 0.07, testPass: false },
  { turn: 4, action: "apply_patch", args: { file: "auth.ts", patch: "v1_buggy" }, tokens: 4900, cost: 0.07, testPass: false }, // Duplicate retry!
  { turn: 5, action: "apply_patch", args: { file: "auth.ts", patch: "v2_fixed" }, tokens: 9200, cost: 0.08, testPass: true },  // Triggers compaction
  { turn: 6, action: "final_answer", args: { summary: "Fixed JWT clock skew bug" }, tokens: 3100, cost: 0.04 }
];

let spentUsd = 0;
let contextTokens = 0;
let compactions = 0;
let blockedUnsafeCalls = 0;
let doomLoopsCaught = 0;
let lastTestPassed = false;
let verifiedComplete = false;
const failSignatures = new Map();

for (const step of proposedModelTurns) {
  if (spentUsd + step.cost > MAX_BUDGET_USD) {
    console.warn("[Budget Guard] Hard spend cap hit at turn " + step.turn);
    break;
  }
  spentUsd += step.cost;
  contextTokens += step.tokens;

  // 1. Context Compaction Manager
  if (contextTokens >= CONTEXT_COMPACT_AT_TOKENS) {
    contextTokens = Math.round(contextTokens * 0.35);
    compactions++;
    console.log("[Context Manager] Turn " + step.turn + ": Compacted context to " + contextTokens + " tokens to prevent context rot");
  }

  // 2. Pre-Tool Policy Gate
  if (step.action === "shell" && /rm\\s+-rf|DROP\\s+TABLE/i.test(step.args.cmd || "")) {
    if (ENABLE_POLICY_HOOK) {
      blockedUnsafeCalls++;
      console.warn("[Pre-Tool Hook] BLOCKED dangerous command at turn " + step.turn + ": " + step.args.cmd);
      continue;
    } else {
      console.error("[SECURITY BREACH] Unharnessed agent executed: " + step.args.cmd);
    }
  }

  // 3. Doom-Loop Detector
  const sig = step.action + ":" + JSON.stringify(step.args);
  if (step.action === "apply_patch") {
    const prevFails = failSignatures.get(sig) || 0;
    if (ENABLE_DOOM_LOOP_GUARD && prevFails >= 1) {
      doomLoopsCaught++;
      console.warn("[Doom-Loop Guard] Turn " + step.turn + ": Blocked duplicate failing patch; injected strategy reset!");
      continue;
    }
    // 4. Deterministic Verifier Backpressure
    if (ENABLE_VERIFIER) {
      lastTestPassed = Boolean(step.testPass);
      if (!lastTestPassed) {
        failSignatures.set(sig, prevFails + 1);
        console.log("[Verifier] Turn " + step.turn + ": pytest EXIT 1 -> fed exact stack trace back to LLM");
      } else {
        console.log("[Verifier] Turn " + step.turn + ": pytest EXIT 0 -> All 18 tests passed!");
      }
    } else {
      console.warn("[No Verifier] Turn " + step.turn + ": Blindly trusted LLM patch without running tests");
    }
  }

  // 5. Final Answer Gate
  if (step.action === "final_answer") {
    verifiedComplete = ENABLE_VERIFIER ? lastTestPassed : false;
    console.log("[Completion Gate] Verified =", verifiedComplete, "| Total Spend = $" + spentUsd.toFixed(2));
  }
}

assert(blockedUnsafeCalls === 1, "Pre-Tool Policy Hook blocked destructive shell injection");
assert(doomLoopsCaught >= 1, "Doom-Loop Guard caught duplicate failing patch attempt");
assert(verifiedComplete, "Deterministic Verifier proved exit_code=0 before final completion");
assert(spentUsd <= MAX_BUDGET_USD, "Execution stayed within $" + MAX_BUDGET_USD.toFixed(2) + " FinOps budget");

emitMetric("Policy Blocks", String(blockedUnsafeCalls), "Unsafe cmds stopped", blockedUnsafeCalls === 1 ? "optimal" : "breaking");
emitMetric("Doom Loops Stopped", String(doomLoopsCaught), "Wasted turns cut", doomLoopsCaught >= 1 ? "optimal" : "tradeoff");
emitMetric("Verifier Gate", verifiedComplete ? "EXIT 0" : "UNVERIFIED", "Objective tests", verifiedComplete ? "optimal" : "breaking");
emitMetric("Total Run Cost", "$" + spentUsd.toFixed(2), compactions + " compactions", spentUsd <= MAX_BUDGET_USD ? "optimal" : "breaking");

emitArtifact("Harness Execution Trace", {
  verified_complete: verifiedComplete,
  blocked_unsafe_calls: blockedUnsafeCalls,
  doom_loops_caught: doomLoopsCaught,
  compactions_triggered: compactions,
  final_context_tokens: contextTokens,
  total_cost_usd: Number(spentUsd.toFixed(2))
});`
