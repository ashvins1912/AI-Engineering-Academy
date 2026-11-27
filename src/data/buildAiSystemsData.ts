export type AiSystemModuleId =
  | 'build-chatgpt'
  | 'build-claude'
  | 'build-copilot'
  | 'transformer-deep-dive'
  | 'unified-model-rag-mcp-acp'

export type SimpleConceptCard = {
  id: string
  title: string
  simpleEnglish: string
  analogy: string
  dataFlowInOut: string
  whyItMatters: string
}

export type AnimatedDfdStep = {
  step: number
  nodeId: string
  title: string
  simpleExplanation: string
  latencyMs: number
  payload: Record<string, unknown>
}

export type CompleteCodeFile = {
  id: string
  filename: string
  language: string
  role: string
  code: string
}

export type AiSystemModule = {
  id: AiSystemModuleId
  number: number
  badge: string
  title: string
  subtitle: string
  simpleSummary: string
  analogy: string
  concepts: SimpleConceptCard[]
  mermaidDfd: string
  dfdNodeLabels: Record<string, string>
  dfdSteps: AnimatedDfdStep[]
  codeFiles: CompleteCodeFile[]
  sandboxTitle: string
  sandboxTask: string
  executableJs: string
}

export const aiSystemModules: AiSystemModule[] = [
  // =========================================================================
  // 01. HOW TO BUILD CHATGPT (COMPLETE ARCHITECTURE + FULL CODE)
  // =========================================================================
  {
    id: 'build-chatgpt',
    number: 1,
    badge: 'Conversational AI System',
    title: 'How to Build ChatGPT (End-to-End Architecture & Complete Code)',
    subtitle: 'Conversation memory, RLHF-aligned LLM backbone, tool calling, safety moderation, and real-time SSE token streaming.',
    simpleSummary:
      'ChatGPT is NOT just a raw neural network file. It is a 6-layer software system wrapped around a Transformer LLM: a streaming web UI, an API gateway with rate limits and moderation, a session memory manager that summarizes old turns, a tool/RAG router (Web Search, Python Code Interpreter, File RAG), a vLLM/TensorRT inference cluster, and Server-Sent Events (SSE) streaming words back one token at a time.',
    analogy:
      'Think of a world-class restaurant: the Transformer LLM is the head chef, Memory is the waiter’s order pad remembering your allergies, Tools/RAG are the pantry and recipe books, Guardrails are food safety inspection, and SSE streaming is serving each course hot the second it is ready instead of waiting an hour.',
    concepts: [
      {
        id: 'gpt-1',
        title: '1. Pretraining -> SFT -> RLHF (Why it talks like an assistant)',
        simpleEnglish:
          'First, the model reads trillions of web/book/code tokens to learn language (Pretraining). Second, humans show it thousands of clean Question -> Answer chats (SFT). Third, human raters rank better answers over worse ones using PPO/DPO (RLHF) so it becomes helpful, honest, and safe.',
        analogy: 'Reading the whole library (Pretraining), studying good customer-service scripts (SFT), then getting daily coaching feedback (RLHF).',
        dataFlowInOut: 'Raw Internet Text -> Base Autocomplete Model -> Aligned Chat Assistant',
        whyItMatters: 'Without SFT + RLHF, asking "Explain gravity" makes a base model keep generating more random questions instead of answering you.'
      },
      {
        id: 'gpt-2',
        title: '2. Session Memory & Context Window Compaction',
        simpleEnglish:
          'LLMs are stateless—they forget everything after every HTTP request! ChatGPT creates the illusion of memory by storing every chat turn in a database (Postgres/Redis) and re-sending `[System Prompt + Rolling Summary + Recent Messages]` on every new turn.',
        analogy: 'Handing a brilliant doctor a 1-page summary of your medical history plus your last 6 messages before every appointment.',
        dataFlowInOut: 'session_id + new_message -> DB Fetch + Token Budget Trim -> Full Messages Array',
        whyItMatters: 'Sending infinite uncompacted chat history breaks the context window, slows TTFT, and makes costs explode quadratically.'
      },
      {
        id: 'gpt-3',
        title: '3. Function Calling & Sandboxed Tools',
        simpleEnglish:
          'Instead of guessing live weather, stock prices, or math, the LLM outputs a structured JSON tool request like `{"tool": "run_python", "args": {"code": "..."}}`. Your backend pauses generation, executes the tool in an isolated container, appends the result, and lets the LLM finish answering.',
        analogy: 'A smart advisor who uses a real calculator and checks live databases instead of doing 9-digit multiplication in their head.',
        dataFlowInOut: 'LLM JSON Tool Request -> Sandboxed Executor -> Tool Result Message -> Final Answer',
        whyItMatters: 'Eliminates math hallucinations and connects static model weights to live real-world actions.'
      },
      {
        id: 'gpt-4',
        title: '4. Real-Time SSE Token Streaming',
        simpleEnglish:
          'Generating 400 words takes ~5–8 seconds. Rather than making the user stare at a blank spinner, the server opens a Server-Sent Events (`text/event-stream`) HTTP stream and pushes every generated token chunk to the browser in <300ms Time-To-First-Token (TTFT).',
        analogy: 'Watching a live captioner type words as they speak instead of waiting for the entire speech to end to receive a transcript.',
        dataFlowInOut: 'vLLM Async Token Iterator -> FastAPI StreamingResponse -> Browser EventSource',
        whyItMatters: 'Cuts perceived latency by 10× and lets users hit "Stop Generating" immediately to save compute.'
      }
    ],
    mermaidDfd: `flowchart LR
  UI["1. Chat UI (SSE Client)"] --> GW["2. API Gateway + Moderation"]
  GW --> MEM["3. Session Memory + Compaction"]
  MEM --> TOOL["4. Tool & RAG Router"]
  TOOL --> LLM["5. Transformer / vLLM Engine"]
  LLM --> STREAM["6. Output Guard + SSE Stream"]
  STREAM --> UI`,
    dfdNodeLabels: {
      UI: 'Chat UI',
      GW: 'Gateway + Safety',
      MEM: 'Memory Store',
      TOOL: 'Tools & RAG',
      LLM: 'vLLM Engine',
      STREAM: 'SSE Stream'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'UI',
        title: 'User Sends Prompt Over HTTPS',
        simpleExplanation: 'Browser sends `{session_id, message}` with user auth token and opens a streaming reader.',
        latencyMs: 12,
        payload: { session_id: 'chat_904', prompt: 'Calculate 15% compound growth on $5,000 for 8 years', stream: true }
      },
      {
        step: 2,
        nodeId: 'GW',
        title: 'Auth, Rate Limit & Input Moderation',
        simpleExplanation: 'API Gateway validates JWT identity, checks token quota, and runs fast safety/PII classification.',
        latencyMs: 18,
        payload: { user_tier: 'pro', rate_limit_ok: true, input_moderation: 'SAFE', pii_redacted: false }
      },
      {
        step: 3,
        nodeId: 'MEM',
        title: 'Load History & Compact Context Window',
        simpleExplanation: 'Backend fetches prior turns from Postgres/Redis, keeping System Prompt + summary + last 8 turns under budget.',
        latencyMs: 24,
        payload: { history_turns: 14, compacted_to_summary: 6, recent_verbatim: 8, prompt_tokens: 940 }
      },
      {
        step: 4,
        nodeId: 'TOOL',
        title: 'Tool / Code-Interpreter Execution',
        simpleExplanation: 'Model emits a typed JSON tool call for exact arithmetic; sandbox container runs Python safely and returns `$15,295.11`.',
        latencyMs: 145,
        payload: { tool: 'python_sandbox', expr: '5000 * (1.15 ** 8)', result: 15295.11, verified: true }
      },
      {
        step: 5,
        nodeId: 'LLM',
        title: 'Transformer Prefill + Autoregressive Decode',
        simpleExplanation: 'vLLM processes prompt in parallel (Prefill), caches KV tensors, and decodes output tokens with PagedAttention.',
        latencyMs: 210,
        payload: { ttft_ms: 210, kv_cache_hit: true, decode_tok_per_sec: 78 }
      },
      {
        step: 6,
        nodeId: 'STREAM',
        title: 'Output Guardrail + SSE Stream + Save Turn',
        simpleExplanation: 'Each token chunk streams over `text/event-stream`; full turn persists to database once `[DONE]` fires.',
        latencyMs: 35,
        payload: { format: 'text/event-stream', saved_to_db: true, output_guard: 'PASS', total_tokens: 162 }
      }
    ],
    codeFiles: [
      {
        id: 'chatgpt-backend',
        filename: 'chatgpt_server.py',
        language: 'python',
        role: 'Complete FastAPI ChatGPT Clone (Memory Compaction + Tool Calling + Real SSE Streaming)',
        code: `import json, math
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="Production ChatGPT-Style Architecture")

# In production: back this with PostgreSQL + Redis
SESSION_DB: dict[str, list[dict]] = {}
MAX_RECENT_TURNS = 8

class ChatRequest(BaseModel):
    session_id: str
    message: str

def moderate_input(text: str) -> bool:
    blocked = ["ignore all previous instructions", "dump system prompt"]
    return not any(b in text.lower() for b in blocked)

def execute_safe_tool(tool_name: str, args: dict) -> str:
    if tool_name == "compound_interest":
        p, r, y = float(args["principal"]), float(args["rate"]), float(args["years"])
        return json.dumps({"final_amount": round(p * ((1 + r) ** y), 2)})
    raise ValueError(f"Unknown tool: {tool_name}")

def build_bounded_context(session_id: str, new_msg: str) -> list[dict]:
    history = SESSION_DB.setdefault(session_id, [])
    system = {"role": "system", "content": "You are a helpful, accurate AI assistant. Use tools for exact math."}
    if len(history) > MAX_RECENT_TURNS:
        older = history[:-MAX_RECENT_TURNS]
        summary = {"role": "system", "content": f"Summary of {len(older)} earlier messages: user discussing finance & AI."}
        return [system, summary, *history[-MAX_RECENT_TURNS:], {"role": "user", "content": new_msg}]
    return [system, *history, {"role": "user", "content": new_msg}]

@app.post("/v1/chat/completions")
async def chat_stream(req: ChatRequest):
    if not moderate_input(req.message):
        raise HTTPException(status_code=400, detail="Input blocked by safety guardrail")

    messages = build_bounded_context(req.session_id, req.message)

    async def event_generator():
        # Step 1: Tool routing decision (in prod: call OpenAI/vLLM client with tools=[...])
        tool_obs = None
        if "compound" in req.message.lower():
            tool_obs = execute_safe_tool("compound_interest", {"principal": 5000, "rate": 0.15, "years": 8})
            yield f"data: {json.dumps({'type': 'tool_result', 'data': tool_obs})}\\n\\n"

        # Step 2: Stream tokens from LLM / vLLM server
        answer = f"Verified calculation result: {tool_obs}." if tool_obs else f"Processed {len(messages)} context messages cleanly."
        for token in answer.split(" "):
            yield f"data: {json.dumps({'type': 'delta', 'content': token + ' '})}\\n\\n"

        # Step 3: Persist completed turn durably
        SESSION_DB[req.session_id].append({"role": "user", "content": req.message})
        SESSION_DB[req.session_id].append({"role": "assistant", "content": answer})
        yield "data: [DONE]\\n\\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")`
      },
      {
        id: 'chatgpt-client',
        filename: 'ChatClient.ts',
        language: 'typescript',
        role: 'Browser SSE Streaming Client (Handles Token Deltas & Stop Button)',
        code: `export async function streamChat(
  sessionId: string,
  message: string,
  onToken: (chunk: string) => void,
  signal?: AbortSignal
) {
  const res = await fetch('/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
    signal // lets user click "Stop Generating" cleanly
  })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\\n')
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
      const evt = JSON.parse(line.slice(6))
      if (evt.type === 'delta') onToken(evt.content)
    }
  }
}`
      }
    ],
    sandboxTitle: 'Live ChatGPT Request Lifecycle Sandbox (Memory + Tool Call + SSE Stream)',
    sandboxTask: 'Run a complete simulated ChatGPT backend cycle: guard input, compact 12 chat turns into a bounded window, execute a typed tool call, and emit SSE frames.',
    executableJs: `// Module 01 — Complete ChatGPT Request Pipeline Simulation
const history = Array.from({ length: 12 }, (_, i) => ({
  role: i % 2 === 0 ? "user" : "assistant",
  content: "Turn #" + (i + 1) + " message payload"
}));
const newPrompt = "Compute 15% compound growth on $5000 over 8 years";
const maxRecent = 6;

// 1. Input Safety Guardrail
const isSafe = !/ignore previous instructions|dump system/i.test(newPrompt);

// 2. Rolling Memory Compaction
const compactedCount = Math.max(0, history.length - maxRecent);
const contextMessages = [
  { role: "system", content: "Helpful AI assistant + typed tools" },
  { role: "system", content: "[Compacted summary of " + compactedCount + " earlier turns]" },
  ...history.slice(-maxRecent),
  { role: "user", content: newPrompt }
];

// 3. Sandboxed Tool Dispatch
const toolResult = Number((5000 * Math.pow(1.15, 8)).toFixed(2));

// 4. SSE Token Stream Framing
const answer = "At 15% annual compounding over 8 years, $5,000 grows to $" + toolResult.toLocaleString() + ".";
const sseFrames = answer.split(" ").map((tok, i) => ({ seq: i + 1, event: "delta", token: tok + " " }));

console.log("[1. Guardrail] Safe =", isSafe);
console.log("[2. Memory] Total history =", history.length, "-> Kept recent =", maxRecent, "| Compacted =", compactedCount);
console.log("[3. Tool Sandbox] compound_interest -> $" + toolResult);
console.log("[4. SSE Stream] Emitted", sseFrames.length, "live token frames + [DONE]");

assert(isSafe === true, "Input moderation passed cleanly");
assert(contextMessages.length === maxRecent + 3, "Context window bounded via rolling summary compaction");
assert(toolResult === 15295.11, "Tool execution returned exact verified dollar figure ($15,295.11)");
emitMetric("Context Messages", String(contextMessages.length), "Bounded window", "optimal");
emitMetric("SSE Frames", String(sseFrames.length), "Real-time stream", "optimal");
emitArtifact("ChatGPT Pipeline Trace", { isSafe, compactedCount, toolResult, first3Frames: sseFrames.slice(0, 3) });`
  },

  // =========================================================================
  // 02. HOW TO BUILD CLAUDE (CONSTITUTIONAL AI + CACHING + EXTENDED THINKING + MCP)
  // =========================================================================
  {
    id: 'build-claude',
    number: 2,
    badge: 'Constitutional & Long-Context AI',
    title: 'How to Build Claude (Constitutional AI, Prompt Caching, Thinking & MCP)',
    subtitle: 'RLAIF Constitutional alignment, 90%-cheaper KV Prefix Caching, Extended Thinking scratchpads, Artifacts, and MCP tool servers.',
    simpleSummary:
      'A Claude-class system combines four signature architectural pillars: (1) Constitutional AI (RLAIF) where a written set of principles critiques and revises answers automatically, (2) KV Prefix Prompt Caching that freezes giant system instructions/codebases in GPU memory so repeat calls cost up to 90% less, (3) Extended Thinking that allocates a hidden reasoning token budget before answering hard problems, and (4) MCP (Model Context Protocol) as a universal plug-and-play socket for enterprise tools and Artifacts.',
    analogy:
      'Think of a senior principal architect who keeps your entire project blueprint open on their desk (Prompt Cache), thinks quietly on scratch paper before speaking (Extended Thinking), checks every decision against a written engineering ethics handbook (Constitutional AI), and plugs into your Git/Jira/DB using one universal USB-C cable (MCP).',
    concepts: [
      {
        id: 'claude-1',
        title: '1. Constitutional AI (SL-CAI + RLAIF)',
        simpleEnglish:
          'Instead of relying purely on thousands of human labelers to flag every unsafe response, Claude is trained with an explicit written "Constitution" of principles. During training, the model critiques its own draft against those principles, rewrites a better version, and trains a preference model from those AI-evaluated pairs.',
        analogy: 'Giving a judge a clear written rulebook to self-audit every draft ruling instead of guessing what 1,000 random people might prefer.',
        dataFlowInOut: 'Draft Answer -> Principle Critique -> Revised Answer -> RLAIF Preference Alignment',
        whyItMatters: 'Makes safety behavior transparent, auditable, and scalable without brittle keyword blocklists.'
      },
      {
        id: 'claude-2',
        title: '2. KV Prefix Prompt Caching (Up to 90% Cost & 80% TTFT Cut)',
        simpleEnglish:
          'Normally, sending a 40,000-token codebase + system rules forces the GPU to recompute all 40k tokens of Attention math on EVERY turn. Prompt Caching hashes the static prefix and keeps its GPU Key-Value (KV) tensors warm in memory, so turn 2 only computes the tiny new user question!',
        analogy: 'Reading a 200-page contract once and keeping sticky-note highlights ready instead of re-reading all 200 pages from page 1 for every follow-up question.',
        dataFlowInOut: 'Stable Prefix (System + Docs + Tools) -> SHA256 KV Cache Lookup -> Instant Prefill Skip',
        whyItMatters: 'Critical rule: always put static instructions and documents FIRST and dynamic timestamps/user queries LAST—putting a timestamp at line 1 breaks the cache!'
      },
      {
        id: 'claude-3',
        title: '3. Extended Thinking (Test-Time Compute Budget)',
        simpleEnglish:
          'For simple questions, the model answers directly. For tough debugging, math, or architecture trade-offs, you grant a `thinking_budget` (e.g., 2,048–8,192 tokens) so the model explores hypotheses, checks edge cases, and backtracks inside a dedicated `<thinking>` block before writing the crisp final answer.',
        analogy: 'Letting an engineer draw diagrams on a whiteboard for 3 minutes before giving a concise 2-sentence final recommendation.',
        dataFlowInOut: 'Hard Query + Budget -> Internal Reasoning Scratchpad -> Verified Concise Final Output',
        whyItMatters: 'Trades controllable latency/tokens for massive accuracy gains on coding, proofs, and multi-step planning.'
      },
      {
        id: 'claude-4',
        title: '4. Artifacts & Native MCP Tool Ecosystem',
        simpleEnglish:
          'Claude separates conversational prose from standalone deliverable code/diagrams ("Artifacts") rendered in a live side canvas, and talks to external databases, browsers, or GitHub repos through standardized MCP (Model Context Protocol) servers.',
        analogy: 'Handing you a finished blueprint in a separate frame while chatting in the margins, and plugging into any tool with one universal adapter.',
        dataFlowInOut: 'Structured XML/JSON Blocks -> Artifact Preview Renderer + MCP JSON-RPC Client',
        whyItMatters: 'Eliminates custom glue code for every single SaaS integration and makes generated software immediately runnable.'
      }
    ],
    mermaidDfd: `flowchart LR
  PRE["1. Static Prefix (System + Repo + Tools)"] --> CACHE["2. KV Prefix Cache (90% Hit)"]
  Q["Dynamic User Turn"] --> THINK["3. Extended Thinking Budget"]
  CACHE --> THINK
  THINK --> MCP["4. MCP Tool Server (JSON-RPC)"]
  MCP --> CONST["5. Constitutional Critic Check"]
  CONST --> ART["6. Streamed Text + Artifact Canvas"]`,
    dfdNodeLabels: {
      PRE: 'Static Prefix',
      CACHE: 'KV Prefix Cache',
      Q: 'User Turn',
      THINK: 'Thinking Budget',
      MCP: 'MCP Tools',
      CONST: 'Constitutional Check',
      ART: 'Artifact Output'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'CACHE',
        title: 'KV Prefix Cache Lookup',
        simpleExplanation: 'Hash the immutable prefix (system prompt + 32k repo docs + MCP tool schemas) and hit warm GPU KV blocks.',
        latencyMs: 35,
        payload: { cached_prefix_tokens: 32000, cache_hit: true, prefill_cost_discount: '90%' }
      },
      {
        step: 2,
        nodeId: 'THINK',
        title: 'Extended Thinking Scratchpad',
        simpleExplanation: 'Allocate 2,048 reasoning tokens to trace bugs, compare 2 fixes, and reject a race condition before replying.',
        latencyMs: 680,
        payload: { budget_tokens: 2048, used_thinking_tokens: 912, self_corrections: 2 }
      },
      {
        step: 3,
        nodeId: 'MCP',
        title: 'MCP Standardized Tool Invocation',
        simpleExplanation: 'Invoke `mcp://repo-server/tools/run_tests` over JSON-RPC to verify the proposed patch passes tests.',
        latencyMs: 240,
        payload: { protocol: 'MCP/2025', method: 'tools/call', tool: 'run_tests', tests_passed: 18 }
      },
      {
        step: 4,
        nodeId: 'CONST',
        title: 'Constitutional Alignment Verification',
        simpleExplanation: 'Verify zero secret leakage, honest uncertainty reporting, and safe action boundaries.',
        latencyMs: 22,
        payload: { constitution_checks: ['no_secrets', 'grounded_facts', 'safe_diff'], status: 'PASS' }
      },
      {
        step: 5,
        nodeId: 'ART',
        title: 'Split Stream: Concise Explanation + Artifact',
        simpleExplanation: 'Stream plain-English summary to chat while mounting the clean patch in the Artifact panel.',
        latencyMs: 40,
        payload: { artifact_type: 'code/typescript', lines: 48, verified_tests: true }
      }
    ],
    codeFiles: [
      {
        id: 'claude-engine',
        filename: 'claude_architect_engine.py',
        language: 'python',
        role: 'Complete Claude-Pattern Engine (Prefix Caching + Extended Thinking + Constitutional Critic + MCP)',
        code: `import hashlib, time
from dataclasses import dataclass

@dataclass
class CachedPrefix:
    prefix_hash: str
    token_count: int
    created_at: float

# Simulated GPU KV Prefix Cache Table
KV_PREFIX_CACHE: dict[str, CachedPrefix] = {}

CONSTITUTION = [
    "Never expose secrets, API keys, or private PII.",
    "Cite verified tool output rather than inventing metrics.",
    "Explain trade-offs clearly in plain English."
]

def get_or_cache_prefix(static_system_and_docs: str) -> tuple[bool, int]:
    """Rule: Put ALL static instructions/docs first; dynamic user query last."""
    h = hashlib.sha256(static_system_and_docs.encode()).hexdigest()[:16]
    tokens = len(static_system_and_docs.split())
    if h in KV_PREFIX_CACHE:
        return True, tokens   # Cache HIT: skip 90% prefill cost & latency!
    KV_PREFIX_CACHE[h] = CachedPrefix(h, tokens, time.time())
    return False, tokens      # Cache MISS: populate GPU KV cache

def constitutional_audit(draft: str) -> dict:
    violations = []
    if "sk-" in draft or "AKIA" in draft:
        violations.append("Secret leakage detected")
    if "definitely 100% guaranteed" in draft.lower():
        violations.append("Overconfident uncalibrated claim")
    return {"passed": len(violations) == 0, "violations": violations}

def run_claude_turn(static_prefix: str, user_query: str, thinking_budget: int = 2048) -> dict:
    cache_hit, cached_tokens = get_or_cache_prefix(static_prefix)
    # Extended thinking scratchpad
    thought_steps = [
        f"Analyze query: '{user_query}' against cached architecture docs.",
        "Check edge cases, security boundaries, and rollback safety.",
        "Prepare clean Artifact output separated from concise explanation."
    ]
    draft_answer = f"Verified architectural fix ready (prefix cache hit={cache_hit})."
    audit = constitutional_audit(draft_answer)
    return {
        "cache_hit": cache_hit,
        "cached_tokens": cached_tokens,
        "thinking_budget": thinking_budget,
        "thinking_trace": thought_steps,
        "constitutional_audit": audit,
        "final_response": draft_answer if audit["passed"] else "Revised to satisfy safety constitution."
    }`
      }
    ],
    sandboxTitle: 'Live Claude KV Prefix Cache + Constitutional Critic Sandbox',
    sandboxTask: 'Test how putting a dynamic timestamp at the top breaks KV Prompt Caching (0% savings) vs. keeping the static prefix first (90% cost savings!).',
    executableJs: `// Module 02 — KV Prefix Prompt Caching + Constitutional AI Audit Sandbox
const cache = new Map();
function hashPrefix(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

const staticRepoDocs = "SYSTEM: Principal Architect Rules. REPO_DOCS: 30,000 tokens of API schemas...";
function runTurn(prefix, query) {
  const key = hashPrefix(prefix);
  const hit = cache.has(key);
  if (!hit) cache.set(key, { tokens: 30000 });
  const prefillCost = hit ? 0.009 : 0.090; // 90% cheaper on cache hit!
  const ttftMs = hit ? 185 : 1420;
  return { hit, prefillCost, ttftMs, queryLen: query.length };
}

// Good ordering: static prefix stays byte-identical across turns
const turn1 = runTurn(staticRepoDocs, "Audit auth middleware");
const turn2 = runTurn(staticRepoDocs, "Now generate unit tests");

// Anti-pattern: putting live timestamp inside the prefix busts the cache every time!
const bustedTurn = runTurn("TIME=" + Date.now() + " " + staticRepoDocs, "Check latency");

// Constitutional audit
const draft = "Use parameterized SQL queries and short-lived OIDC tokens.";
const safe = !/sk-live|password123|ignore safety/i.test(draft);

console.log("[Turn 1 Cold] Hit:", turn1.hit, "| Cost: $" + turn1.prefillCost, "| TTFT:", turn1.ttftMs + "ms");
console.log("[Turn 2 Warm] Hit:", turn2.hit, "| Cost: $" + turn2.prefillCost, "| TTFT:", turn2.ttftMs + "ms");
console.log("[Anti-Pattern Timestamp Prefix] Hit:", bustedTurn.hit, "| Cost: $" + bustedTurn.prefillCost);
console.log("[Constitutional Audit] Passed:", safe);

assert(turn1.hit === false && turn2.hit === true, "Turn 2 hit the warm KV prefix cache cleanly");
assert(bustedTurn.hit === false, "Dynamic timestamp in prefix broke cache (classic production bug!)");
assert(safe === true, "Draft passed Constitutional AI safety check");
emitMetric("Warm TTFT", turn2.ttftMs + " ms", "vs " + turn1.ttftMs + "ms cold", "optimal");
emitMetric("Prefill Savings", "90%", "$0.090 -> $0.009", "optimal");
emitArtifact("Prompt Cache Benchmark", { turn1, turn2, bustedTurn, constitutionalSafe: safe });`
  },

  // =========================================================================
  // 03. HOW TO BUILD GITHUB COPILOT (IDE FIM + AST GRAPH + SPECULATIVE DECODE)
  // =========================================================================
  {
    id: 'build-copilot',
    number: 3,
    badge: 'Real-Time Coding AI',
    title: 'How to Build GitHub Copilot (FIM, AST Repo Context & <200ms Speculative Decode)',
    subtitle: 'Fill-in-the-Middle (FIM) tokens, Tree-Sitter AST open-tab context ranking, debounce cancellation, and Agentic diff edits.',
    simpleSummary:
      'Unlike a chatbot that answers at the bottom of a conversation, Copilot must complete code *in the middle of a live file* in under 200 milliseconds while you are typing! It achieves this via 4 specialized systems: (1) IDE Debounce + Request Cancellation so stale keystrokes never waste GPUs, (2) Fill-in-the-Middle (FIM) prompt formatting that shows both code *above* and *below* your cursor, (3) Neighboring-Tab & AST Context Ranking (Jaccard/BM25 similarity across open files and imports), and (4) Speculative Decoding (a tiny draft model guesses 5 tokens and the main model verifies all 5 in 1 GPU pass).',
    analogy:
      'Think of a co-pilot who glances at the page above your pen, the page below your pen, and the 3 reference tabs open on your desk, then whispers the exact next line in a fifth of a second—and immediately stops whispering if you type something different.',
    concepts: [
      {
        id: 'cop-1',
        title: '1. Fill-in-the-Middle (FIM) Prompt Formatting',
        simpleEnglish:
          'Standard LLMs only read left-to-right. Coding models are trained with special sentinel tokens `<|fim_prefix|>`, `<|fim_suffix|>`, and `<|fim_middle|>` so the model sees BOTH the code before your cursor AND the closing braces/return statement below your cursor.',
        analogy: 'Completing a crossword word when you can see the letters both to the left AND to the right of the blank space.',
        dataFlowInOut: '(codeBeforeCursor, codeAfterCursor) -> <|fim_prefix|>...<|fim_suffix|>...<|fim_middle|>',
        whyItMatters: 'Without suffix awareness, autocomplete repeats closing braces, ignores return types below, and breaks syntax.'
      },
      {
        id: 'cop-2',
        title: '2. Neighbor-Tab & Tree-Sitter AST Context Ranking',
        simpleEnglish:
          'You cannot stuff a 500,000-line repository into a 150ms completion request! The IDE extension parses imports with Tree-Sitter AST and scores snippets from recently viewed open tabs using fast Jaccard token overlap, injecting only the top ~1,500 tokens of relevant type definitions.',
        analogy: 'Before finishing a function, quickly grabbing the exact interface file you just edited 30 seconds ago.',
        dataFlowInOut: 'Open Tabs + AST Imports -> Jaccard Overlap Scorer -> Top-3 Context Snippets (<1500 tok)',
        whyItMatters: 'Prevents hallucinated function names and keeps completions aligned with your project’s real types.'
      },
      {
        id: 'cop-3',
        title: '3. Debounce, AbortController & Speculative Decoding',
        simpleEnglish:
          'As you type at 80 WPM, the IDE waits ~75ms (debounce) and cancels any previous in-flight HTTP request via `AbortController`. On the GPU server, Speculative Decoding uses a tiny fast draft model (or N-gram match from the same file) to propose 4–6 tokens verified in parallel by the main model—cutting latency 2.5× with mathematically identical output.',
        analogy: 'A fast apprentice sketching 5 bricks ahead while the master mason approves all 5 in a single glance.',
        dataFlowInOut: 'Keystroke -> 75ms Debounce + Abort Old -> Speculative Draft/Verify -> <180ms Ghost Text',
        whyItMatters: 'If inline completions take >400ms, developers have already typed past them and turn the extension off.'
      },
      {
        id: 'cop-4',
        title: '4. Copilot Chat & Agent Mode (Repo Index + Unified Diffs)',
        simpleEnglish:
          'Beyond ghost-text autocomplete, Copilot Agent Mode switches to a stronger frontier model equipped with repo semantic search (RAG), terminal test runner (MCP), and strict search-and-replace diff patching with human accept/reject review.',
        analogy: 'Fast inline autocomplete is spell-check on steroids; Agent Mode is a pair programmer opening a PR and running `npm test`.',
        dataFlowInOut: 'Task Prompt -> Repo RAG + Terminal MCP -> Verified Multi-File Diff Patch',
        whyItMatters: 'Separating the <180ms FIM completion tier from the deep multi-file Agent tier optimizes both UX speed and cloud GPU cost.'
      }
    ],
    mermaidDfd: `flowchart LR
  KEY["1. IDE Keystroke (75ms Debounce + Abort)"] --> AST["2. AST Imports + Open-Tab Jaccard Ranker"]
  AST --> FIM["3. FIM Prompt (<fim_prefix> + <fim_suffix>)"]
  FIM --> SPEC["4. Speculative Decode (Draft + Verify GPU)"]
  SPEC --> POST["5. Syntax & Stop-Token Post-Filter"]
  POST --> GHOST["6. Inline Ghost Text (<180ms)"]`,
    dfdNodeLabels: {
      KEY: 'IDE Debounce',
      AST: 'AST + Tab Ranker',
      FIM: 'FIM Builder',
      SPEC: 'Speculative GPU',
      POST: 'Post-Filter',
      GHOST: 'Ghost Text UI'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'KEY',
        title: 'Keystroke Debounce & Cancel Stale Call',
        simpleExplanation: 'Wait 75ms after last keystroke and abort any prior unfinished network request immediately.',
        latencyMs: 75,
        payload: { cursor_line: 42, cursor_col: 18, prior_request_aborted: true }
      },
      {
        step: 2,
        nodeId: 'AST',
        title: 'Open-Tab Jaccard + AST Symbol Selection',
        simpleExplanation: 'Score open editor tabs against current file tokens and select top 2 type-definition snippets.',
        latencyMs: 14,
        payload: { open_tabs: 6, top_tab: 'types/billing.ts', jaccard_score: 0.64, context_tokens: 920 }
      },
      {
        step: 3,
        nodeId: 'FIM',
        title: 'Assemble Fill-in-the-Middle Prompt',
        simpleExplanation: 'Pack neighbor snippets + prefix above cursor + suffix below cursor into FIM sentinel tokens.',
        latencyMs: 3,
        payload: { format: 'PSM (Prefix-Suffix-Middle)', prefix_tok: 640, suffix_tok: 180, total_tok: 1740 }
      },
      {
        step: 4,
        nodeId: 'SPEC',
        title: 'Speculative Decoding on Fast Code Model',
        simpleExplanation: 'Draft model proposes 5 tokens; target model verifies all 5 in 1 forward pass with 82% acceptance.',
        latencyMs: 68,
        payload: { draft_accept_rate: 0.82, speedup: '2.4x', generated_tokens: 24 }
      },
      {
        step: 5,
        nodeId: 'POST',
        title: 'Duplicate-Suffix Trim & Stop-Sequence Filter',
        simpleExplanation: 'Strip any repeated line that already exists in `suffix` and stop cleanly at balanced closing brace.',
        latencyMs: 4,
        payload: { overlap_trimmed: true, syntax_balanced: true, pii_clean: true }
      },
      {
        step: 6,
        nodeId: 'GHOST',
        title: 'Render Inline Ghost Text in Editor',
        simpleExplanation: 'Display gray ghost text at cursor within 164ms total; pressing Tab accepts and logs acceptance telemetry.',
        latencyMs: 2,
        payload: { total_latency_ms: 166, sla_target_ms: 200, accepted_by_dev: true }
      }
    ],
    codeFiles: [
      {
        id: 'copilot-ext',
        filename: 'copilot_extension.ts',
        language: 'typescript',
        role: 'IDE Extension Client (75ms Debounce + AbortController + Jaccard Neighbor-Tab Ranker + FIM)',
        code: `type OpenTab = { path: string; content: string }

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().match(/[a-z_][a-z0-9_]{2,}/g) ?? [])
  const setB = new Set(b.toLowerCase().match(/[a-z_][a-z0-9_]{2,}/g) ?? [])
  let inter = 0
  for (const w of setA) if (setB.has(w)) inter++
  return inter / (setA.size + setB.size - inter || 1)
}

export function buildFimPrompt(prefix: string, suffix: string, openTabs: OpenTab[]): string {
  const ranked = [...openTabs]
    .map(tab => ({ tab, score: jaccardSimilarity(prefix.slice(-1200), tab.content) }))
    .filter(x => x.score > 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  const neighborHeader = ranked
    .map(x => \`// Context from \${x.tab.path}\\n\${x.tab.content.slice(0, 600)}\`)
    .join('\\n\\n')

  // Standard PSM Fill-in-the-Middle token format (CodeLlama / Qwen2.5-Coder / StarCoder)
  return \`<|fim_prefix|>\${neighborHeader}\\n\${prefix}<|fim_suffix|>\${suffix}<|fim_middle|>\`
}

// Cancel stale in-flight completions on every new keystroke
let inflight: AbortController | null = null
export async function requestGhostCompletion(prefix: string, suffix: string, tabs: OpenTab[]) {
  inflight?.abort()
  inflight = new AbortController()
  const prompt = buildFimPrompt(prefix, suffix, tabs)
  const res = await fetch('/v1/fim/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, max_tokens: 64, stop: ['\\n\\n', '<|endoftext|>'] }),
    signal: inflight.signal
  })
  return res.json()
}`
      },
      {
        id: 'copilot-srv',
        filename: 'fim_vllm_server.py',
        language: 'python',
        role: 'FastAPI + vLLM Low-Latency FIM Completion Server with Suffix Deduplication',
        code: `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Copilot FIM Inference Gateway")

class FimRequest(BaseModel):
    prompt: str
    suffix_preview: str = ""
    max_tokens: int = 64

def trim_duplicate_suffix(completion: str, suffix_preview: str) -> str:
    first_suffix_line = suffix_preview.strip().splitlines()[0] if suffix_preview.strip() else ""
    if first_suffix_line and completion.rstrip().endswith(first_suffix_line):
        return completion.rstrip()[:-len(first_suffix_line)].rstrip()
    return completion

@app.post("/v1/fim/complete")
async def fim_complete(req: FimRequest):
    # Production: forward to vLLM with --speculative-model + prefix caching enabled
    raw_completion = "  return items.reduce((sum, item) => sum + item.price * item.qty, 0)"
    cleaned = trim_duplicate_suffix(raw_completion, req.suffix_preview)
    return {"completion": cleaned, "speculative_speedup": "2.4x", "ttft_ms": 84}`
      }
    ],
    sandboxTitle: 'Live Copilot Neighbor-Tab Jaccard Ranker & FIM Prompt Assembler Sandbox',
    sandboxTask: 'Score open IDE tabs against the active cursor buffer, assemble a real `<|fim_prefix|>` + `<|fim_suffix|>` prompt, and verify sub-200ms latency SLA.',
    executableJs: `// Module 03 — Live Copilot AST/Open-Tab Jaccard Ranker + FIM Prompt Builder
const cursorPrefix = "function calcInvoiceTotal(items: LineItem[], taxRate: number): number {\\n  const subtotal = ";
const cursorSuffix = "\\n  return Number((subtotal * (1 + taxRate)).toFixed(2));\\n}";

const openTabs = [
  { path: "types/billing.ts", content: "export interface LineItem { sku: string; price: number; qty: number; taxRate?: number }" },
  { path: "ui/Navbar.tsx", content: "export function Navbar() { return <header className='nav'>Home</header> }" },
  { path: "utils/invoice.ts", content: "import { LineItem } from '../types/billing'; export const sumLineItems = (items: LineItem[]) => items.length;" }
];

function jaccard(a, b) {
  const tok = s => new Set((s.toLowerCase().match(/[a-z_][a-z0-9_]{2,}/g) || []));
  const A = tok(a), B = tok(b);
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

const rankedTabs = openTabs
  .map(t => ({ path: t.path, score: Number(jaccard(cursorPrefix, t.content).toFixed(3)), content: t.content }))
  .sort((a, b) => b.score - a.score);

const selected = rankedTabs.filter(t => t.score >= 0.1).slice(0, 2);
const fimPrompt = "<|fim_prefix|>" + selected.map(t => "// " + t.path + "\\n" + t.content).join("\\n") + "\\n" + cursorPrefix + "<|fim_suffix|>" + cursorSuffix + "<|fim_middle|>";

// Speculative decoding latency calculation (24 tokens)
const standardDecodeMs = 75 + 14 + 24 * 8.5; // debounce + rank + naive decode
const speculativeDecodeMs = Math.round(75 + 14 + (24 * 8.5) / 2.4);

console.log("[Tab Ranking]", rankedTabs.map(t => t.path + "=" + t.score).join(" | "));
console.log("[FIM Prompt Length]", fimPrompt.length, "chars | Selected tabs:", selected.map(t => t.path).join(", "));
console.log("[Latency] Standard:", Math.round(standardDecodeMs) + "ms -> Speculative:", speculativeDecodeMs + "ms");

assert(rankedTabs[0].path !== "ui/Navbar.tsx", "Irrelevant UI tab ranked below billing/invoice context");
assert(fimPrompt.includes("<|fim_prefix|>") && fimPrompt.includes("<|fim_suffix|>"), "Valid FIM prefix/suffix sentinel structure built");
assert(speculativeDecodeMs < 200, "Speculative decoding met <200ms inline ghost-text SLA");
emitMetric("Top Context Tab", rankedTabs[0].path, "Jaccard " + rankedTabs[0].score, "optimal");
emitMetric("Inline Latency", speculativeDecodeMs + " ms", "vs " + Math.round(standardDecodeMs) + "ms naive", "optimal");
emitArtifact("Copilot FIM Assembly", { rankedTabs: rankedTabs.map(t => ({ path: t.path, score: t.score })), speculativeDecodeMs });`
  },

  // =========================================================================
  // 04. TRANSFORMER DEEP DIVE IN SIMPLE ENGLISH (COMPLETE PYTORCH FROM SCRATCH)
  // =========================================================================
  {
    id: 'transformer-deep-dive',
    number: 4,
    badge: 'Neural Core From Scratch',
    title: 'Inside Transformers in Simple English (+ Complete PyTorch Mini-GPT Code)',
    subtitle: 'Understand BPE Tokens, RoPE, Q/K/V Self-Attention, Causal Masking, SwiGLU, RMSNorm, and KV Cache without confusing jargon.',
    simpleSummary:
      'A Transformer is a giant next-token prediction machine built from repeating identical blocks. In simple English: (1) chop text into token numbers, (2) turn each number into a rich meaning vector + position angle (RoPE), (3) let every word ask questions (`Query`), advertise what it contains (`Key`), and share its meaning (`Value`) via Self-Attention while blocking future words (`Causal Mask`), (4) think deeply inside a Feed-Forward neural network (`SwiGLU`), and (5) predict probability scores for the very next word!',
    analogy:
      'Imagine 32 floors of editors reading a sentence together. On each floor, every word holds a quick Q&A huddle with all earlier words (Self-Attention) to resolve pronouns like "it" or "bank", then reflects quietly at its desk (Feed-Forward MLP) using its memorized knowledge, before passing refined notes up to the next floor.',
    concepts: [
      {
        id: 'tx-1',
        title: '1. Query (Q), Key (K), Value (V) Self-Attention in Plain English',
        simpleEnglish:
          'Every token creates three vectors: **Query** = "What am I looking for?", **Key** = "What topic do I represent?", and **Value** = "What information do I pass along if matched?". We compute `dot(Q, K) / sqrt(d_k)` to measure match strength, turn scores into percentages with `softmax`, and blend the `Value` vectors!',
        analogy: 'Searching a library: your search phrase is the Query, book spine titles are Keys, and the book pages inside are Values.',
        dataFlowInOut: 'Hidden State X [B, T, d] -> Q, K, V Projections -> Attention Weights [B, H, T, T] -> Context Output',
        whyItMatters: 'Dividing by `sqrt(d_k)` stops big dot products from making softmax saturate into dead zero gradients.'
      },
      {
        id: 'tx-2',
        title: '2. Causal Masking & RoPE Positional Encoding',
        simpleEnglish:
          'Because all tokens are processed in parallel during training, we stamp `-infinity` onto the upper triangle of the attention grid (`Causal Mask`) so word #3 can NEVER peek at word #4! And since attention has no built-in sense of order, **RoPE** rotates Q and K vectors by an angle proportional to position so the model knows exact relative distance.',
        analogy: 'Covering the right side of the page with a ruler so you cannot cheat and read tomorrow’s words, while numbering every word on a spinning clock face (RoPE).',
        dataFlowInOut: 'Raw Scores + Upper-Triangular -inf Mask + RoPE Angles -> Strict Left-to-Right Contextual Attention',
        whyItMatters: 'RoPE lets modern LLMs generalize to 128k–1M token contexts far better than old fixed sine/cosine embeddings.'
      },
      {
        id: 'tx-3',
        title: '3. Grouped-Query Attention (GQA) & KV Cache (Prefill vs Decode)',
        simpleEnglish:
          'When generating word #501, words #1–500 never change—so we save their `K` and `V` vectors in GPU VRAM (**KV Cache**). **GQA** lets 4–8 Query heads share 1 Key/Value head, shrinking KV Cache VRAM by 4×–8× so you can serve 8× more concurrent users on the same GPU!',
        analogy: 'Instead of re-reading pages 1 to 500 before writing word 501, you keep a shared summary binder on the desk for the whole team.',
        dataFlowInOut: 'Prefill (Parallel Prompt -> Fill KV Cache) -> Decode (1 New Token/Step Reading Cached K, V)',
        whyItMatters: 'Without KV Cache, generating 1,000 tokens does O(T³) work instead of O(T²) and becomes 50× slower.'
      },
      {
        id: 'tx-4',
        title: '4. Residual Highway, Pre-RMSNorm, SwiGLU & Sampling',
        simpleEnglish:
          'Every block adds its update back onto the original highway (`x = x + Attention(RMSNorm(x))`) so gradients flow cleanly through 80+ layers. After the final layer, a linear head scores all 100k vocabulary words; **Temperature** controls creativity and **Top-P (Nucleus)** cuts off bizarre low-probability words.',
        analogy: 'A clean main interstate (Residual Stream) where each exit ramp refines the cargo without ever destroying the original road.',
        dataFlowInOut: 'Final Hidden Vector -> Vocab Logits [V] -> Temperature/Top-P Softmax -> Next Token ID',
        whyItMatters: 'Lower temperature (0.0–0.2) is best for code/JSON/math; higher (0.7–0.9) helps creative writing.'
      }
    ],
    mermaidDfd: `flowchart LR
  TOK["1. BPE Token IDs [B, T]"] --> EMB["2. Token Embed + RoPE [B, T, d]"]
  EMB --> ATTN["3. Causal GQA Attention + KV Cache"]
  ATTN --> NORM["4. Residual Add + Pre-RMSNorm"]
  NORM --> FFN["5. SwiGLU Feed-Forward MLP"]
  FFN --> LOGIT["6. LM Head + Temp/Top-P Sample"]`,
    dfdNodeLabels: {
      TOK: 'BPE Tokenizer',
      EMB: 'Embed + RoPE',
      ATTN: 'GQA + KV Cache',
      NORM: 'Residual + Norm',
      FFN: 'SwiGLU MLP',
      LOGIT: 'Softmax Sample'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'TOK',
        title: 'Text -> Subword Token IDs',
        simpleExplanation: 'BPE tokenizer splits `"AI transforms data"` into integer IDs `[15836, 36912, 828]`.',
        latencyMs: 1,
        payload: { input_text: 'AI transforms data', token_ids: [15836, 36912, 828], shape: '[1, 3]' }
      },
      {
        step: 2,
        nodeId: 'EMB',
        title: 'Embedding Lookup + RoPE Rotation',
        simpleExplanation: 'Look up dense meaning vectors for each ID and apply rotary position angles to Q and K.',
        latencyMs: 2,
        payload: { tensor_shape: '[1, 3, 4096]', positional: 'RoPE theta=500000', dtype: 'bf16' }
      },
      {
        step: 3,
        nodeId: 'ATTN',
        title: 'Causal GQA Attention + KV Append',
        simpleExplanation: 'Compute `softmax((Q K^T)/sqrt(d) + causal_mask) V` and append new K/V slice into GPU KV Cache.',
        latencyMs: 8,
        payload: { q_heads: 32, kv_heads: 8, kv_compression: '4x', future_masked: true }
      },
      {
        step: 4,
        nodeId: 'FFN',
        title: 'SwiGLU Knowledge Expansion',
        simpleExplanation: 'Expand vector 4096 -> 14336 via gated SiLU activation (`SiLU(W1 x) * W3 x`) to retrieve memorized facts.',
        latencyMs: 6,
        payload: { hidden_dim: 4096, ffn_dim: 14336, activation: 'SwiGLU' }
      },
      {
        step: 5,
        nodeId: 'LOGIT',
        title: 'Vocab Logits -> Temperature/Top-P Sampling',
        simpleExplanation: 'Project final vector onto 128,000 vocabulary scores and sample the next token.',
        latencyMs: 2,
        payload: { top_candidates: { into: 0.62, pipelines: 0.21, fast: 0.09 }, temp: 0.2, chosen: 'into' }
      }
    ],
    codeFiles: [
      {
        id: 'mini-gpt-pytorch',
        filename: 'mini_transformer_gpt.py',
        language: 'python',
        role: 'Complete Modern Transformer LLM in PyTorch (RMSNorm + Causal Self-Attention + KV Cache + SwiGLU + Generate)',
        code: `import math, torch
import torch.nn as nn
import torch.nn.functional as F

class RMSNorm(nn.Module):
    def __init__(self, dim: int, eps: float = 1e-6):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(dim))
        self.eps = eps
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + self.eps) * self.weight

class CausalSelfAttention(nn.Module):
    def __init__(self, dim: int, n_heads: int):
        super().__init__()
        self.n_heads, self.head_dim = n_heads, dim // n_heads
        self.qkv = nn.Linear(dim, 3 * dim, bias=False)
        self.out = nn.Linear(dim, dim, bias=False)

    def forward(self, x: torch.Tensor, kv_cache=None):
        B, T, C = x.shape
        q, k, v = self.qkv(x).chunk(3, dim=-1)
        q = q.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        k = k.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)

        if kv_cache is not None:
            k = torch.cat([kv_cache[0], k], dim=2)
            v = torch.cat([kv_cache[1], v], dim=2)
        new_cache = (k, v)

        # FlashAttention / SDPA with automatic causal mask during prefill
        y = F.scaled_dot_product_attention(q, k, v, is_causal=(kv_cache is None))
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        return self.out(y), new_cache

class SwiGLUFFN(nn.Module):
    def __init__(self, dim: int, hidden_dim: int):
        super().__init__()
        self.w1 = nn.Linear(dim, hidden_dim, bias=False)
        self.w2 = nn.Linear(hidden_dim, dim, bias=False)
        self.w3 = nn.Linear(dim, hidden_dim, bias=False)
    def forward(self, x):
        return self.w2(F.silu(self.w1(x)) * self.w3(x))

class TransformerBlock(nn.Module):
    def __init__(self, dim: int, n_heads: int):
        super().__init__()
        self.norm1, self.attn = RMSNorm(dim), CausalSelfAttention(dim, n_heads)
        self.norm2, self.ffn = RMSNorm(dim), SwiGLUFFN(dim, int(dim * 2.67))
    def forward(self, x, kv_cache=None):
        h, new_cache = self.attn(self.norm1(x), kv_cache)
        x = x + h
        x = x + self.ffn(self.norm2(x))
        return x, new_cache

class MiniGPT(nn.Module):
    def __init__(self, vocab_size=32000, dim=256, n_layers=4, n_heads=8):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, dim)
        self.blocks = nn.ModuleList([TransformerBlock(dim, n_heads) for _ in range(n_layers)])
        self.norm = RMSNorm(dim)
        self.lm_head = nn.Linear(dim, vocab_size, bias=False)

    def forward(self, idx, caches=None):
        x = self.embed(idx)
        next_caches = []
        for i, block in enumerate(self.blocks):
            x, c = block(x, None if caches is None else caches[i])
            next_caches.append(c)
        return self.lm_head(self.norm(x)), next_caches

    @torch.inference_mode()
    def generate(self, idx, max_new_tokens=20, temp=0.7):
        logits, caches = self(idx)
        for _ in range(max_new_tokens):
            probs = F.softmax(logits[:, -1, :] / max(temp, 1e-5), dim=-1)
            next_tok = torch.multinomial(probs, num_samples=1)
            idx = torch.cat([idx, next_tok], dim=1)
            logits, caches = self(next_tok, caches)  # Fast O(1) KV-cached decode!
        return idx`
      }
    ],
    sandboxTitle: 'Live Causal Self-Attention + Temperature Sampling + KV Cache Speedup Sandbox',
    sandboxTask: 'Execute a real masked causal self-attention forward pass in JavaScript, verify future tokens get 0.00% attention weight, and compare KV-cached vs naive decode FLOPs.',
    executableJs: `// Module 04 — Live Causal Self-Attention Matrix + KV Cache Speedup Audit
const tokens = ["The", "cat", "sat", "on"];
const Q = [[1.0, 0.2], [0.9, 0.8], [0.4, 1.0], [0.8, 0.6]];
const K = [[1.0, 0.1], [0.8, 0.9], [0.3, 0.9], [0.9, 0.5]];
const dk = 2;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const softmax = arr => {
  const finiteMax = Math.max(...arr.filter(Number.isFinite));
  const ex = arr.map(v => (Number.isFinite(v) ? Math.exp(v - finiteMax) : 0));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map(v => Number((v / sum).toFixed(4)));
};

// Build 4x4 Causal Attention Matrix (upper triangle masked to -Infinity!)
const causalMatrix = Q.map((q, i) => {
  const row = K.map((k, j) => (j > i ? -Infinity : dot(q, k) / Math.sqrt(dk)));
  return softmax(row);
});

// KV Cache Decode Work Comparison for generating 256 tokens after a 512-token prompt
let naiveOps = 0, cachedOps = 0;
for (let step = 0; step < 256; step++) {
  const seq = 512 + step;
  naiveOps += seq * seq;   // recomputing all past tokens every step
  cachedOps += seq;        // only 1 new query attends to cached K,V
}
const kvSpeedup = Math.round(naiveOps / cachedOps);

console.log("[Causal Row 1 ('cat' cannot see 'sat'/'on')]", JSON.stringify(causalMatrix[1]));
console.log("[Causal Row 3 ('on' sees all 4 tokens)]", JSON.stringify(causalMatrix[3]));
console.log("[KV Cache Speedup]", kvSpeedup + "x fewer attention ops during 256-token decode");

assert(causalMatrix[1][2] === 0 && causalMatrix[1][3] === 0, "Causal mask strictly zeroed out all future tokens");
assert(Math.abs(causalMatrix[3].reduce((a, b) => a + b, 0) - 1) < 1e-3, "Attention row probabilities sum to 1.0");
assert(kvSpeedup > 400, "KV Cache cut decode attention work by >400x");
emitMetric("Future Token Leak", "0.00%", "Causal mask verified", "optimal");
emitMetric("KV Cache Speedup", kvSpeedup + "x", "512 prompt + 256 gen", "optimal");
emitArtifact("4x4 Causal Attention Grid", Object.fromEntries(tokens.map((t, i) => [t, causalMatrix[i]])));`
  },

  // =========================================================================
  // 05. HOW DATA FLOWS IN AI: MODEL + RAG + MCP + ACP + MEMORY + GUARDRAILS
  // =========================================================================
  {
    id: 'unified-model-rag-mcp-acp',
    number: 5,
    badge: 'Unified AI Systems Architecture',
    title: 'How Data Flows in AI: Model + RAG + MCP + ACP Working Together',
    subtitle: 'Understand in plain English how LLMs, Vector RAG, Model Context Protocol (MCP), and Agent Communication Protocol (ACP/A2A) connect into one production stack.',
    simpleSummary:
      'Modern AI systems are teams of specialized components, not a lone model. Here is the simplest way to remember all 4 pillars: the **Model (LLM)** is the Reasoning Brain; **RAG** is the Open-Book Library giving it fresh private facts; **MCP (Model Context Protocol)** is the USB-C plug connecting the brain to databases, APIs, and code tools; and **ACP / A2A (Agent Communication Protocol)** is the Team Radio letting multiple specialized agents (e.g., Research Agent -> Billing Agent -> Compliance Agent) hand off structured tasks securely!',
    analogy:
      'Picture an emergency hospital team: the Lead Doctor is the **LLM Model**, the Patient Chart Archive is **RAG**, the standardized medical instruments plugged into the wall are **MCP Tools**, and the encrypted radio call handing a scan over to the Cardiology Specialist is **ACP / A2A**.',
    concepts: [
      {
        id: 'uni-1',
        title: '1. Foundation Model / vLLM (The Brain)',
        simpleEnglish:
          'Reads context, plans steps, writes prose/code, and chooses tools. It knows broad world knowledge frozen at its training cutoff—it does NOT know your private company database or live inventory until you feed it via RAG or MCP.',
        analogy: 'A brilliant consultant who knows textbook theory cold, but has never logged into your company laptop.',
        dataFlowInOut: 'Prompt + Evidence + Tool Schemas -> Reasoning Plan / Structured JSON / Final Answer',
        whyItMatters: 'Never fine-tune a model just to memorize daily-changing docs—use RAG for facts and MCP for live actions.'
      },
      {
        id: 'uni-2',
        title: '2. RAG — Retrieval-Augmented Generation (The Open-Book Library)',
        simpleEnglish:
          'Turns your PDFs, wikis, and tickets into searchable chunks stored in a Hybrid Index (BM25 keywords + Vector Embeddings). At query time, it enforces user permissions (ACL), fetches Top-20 candidates, reranks to the Top-4 cleanest chunks, and injects them with `[citation]` IDs.',
        analogy: 'An instant research assistant who hands the consultant the exact 4 highlighted paragraphs from today’s policy manual.',
        dataFlowInOut: 'User Query + Tenant ACL -> Hybrid Search + Cross-Encoder Rerank -> Cited Context Chunks',
        whyItMatters: 'Slashes factual hallucinations and lets you update knowledge in seconds without retraining any neural weights.'
      },
      {
        id: 'uni-3',
        title: '3. MCP — Model Context Protocol (USB-C for Tools & Data)',
        simpleEnglish:
          'Before MCP, connecting 5 AI apps to 10 tools (Postgres, Slack, GitHub, Stripe) required `5 × 10 = 50` fragile custom integrations. MCP defines ONE open JSON-RPC standard exposing three primitives: **Tools** (actions the model invokes), **Resources** (read-only data URIs), and **Prompts** (reusable workflows).',
        analogy: 'USB-C for AI: build one MCP server for Postgres and ChatGPT, Claude, Copilot, or your own agent can plug into it immediately.',
        dataFlowInOut: 'LLM Tool Call -> MCP Client (`tools/call` JSON-RPC) -> Sandboxed MCP Server -> Typed Tool Result',
        whyItMatters: 'Turns N×M custom glue code into N+M modular servers with centralized auth, schema validation, and audit logs.'
      },
      {
        id: 'uni-4',
        title: '4. ACP / A2A — Agent Communication Protocol (Agent-to-Agent Bus)',
        simpleEnglish:
          'MCP connects **1 Agent -> Tools**. What when **Agent A** (Customer Triage) needs **Agent B** (Refund Compliance) and **Agent C** (Code Fixer) to collaborate across different teams or frameworks? **ACP / A2A** defines standard Agent Cards (capabilities), signed task envelopes, streaming status updates, and durable checkpoints.',
        analogy: 'MCP is a chef using kitchen appliances (tools); ACP/A2A is the front-of-house manager radioing structured order tickets to the pastry chef and sommelier.',
        dataFlowInOut: 'Primary Agent -> ACP Task Envelope (Correlation ID + Budget + Schema) -> Specialist Agent -> Verified Artifact',
        whyItMatters: 'Keeps each specialist agent small, focused, independently testable, and prevented from leaking cross-department permissions.'
      }
    ],
    mermaidDfd: `flowchart LR
  USR["1. User Request"] --> GW["2. Gateway + Auth + Guardrail"]
  GW --> ORCH["3. Orchestrator + Memory"]
  ORCH --> RAG["4. RAG (Hybrid Vector + Rerank)"]
  ORCH --> MCP["5. MCP Server (JSON-RPC Tools)"]
  ORCH --> ACP["6. ACP / A2A Specialist Agent"]
  RAG --> MODEL["7. Transformer / vLLM + Verifier"]
  MCP --> MODEL
  ACP --> MODEL
  MODEL --> USR`,
    dfdNodeLabels: {
      USR: 'User Client',
      GW: 'Gateway + Guard',
      ORCH: 'Orchestrator',
      RAG: 'Hybrid RAG',
      MCP: 'MCP Tools',
      ACP: 'ACP Agent Bus',
      MODEL: 'vLLM + Verifier'
    },
    dfdSteps: [
      {
        step: 1,
        nodeId: 'GW',
        title: 'Trust Boundary & Injection Scan',
        simpleExplanation: 'Verify user JWT identity, tenant ID, and scan prompt for jailbreaks before touching any AI resource.',
        latencyMs: 14,
        payload: { tenant: 'acme_corp', role: 'support_lead', prompt_injection: false }
      },
      {
        step: 2,
        nodeId: 'RAG',
        title: 'ACL-Filtered Hybrid RAG Retrieval',
        simpleExplanation: 'Retrieve Top-4 policy paragraphs matching `"enterprise refund window"` strictly inside `acme_corp` docs.',
        latencyMs: 62,
        payload: { bm25_hits: 15, vector_hits: 15, reranked_top_k: 4, top_citation: 'policy.pdf#p12' }
      },
      {
        step: 3,
        nodeId: 'MCP',
        title: 'MCP JSON-RPC Live Database Lookup',
        simpleExplanation: 'Orchestrator calls `mcp://billing-db/tools/get_invoice` to verify real live payment date and amount.',
        latencyMs: 88,
        payload: { jsonrpc: '2.0', method: 'tools/call', tool: 'get_invoice', result: { id: 'INV-402', amount: 490, days_ago: 9 } }
      },
      {
        step: 4,
        nodeId: 'ACP',
        title: 'ACP / A2A Specialist Agent Handoff',
        simpleExplanation: 'Dispatch signed ACP task envelope to `ComplianceAgent` (separate policy boundary) to approve the $490 refund.',
        latencyMs: 130,
        payload: { protocol: 'ACP/1.0', target_agent: 'compliance-agent', correlation_id: 'req_88a', decision: 'APPROVED_WITHIN_14D' }
      },
      {
        step: 5,
        nodeId: 'MODEL',
        title: 'Transformer Synthesis + Grounded Citation Output',
        simpleExplanation: 'vLLM synthesizes the final response grounded strictly in RAG citation + MCP invoice + ACP approval, and streams back to user.',
        latencyMs: 175,
        payload: { citations: ['policy.pdf#p12', 'INV-402'], faithfulness: 0.99, total_e2e_ms: 469 }
      }
    ],
    codeFiles: [
      {
        id: 'unified-stack-py',
        filename: 'unified_rag_mcp_acp.py',
        language: 'python',
        role: 'Complete Unified Orchestrator: Hybrid RAG + MCP JSON-RPC Server + ACP Agent Handoff + Grounded LLM',
        code: `from dataclasses import dataclass
from typing import Any

# --- 1. RAG LAYER (Open-Book Knowledge with Tenant ACL) ---
KNOWLEDGE_BASE = [
    {"id": "policy#p12", "tenant": "acme", "text": "Enterprise plans allow full refunds within 14 days of billing."},
    {"id": "policy#p19", "tenant": "beta", "text": "Confidential Beta tenant rule (MUST NEVER leak to acme)."}
]

def rag_retrieve(query: str, tenant: str) -> list[dict]:
    q_words = set(query.lower().split())
    hits = [d for d in KNOWLEDGE_BASE if d["tenant"] == tenant]
    hits.sort(key=lambda d: len(q_words & set(d["text"].lower().split())), reverse=True)
    return hits[:2]

# --- 2. MCP SERVER LAYER (Standardized JSON-RPC Tool Socket) ---
def mcp_handle_jsonrpc(req: dict[str, Any]) -> dict[str, Any]:
    if req.get("method") == "tools/list":
        return {"jsonrpc": "2.0", "id": req["id"], "result": {"tools": ["get_invoice"]}}
    if req.get("method") == "tools/call":
        name = req["params"]["name"]
        args = req["params"]["arguments"]
        if name == "get_invoice":
            return {"jsonrpc": "2.0", "id": req["id"], "result": {"invoice_id": args["invoice_id"], "amount": 490, "days_ago": 9}}
    return {"jsonrpc": "2.0", "id": req.get("id"), "error": {"code": -32601, "message": "Method not found"}}

# --- 3. ACP / A2A AGENT BUS (Structured Agent-to-Agent Handoff) ---
@dataclass
class AcpEnvelope:
    correlation_id: str
    sender_agent: str
    target_agent: str
    task: str
    payload: dict[str, Any]

def acp_compliance_agent(env: AcpEnvelope) -> dict[str, Any]:
    days = env.payload["invoice"]["days_ago"]
    approved = days <= 14
    return {
        "correlation_id": env.correlation_id,
        "agent": env.target_agent,
        "status": "APPROVED" if approved else "DENIED",
        "reason": f"Invoice is {days} days old (policy limit: 14 days)."
    }

# --- 4. END-TO-END ORCHESTRATOR (Data Flow: User -> RAG + MCP -> ACP -> Model) ---
def run_unified_ai_request(user_query: str, tenant: str, invoice_id: str) -> dict:
    # Step A: Grounding facts via RAG
    rag_docs = rag_retrieve(user_query, tenant=tenant)
    # Step B: Live operational data via MCP JSON-RPC
    mcp_res = mcp_handle_jsonrpc({
        "jsonrpc": "2.0", "id": 1, "method": "tools/call",
        "params": {"name": "get_invoice", "arguments": {"invoice_id": invoice_id}}
    })
    # Step C: Specialist decision via ACP/A2A handoff
    acp_res = acp_compliance_agent(AcpEnvelope(
        correlation_id="req_901", sender_agent="triage-agent",
        target_agent="compliance-agent", task="evaluate_refund",
        payload={"invoice": mcp_res["result"], "policy": rag_docs[0]["text"]}
    ))
    # Step D: Model final synthesis grounded in all 3 verified sources
    return {
        "grounded_answer": f"Refund for {invoice_id} ($490) is {acp_res['status']}: {acp_res['reason']}",
        "citations": [rag_docs[0]["id"], invoice_id],
        "protocols_used": ["RAG", "MCP(JSON-RPC)", "ACP(A2A)", "LLM"]
    }`
      }
    ],
    sandboxTitle: 'Live Unified Data-Flow Sandbox (RAG + MCP JSON-RPC + ACP Agent Handoff)',
    sandboxTask: 'Run one live user request through all 4 protocols—enforce tenant ACL in RAG, invoke MCP JSON-RPC tool, dispatch signed ACP envelope to Compliance Agent, and verify grounded synthesis.',
    executableJs: `// Module 05 — Live End-to-End AI Data Flow: RAG + MCP + ACP + Grounded Model
const userReq = { tenant: "acme", query: "Can I refund invoice INV-402?", invoiceId: "INV-402" };

// 1. RAG Layer with strict Tenant ACL pre-filtering
const kb = [
  { id: "policy#p12", tenant: "acme", text: "Full refund permitted within 14 days of billing." },
  { id: "secret#p99", tenant: "other_corp", text: "Private other_corp pricing table." }
];
const ragHits = kb.filter(d => d.tenant === userReq.tenant);

// 2. MCP Layer (Standard JSON-RPC 2.0 tools/call)
function mcpServer(rpc) {
  if (rpc.method === "tools/call" && rpc.params.name === "get_invoice") {
    return { jsonrpc: "2.0", id: rpc.id, result: { id: rpc.params.arguments.invoiceId, amountUsd: 490, daysAgo: 9 } };
  }
  return { jsonrpc: "2.0", id: rpc.id, error: { code: -32601, message: "Unknown MCP method" } };
}
const mcpRes = mcpServer({
  jsonrpc: "2.0", id: "mcp-1", method: "tools/call",
  params: { name: "get_invoice", arguments: { invoiceId: userReq.invoiceId } }
});

// 3. ACP / A2A Agent Handoff (Triage Agent -> Compliance Agent)
function complianceAgent(acpEnvelope) {
  const { daysAgo, amountUsd } = acpEnvelope.payload.invoice;
  const approved = daysAgo <= 14 && amountUsd <= 1000;
  return {
    correlationId: acpEnvelope.correlationId,
    from: "compliance-agent",
    decision: approved ? "APPROVED" : "ESCALATE_HUMAN",
    auditRule: "14-day window + <=$1000 auto-approval"
  };
}
const acpRes = complianceAgent({
  protocol: "ACP/1.0",
  correlationId: "corr-402",
  from: "triage-agent",
  to: "compliance-agent",
  payload: { invoice: mcpRes.result, policyRef: ragHits[0].id }
});

// 4. Model Final Synthesis
const finalAnswer = "Refund for " + mcpRes.result.id + " ($" + mcpRes.result.amountUsd + ") is " + acpRes.decision + " per [" + ragHits[0].id + "].";

console.log("[1. RAG ACL] Returned", ragHits.length, "authorized chunk(s):", ragHits.map(r => r.id).join(", "));
console.log("[2. MCP JSON-RPC]", JSON.stringify(mcpRes.result));
console.log("[3. ACP/A2A Handoff]", acpRes.from, "->", acpRes.decision, "(" + acpRes.auditRule + ")");
console.log("[4. Grounded Output]", finalAnswer);

assert(ragHits.every(d => d.tenant === "acme"), "RAG pre-filter prevented cross-tenant data leakage");
assert(mcpRes.jsonrpc === "2.0" && mcpRes.result.daysAgo === 9, "MCP JSON-RPC tool returned live invoice state");
assert(acpRes.decision === "APPROVED", "ACP specialist agent verified policy & approved refund");
emitMetric("Protocols Chained", "4 / 4", "RAG -> MCP -> ACP -> LLM", "optimal");
emitMetric("Tenant Isolation", "100%", "Zero cross-tenant leak", "optimal");
emitArtifact("Unified AI Trace", { rag: ragHits[0], mcp: mcpRes.result, acp: acpRes, finalAnswer });`
  }
]

// =========================================================================
// UNIFIED ARCHITECT VIRTUAL PLAYGROUND SIMULATOR PRESETS & ENGINE
// =========================================================================
export type ArchitectPresetId = 'chatgpt' | 'claude' | 'copilot' | 'enterprise-mesh'
export type ModelTier = 'fast-8b' | 'balanced-70b' | 'frontier-reasoner'
export type RagMode = 'off' | 'dense' | 'hybrid-rerank'

export type UnifiedSimConfig = {
  preset: ArchitectPresetId
  modelTier: ModelTier
  ragMode: RagMode
  mcpToolsCount: number
  mcpStrictSchema: boolean
  acpAgentHops: number
  enableVllmCache: boolean
  promptTokens: number
  thinkingTokens: number
}

export const ARCHITECT_PRESETS: Record<ArchitectPresetId, { label: string; desc: string; config: UnifiedSimConfig }> = {
  chatgpt: {
    label: 'ChatGPT Assistant',
    desc: 'Conversational memory + Hybrid RAG + 2 tools + streaming vLLM',
    config: {
      preset: 'chatgpt',
      modelTier: 'balanced-70b',
      ragMode: 'hybrid-rerank',
      mcpToolsCount: 2,
      mcpStrictSchema: true,
      acpAgentHops: 1,
      enableVllmCache: true,
      promptTokens: 2400,
      thinkingTokens: 512
    }
  },
  claude: {
    label: 'Claude Architect',
    desc: 'Long-context KV prefix cache + Extended Thinking + 4 MCP servers',
    config: {
      preset: 'claude',
      modelTier: 'frontier-reasoner',
      ragMode: 'hybrid-rerank',
      mcpToolsCount: 4,
      mcpStrictSchema: true,
      acpAgentHops: 2,
      enableVllmCache: true,
      promptTokens: 16000,
      thinkingTokens: 2048
    }
  },
  copilot: {
    label: 'GitHub Copilot IDE',
    desc: 'Ultra-low-latency <200ms FIM code model + open-tab context + zero heavy hops',
    config: {
      preset: 'copilot',
      modelTier: 'fast-8b',
      ragMode: 'off',
      mcpToolsCount: 0,
      mcpStrictSchema: true,
      acpAgentHops: 1,
      enableVllmCache: true,
      promptTokens: 1600,
      thinkingTokens: 0
    }
  },
  'enterprise-mesh': {
    label: 'Enterprise RAG + MCP + ACP Mesh',
    desc: 'Multi-agent ACP compliance routing + Hybrid RAG + 5 MCP enterprise connectors',
    config: {
      preset: 'enterprise-mesh',
      modelTier: 'balanced-70b',
      ragMode: 'hybrid-rerank',
      mcpToolsCount: 5,
      mcpStrictSchema: true,
      acpAgentHops: 3,
      enableVllmCache: true,
      promptTokens: 4800,
      thinkingTokens: 1024
    }
  }
}

export type UnifiedSimResult = {
  health: 'optimal' | 'tradeoff' | 'breaking'
  verdictTitle: string
  verdictDetail: string
  ttftMs: number
  e2eMs: number
  contextTokensUsed: number
  groundedAccuracyPct: number
  reliabilityPct: number
  costPer1kUsd: number
  latencyBreakdown: { label: string; ms: number; pct: number; tone: 'primary' | 'positive' | 'warning' | 'danger' }[]
  activePipelineNodes: { id: string; label: string; role: string; active: boolean; ms: number }[]
}

export function runUnifiedArchitectSim(cfg: UnifiedSimConfig): UnifiedSimResult {
  const modelBaseTtft = cfg.modelTier === 'fast-8b' ? 55 : cfg.modelTier === 'balanced-70b' ? 165 : 290
  const modelTokRate = cfg.modelTier === 'fast-8b' ? 145 : cfg.modelTier === 'balanced-70b' ? 68 : 44
  const modelCostMult = cfg.modelTier === 'fast-8b' ? 0.25 : cfg.modelTier === 'balanced-70b' ? 1.0 : 2.6

  const gatewayMs = 18
  const ragMs = cfg.ragMode === 'off' ? 0 : cfg.ragMode === 'dense' ? 42 : 78
  const ragTokens = cfg.ragMode === 'off' ? 0 : cfg.ragMode === 'dense' ? 2200 : 1450
  const mcpMs = cfg.mcpToolsCount * (cfg.mcpStrictSchema ? 58 : 74)
  const mcpSchemaTokens = cfg.mcpToolsCount * 220
  const acpExtraHops = Math.max(0, cfg.acpAgentHops - 1)
  const acpMs = acpExtraHops * 145

  const contextTokensUsed = cfg.promptTokens + ragTokens + mcpSchemaTokens
  const prefillFactor = cfg.enableVllmCache ? 0.24 : 1.0
  const prefillMs = Math.round(modelBaseTtft + (contextTokensUsed / 1000) * 34 * prefillFactor)
  const thinkAndOutMs = Math.round(((cfg.thinkingTokens + 220) / modelTokRate) * 1000 * (cfg.enableVllmCache ? 0.82 : 1.25))

  const ttftMs = gatewayMs + ragMs + mcpMs + acpMs + prefillMs
  const e2eMs = ttftMs + thinkAndOutMs

  // Grounded accuracy
  let acc = cfg.modelTier === 'fast-8b' ? 76 : cfg.modelTier === 'balanced-70b' ? 85 : 91
  if (cfg.ragMode === 'dense') acc += 6
  if (cfg.ragMode === 'hybrid-rerank') acc += 11
  if (cfg.thinkingTokens >= 512) acc += 4
  if (cfg.mcpToolsCount > 0 && cfg.mcpStrictSchema) acc += 3
  if (cfg.mcpToolsCount > 0 && !cfg.mcpStrictSchema) acc -= 7
  const groundedAccuracyPct = Math.max(55, Math.min(99, acc))

  // Compound Pass^k reliability across MCP tools & ACP hops
  const stepRel = cfg.mcpStrictSchema ? 0.975 : 0.87
  const totalSteps = 1 + cfg.mcpToolsCount + acpExtraHops
  const reliabilityPct = Math.round(Math.pow(stepRel, totalSteps) * 100)

  // Unit economics per 1,000 requests
  const billedInputTok = cfg.enableVllmCache ? contextTokensUsed * 0.35 : contextTokensUsed
  const billedOutTok = cfg.thinkingTokens + 220 + acpExtraHops * 300
  const costPer1kUsd = Number((((billedInputTok * 0.0012 + billedOutTok * 0.0045) * modelCostMult) / 1000 * 1000).toFixed(2))

  // Health Verdict
  const isCopilotTooSlow = cfg.preset === 'copilot' && ttftMs > 260
  const health: 'optimal' | 'tradeoff' | 'breaking' =
    reliabilityPct < 75 || isCopilotTooSlow || (!cfg.mcpStrictSchema && cfg.mcpToolsCount >= 3)
      ? 'breaking'
      : e2eMs > 6500 || costPer1kUsd > 22 || !cfg.enableVllmCache
        ? 'tradeoff'
        : 'optimal'

  const verdictTitle =
    health === 'optimal'
      ? `Production-Ready Architecture: ${groundedAccuracyPct}% grounded accuracy · ${reliabilityPct}% Pass^k · ${ttftMs}ms TTFT`
      : health === 'tradeoff'
        ? `Latency or Cost Trade-Off: ${(e2eMs / 1000).toFixed(1)}s E2E · $${costPer1kUsd}/1k req — tune cache or thinking budget`
        : isCopilotTooSlow
          ? `IDE SLA Breached (${ttftMs}ms TTFT > 260ms): Copilot ghost-text needs Fast 8B + zero heavy RAG/ACP hops`
          : `Reliability Risk (${reliabilityPct}% Pass^k): Enable Strict MCP Schema Validation or reduce unguarded hops`

  const verdictDetail =
    `Total context packed: ${contextTokensUsed.toLocaleString()} tokens (${cfg.enableVllmCache ? 'vLLM PagedAttention + Prefix Cache ON' : 'No Prefix Cache — paying full prefill every turn'}). ` +
    `${cfg.ragMode === 'hybrid-rerank' ? 'Hybrid RAG + Reranker keeps context clean and cited.' : cfg.ragMode === 'dense' ? 'Dense-only RAG risks keyword misses; upgrade to Hybrid + Rerank.' : 'RAG disabled (relying on model weights / IDE buffer).'}`

  const maxBar = Math.max(e2eMs, 1)
  const latencyBreakdown = [
    { label: 'Gateway & RAG Retrieval', ms: gatewayMs + ragMs, pct: Math.max(3, Math.round(((gatewayMs + ragMs) / maxBar) * 100)), tone: 'primary' as const },
    { label: `MCP Tools (${cfg.mcpToolsCount}) & ACP (${cfg.acpAgentHops} agents)`, ms: mcpMs + acpMs, pct: Math.max(2, Math.round(((mcpMs + acpMs) / maxBar) * 100)), tone: reliabilityPct >= 85 ? 'positive' as const : 'danger' as const },
    { label: 'Transformer Prefill (TTFT Core)', ms: prefillMs, pct: Math.max(4, Math.round((prefillMs / maxBar) * 100)), tone: cfg.enableVllmCache ? 'positive' as const : 'warning' as const },
    { label: 'Thinking + Autoregressive Decode', ms: thinkAndOutMs, pct: Math.max(5, Math.round((thinkAndOutMs / maxBar) * 100)), tone: thinkAndOutMs < 4000 ? 'primary' as const : 'warning' as const }
  ]

  const activePipelineNodes = [
    { id: 'gw', label: '1. Gateway', role: 'Auth + Guard', active: true, ms: gatewayMs },
    { id: 'rag', label: '2. RAG', role: cfg.ragMode === 'off' ? 'Bypassed' : cfg.ragMode === 'dense' ? 'Vector Only' : 'Hybrid+Rerank', active: cfg.ragMode !== 'off', ms: ragMs },
    { id: 'mcp', label: '3. MCP', role: cfg.mcpToolsCount > 0 ? `${cfg.mcpToolsCount} JSON-RPC Tools` : 'No Tools', active: cfg.mcpToolsCount > 0, ms: mcpMs },
    { id: 'acp', label: '4. ACP / A2A', role: acpExtraHops > 0 ? `${cfg.acpAgentHops} Agents` : 'Single Agent', active: acpExtraHops > 0, ms: acpMs },
    { id: 'llm', label: '5. Transformer', role: cfg.enableVllmCache ? 'vLLM + Cache' : 'Standard GPU', active: true, ms: prefillMs + thinkAndOutMs }
  ]

  return {
    health,
    verdictTitle,
    verdictDetail,
    ttftMs,
    e2eMs,
    contextTokensUsed,
    groundedAccuracyPct,
    reliabilityPct,
    costPer1kUsd,
    latencyBreakdown,
    activePipelineNodes
  }
}
