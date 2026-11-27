export type DeepDiveTabId =
  | 'dl-transformer'
  | 'chatgpt-claude-build'
  | 'google-to-llm-to-vllm'
  | 'claude-architect-mastery'

export interface DfdStep {
  step: number
  nodeId: string
  title: string
  dataIn: string
  transformation: string
  dataOut: string
  tensorOrPayload: Record<string, unknown>
}

export interface EraStage {
  era: string
  year: string
  title: string
  keyBreakthrough: string
  architectureShift: string
  bottleneckSolved: string
  remainingLimit: string
}

export interface ArchitectPillar {
  number: string
  title: string
  plainGoal: string
  withoutPattern: string
  withPattern: string
  keyArtifacts: string[]
}

export const transformerDfdMermaid = `flowchart TD
    IN["1. Raw Text Prompt"] --> TOK["2. BPE Tokenizer (IDs)"]
    TOK --> EMB["3. Token Embedding + RoPE Position"]
    EMB --> NORM1["4. Pre-RMSNorm"]
    NORM1 --> ATTN["5. Masked GQA Self-Attention (Q·Kᵀ/√d)"]
    ATTN --> RES1["6. Residual Stream Add (+ x)"]
    RES1 --> MLP["7. RMSNorm + SwiGLU Feed-Forward"]
    MLP --> HEAD["8. LM Head + Softmax → Next Token"]`

export const transformerDfdSteps: DfdStep[] = [
  {
    step: 1,
    nodeId: 'IN',
    title: 'Raw Prompt Input',
    dataIn: 'UTF-8 string from user or system prompt',
    transformation: 'Normalized text enters the inference tokenizer',
    dataOut: 'Raw character sequence',
    tensorOrPayload: { prompt: 'Explain PagedAttention simply', chars: 29 }
  },
  {
    step: 2,
    nodeId: 'TOK',
    title: 'Subword BPE Tokenization',
    dataIn: 'Raw text string',
    transformation: 'Byte-Pair Encoding maps frequent subwords into integer vocabulary IDs',
    dataOut: 'Integer tensor [Batch=1, SeqLen=5]',
    tensorOrPayload: { tokens: ['Explain', ' Paged', 'Attention', ' simply'], ids: [42110, 61022, 18944, 6781], shape: '[1, 4]' }
  },
  {
    step: 3,
    nodeId: 'EMB',
    title: 'Embeddings + RoPE Positional Rotation',
    dataIn: 'Token IDs [1, 4]',
    transformation: 'Each token ID looks up a dense vector (e.g. 4096 dims) and RoPE encodes relative word distance via rotation',
    dataOut: 'Residual stream tensor [1, 4, 4096]',
    tensorOrPayload: { d_model: 4096, positional_scheme: 'RoPE (Rotary)', tensor_shape: '[1, 4, 4096]' }
  },
  {
    step: 4,
    nodeId: 'ATTN',
    title: 'Causal Grouped-Query Self-Attention (GQA)',
    dataIn: 'Normalized hidden states [1, 4, 4096]',
    transformation: 'Computes Q, K, V projections; causal mask blocks peeking at future tokens; KV heads are shared across query groups to shrink KV cache 4×–8×',
    dataOut: 'Context-blended vectors [1, 4, 4096] + updated KV cache',
    tensorOrPayload: { query_heads: 32, kv_heads: 8, kv_memory_saved: '75%', causal_mask: 'upper_triangle = -inf' }
  },
  {
    step: 5,
    nodeId: 'MLP',
    title: 'Residual Stream + SwiGLU Feed-Forward Network',
    dataIn: 'Attention output + skip connection',
    transformation: 'Attention moves info between tokens; MLP acts like a key-value factual memory per token using SwiGLU gating. Repeated N=32–128 layers!',
    dataOut: 'Deep contextual representation [1, 4, 4096]',
    tensorOrPayload: { layers_stacked: 32, activation: 'SwiGLU', residual_highway: 'prevents vanishing gradients' }
  },
  {
    step: 6,
    nodeId: 'HEAD',
    title: 'Unembedding Head & Token Sampling',
    dataIn: 'Final token vector [1, 4096]',
    transformation: 'Projects into vocabulary logits (128k tokens), applies temperature/top-p softmax, and emits 1 next token—then loops!',
    dataOut: 'Streamed next token + KV cache append',
    tensorOrPayload: { vocab_size: 128256, top_candidate: 'Paged', prob: 0.87, next_phase: 'decode_step_t+1' }
  }
]

export const chatgptClaudeBuildMermaid = `flowchart TD
    CORPUS["1. Trillion-Token Web, Code & Books"] --> PRE["2. Pretraining (Next-Token Base LLM)"]
    PRE --> SFT["3. Supervised Fine-Tuning (SFT Dialogues)"]
    SFT --> ALIGN["4. Alignment: RLHF (GPT) / Constitutional AI (Claude)"]
    ALIGN --> REASON["5. RLVR & Extended Thinking Training"]
    REASON --> RUNTIME["6. Production Runtime: System Prompt + MCP Tools + Guardrails"]`

export const chatgptClaudeBuildSteps: DfdStep[] = [
  {
    step: 1,
    nodeId: 'CORPUS',
    title: 'Data Curation, Filtering & Deduplication',
    dataIn: 'Petabytes of public web pages, open-source code, math, and licensed books',
    transformation: 'Exact/fuzzy deduplication, toxicity & PII scrubbing, quality classifiers, and balanced domain mixture weighting',
    dataOut: '10T–30T+ clean training tokens',
    tensorOrPayload: { raw_petabytes: 45, deduplicated_tokens: '15 Trillion', code_and_stem_mix: '32%' }
  },
  {
    step: 2,
    nodeId: 'PRE',
    title: 'Large-Scale Pretraining (Base Model)',
    dataIn: 'Clean token sequences packed into 8K–128K windows across thousands of GPUs',
    transformation: 'Self-supervised next-token prediction via 3D parallelism (Data + Tensor + Pipeline). Learns world facts, grammar, and code structure—but NOT how to be a helpful assistant yet.',
    dataOut: 'Base Foundation Weights (completion engine)',
    tensorOrPayload: { objective: 'Cross-Entropy Next Token', gpu_cluster: '16,384 GPUs', behavior: 'Completes text; does not follow chat instructions reliably' }
  },
  {
    step: 3,
    nodeId: 'SFT',
    title: 'Supervised Fine-Tuning (Instruction Following)',
    dataIn: 'Curated high-quality (Prompt → Ideal Expert Response) pairs',
    transformation: 'Teaches chat turn structure, coding clarity, tool-call JSON syntax, and honest uncertainty ("I don’t know")',
    dataOut: 'Instruction-Tuned Model',
    tensorOrPayload: { examples: '100k–1M curated conversations', format: 'system / user / assistant / tool roles', gain: 'Turns autocomplete into a structured assistant' }
  },
  {
    step: 4,
    nodeId: 'ALIGN',
    title: 'Preference Alignment: RLHF vs. Constitutional AI (Claude)',
    dataIn: 'Multiple model answers per prompt + Human ratings or Explicit Constitution rules',
    transformation: 'GPT pioneered RLHF (human labelers rank pairs → Reward Model → PPO/DPO). Claude adds Constitutional AI (RLAIF): the model critiques and revises its own drafts against written safety/helpfulness principles, then trains a preference model at scale.',
    dataOut: 'Helpful, Honest & Harmless (HHH) Aligned Model',
    tensorOrPayload: { chatgpt_core: 'RLHF + DPO / PPO + Safety Spec', claude_core: 'Constitutional AI (Self-Critique + RLAIF + Human Calibration)', outcome: 'Refuses harm without refusing benign edge cases' }
  },
  {
    step: 5,
    nodeId: 'REASON',
    title: 'Reinforcement Learning with Verifiable Rewards (RLVR / Thinking)',
    dataIn: 'Hard math, coding tests, logic & multi-step tool tasks with automated unit-test verifiers',
    transformation: 'Model is rewarded when hidden thinking tokens lead to verified passing tests—producing Extended Thinking / reasoning models',
    dataOut: 'Reasoning-Capable Frontier Model',
    tensorOrPayload: { reward_signal: 'Unit tests & formal verifiers', inference_scaling: 'More thinking tokens → higher accuracy on hard tasks' }
  },
  {
    step: 6,
    nodeId: 'RUNTIME',
    title: 'Serving Architecture, System Prompt, Tools & Guardrails',
    dataIn: 'Live user message + conversation memory + MCP tool schemas',
    transformation: 'Prompt cache hits reuse static system/doc prefixes; input/output safety classifiers filter abuse; model streams thinking & tool calls through a low-latency inference cluster',
    dataOut: 'Grounded, policy-compliant streamed answer or tool call',
    tensorOrPayload: { layers: ['Prompt Cache', 'Safety Classifier', 'Tool/MCP Sandbox', 'Streaming Decode'], p95_ttft_ms: 340 }
  }
]

export const googleToVllmMermaid = `flowchart TD
    G2017["1. Google 2017: Attention Is All You Need (Encoder-Decoder)"] --> LLM["2. Decoder-Only LLMs (GPT / Claude / Gemini + GQA + RoPE)"]
    LLM --> BOTTLE["3. Serving Bottleneck: Static Batching & 65% Wasted KV VRAM"]
    BOTTLE --> PAGED["4. vLLM PagedAttention (OS Virtual-Memory KV Blocks)"]
    PAGED --> CONT["5. Continuous Batching + Chunked Prefill + Prefix Cache"]
    CONT --> PROD["6. Production Throughput: 10×–24× More Requests / GPU"]`

export const googleToVllmSteps: DfdStep[] = [
  {
    step: 1,
    nodeId: 'G2017',
    title: 'Google Brain 2017 — Original Transformer',
    dataIn: 'Source sentence (e.g. English) → Target sentence (e.g. French)',
    transformation: 'Replaced sequential RNNs with parallel Self-Attention in an Encoder-Decoder architecture. Allowed massive GPU parallelization during training.',
    dataOut: 'Translated text sequence (~65M parameters)',
    tensorOrPayload: { paper: 'Vaswani et al., Google 2017', architecture: 'Encoder-Decoder', positional: 'Fixed Sinusoidal', attention: 'Standard MHA' }
  },
  {
    step: 2,
    nodeId: 'LLM',
    title: 'Shift to Decoder-Only Foundation LLMs (2018–2026)',
    dataIn: 'Unified text/code/multimodal token stream',
    transformation: 'Dropped the Encoder; scaled causal Decoder-only models to 70B–1T+ params with Pre-RMSNorm, RoPE, SwiGLU, Grouped-Query Attention (GQA), and Mixture-of-Experts (MoE).',
    dataOut: 'General-purpose reasoning & coding assistants (GPT, Claude, Gemini)',
    tensorOrPayload: { scale_jump: '65M → 100B–1T+ params', context_jump: '512 → 200K–2M tokens', key_opt: 'GQA + MoE sparse routing' }
  },
  {
    step: 3,
    nodeId: 'BOTTLE',
    title: 'Why Naive LLM Serving Breaks in Production',
    dataIn: 'Concurrent live users with unpredictable output lengths',
    transformation: 'Traditional HuggingFace serving pre-allocates one giant contiguous KV-cache rectangle up to max_seq_len per user—wasting 60%–80% of expensive GPU VRAM on unused/fragmented slots!',
    dataOut: 'Only 4–8 users fit on an 80 GB GPU; short prompts wait behind long essays',
    tensorOrPayload: { kv_memory_waste_pct: 68, batching_type: 'Static (head-of-line blocking)', throughput_penalty: 'GPU sits 75% idle' }
  },
  {
    step: 4,
    nodeId: 'PAGED',
    title: 'vLLM Breakthrough #1 — PagedAttention',
    dataIn: 'Variable-length requests needing KV-cache storage',
    transformation: 'Borrows OS Virtual Memory paging! Splits each request’s KV cache into tiny non-contiguous 16-token blocks mapped by a Block Table—allocating blocks on demand as tokens generate.',
    dataOut: 'Memory waste drops from ~68% to <4%; 4×–8× larger active batch fits in VRAM',
    tensorOrPayload: { kv_block_size: '16 tokens', memory_waste_pct: 3.5, copy_on_write_sharing: 'Multiple requests share system-prompt KV blocks!' }
  },
  {
    step: 5,
    nodeId: 'CONT',
    title: 'vLLM Breakthrough #2 — Continuous Batching & Prefix Caching',
    dataIn: 'Live stream of arriving & finishing requests',
    transformation: 'Iteration-level scheduling inserts new requests the instant any slot finishes; Automatic Prefix Caching reuses identical system/RAG prompt KV blocks; Chunked Prefill prevents long prompts from freezing decode.',
    dataOut: 'Smooth low inter-token latency alongside peak GPU utilization',
    tensorOrPayload: { batching: 'Continuous (per-token step)', prefix_cache_hit: 'Skips 80%+ prefill compute', speculative_decoding: 'Draft model proposes 4–5 tokens verified in 1 pass' }
  },
  {
    step: 6,
    nodeId: 'PROD',
    title: 'Production Result: Google → LLM → vLLM',
    dataIn: 'Enterprise traffic spikes',
    transformation: 'Combines Google’s attention invention + modern GQA/MoE LLMs + vLLM OS-grade memory management into resilient, low-cost serving infrastructure.',
    dataOut: '10×–24× higher request throughput per GPU dollar',
    tensorOrPayload: { speedup_vs_naive: '14.5× throughput', cost_reduction: '80%–90% lower GPU cost/1M tokens', slo_ready: true }
  }
]

export const evolutionEras: EraStage[] = [
  {
    era: 'Era 1 · Origin',
    year: '2017',
    title: 'Google "Attention Is All You Need"',
    keyBreakthrough: 'Replaced sequential RNN recurrence with parallel Multi-Head Self-Attention.',
    architectureShift: 'Encoder-Decoder (6+6 layers), Post-LayerNorm, Sinusoidal positions, ~65M params.',
    bottleneckSolved: 'Trained 10×–100× faster across GPUs/TPUs and captured long-range word dependencies.',
    remainingLimit: 'Task-specific (translation); quadratic attention cost; not a general instruction follower.'
  },
  {
    era: 'Era 2 · Scaling',
    year: '2019–2025',
    title: 'Decoder-Only Frontier LLMs (GPT, Claude, Gemini)',
    keyBreakthrough: 'Scaling laws + Pretraining + SFT + RLHF/Constitutional AI + Extended Thinking.',
    architectureShift: 'Decoder-only causal stack, Pre-RMSNorm, RoPE, SwiGLU, GQA, Sparse MoE, 200K–2M contexts.',
    bottleneckSolved: 'One general model handles coding, reasoning, RAG, vision, and tool orchestration.',
    remainingLimit: 'Memory-bandwidth bound during decode; naive serving wastes >65% of GPU VRAM in KV cache.'
  },
  {
    era: 'Era 3 · Serving Engine',
    year: '2023–2026',
    title: 'vLLM & Modern Inference Engines',
    keyBreakthrough: 'PagedAttention (OS virtual memory for KV cache), Continuous Batching & Prefix Caching.',
    architectureShift: 'Non-contiguous 16-token KV blocks, iteration-level scheduler, FP8/INT4 kernels, Speculative Decode.',
    bottleneckSolved: 'Cuts KV-cache waste to <4% and lifts throughput 10×–24× on the exact same GPU hardware.',
    remainingLimit: 'Still requires admission control, tenant fairness queues, and quality-tested quantization.'
  }
]

export const claudeArchitectDfdMermaid = `flowchart TD
    REQ["1. User Intent & Verified Tenant"] --> ROUTE["2. Model Tier Router (Fast vs Frontier)"]
    ROUTE --> CACHE["3. Prompt Cache Prefix (XML System + Docs)"]
    CACHE --> ORCH["4. Workflow / Agent Pattern (Chaining, Parallel, Eval-Opt)"]
    ORCH --> THINK["5. Budgeted Extended Thinking + Typed MCP Tools"]
    THINK --> GATE["6. Server Policy, Citation & Eval Gate → Streamed Output"]`

export const claudeArchitectDfdSteps: DfdStep[] = [
  {
    step: 1,
    nodeId: 'REQ',
    title: 'Trusted Identity & Problem Scoping',
    dataIn: 'Authenticated user request + tenant ACL',
    transformation: 'Master architects first ask: "Does this need an LLM, a deterministic workflow, or an autonomous agent?" Resolve tenant & scope strictly on the server.',
    dataOut: 'Scoped task envelope',
    tensorOrPayload: { principle: 'Simplest pattern that meets accuracy SLO', tenant_resolved: 'server-side JWT' }
  },
  {
    step: 2,
    nodeId: 'ROUTE',
    title: 'Intelligent Model Tier Routing',
    dataIn: 'Task complexity & latency budget',
    transformation: 'Route simple classification/extraction to fast small models (Haiku-tier), coding/agents to balanced workhorse models (Sonnet-tier), and deep architecture synthesis to frontier reasoning models (Opus-tier).',
    dataOut: 'Optimal price-to-intelligence model selected',
    tensorOrPayload: { triage_tier: 'Fast/Small (70% traffic)', coding_agent_tier: 'Balanced Workhorse (25%)', frontier_tier: 'Deep Reasoning (5%)' }
  },
  {
    step: 3,
    nodeId: 'CACHE',
    title: 'Context Engineering & Prompt Caching',
    dataIn: 'Static system instructions, XML-delimited docs, tool definitions, dynamic user turn',
    transformation: 'Place stable instructions, tool schemas, and long reference documents FIRST in strict XML blocks with cache breakpoints—cutting repeated input token costs up to 90% and TTFT up to 80%.',
    dataOut: 'Cached prefix hit + lean dynamic turn',
    tensorOrPayload: { prefix_structure: '<instructions> → <tools> → <documents> → <user_query>', cache_savings: 'Up to 90% input cost drop' }
  },
  {
    step: 4,
    nodeId: 'ORCH',
    title: 'Composable Workflows Before Autonomous Loops',
    dataIn: 'Decomposed subtasks',
    transformation: 'Apply Anthropic’s proven patterns: Prompt Chaining, Routing, Parallel Voting/Sectioning, Orchestrator-Workers, or Evaluator-Optimizer—upgrading to open-ended agents only when step count is unpredictable.',
    dataOut: 'Bounded, observable execution graph',
    tensorOrPayload: { patterns: ['Chaining', 'Routing', 'Parallelization', 'Orchestrator-Workers', 'Evaluator-Optimizer'] }
  },
  {
    step: 5,
    nodeId: 'THINK',
    title: 'Budgeted Extended Thinking & Clean MCP Tools',
    dataIn: 'Complex reasoning step or external API need',
    transformation: 'Allocate explicit thinking token budgets for hard logic/debugging; design concise, unambiguous MCP tool schemas with clear error messages so the model self-corrects cleanly.',
    dataOut: 'Verified structured proposal',
    tensorOrPayload: { thinking_budget_tokens: 4096, mcp_design: 'Poka-yoke tool args (hard to misuse)', retry_safe: true }
  },
  {
    step: 6,
    nodeId: 'GATE',
    title: 'Eval-Driven Release & Defense-in-Depth Gate',
    dataIn: 'Model response or proposed mutation',
    transformation: 'Code validates citations, JSON schemas, and user permissions; golden eval suites grade every prompt/model change in CI before canary rollout.',
    dataOut: 'Auditable, grounded production result',
    tensorOrPayload: { eval_graders: ['Deterministic Unit Tests', 'Citation Verifier', 'Calibrated Rubric Judge'], release_policy: 'Fail-Closed' }
  }
]

export const claudeArchitectPillars: ArchitectPillar[] = [
  {
    number: '01',
    title: 'Context Engineering & Prompt Caching',
    plainGoal: 'Treat the context window as finite, high-value working memory—not a dumping ground.',
    withoutPattern: 'Unstructured walls of text re-sent every turn at 100% token price, causing instruction drift and slow TTFT.',
    withPattern: 'XML-structured sections (`<context>`, `<rules>`, `<examples>`) with stable cached prefixes cut input spend by up to 90%.',
    keyArtifacts: ['Stable prefix ordering', '3–5 diverse few-shot examples', 'Explicit abstention rule']
  },
  {
    number: '02',
    title: 'Workflows First, Agents Only When Needed',
    plainGoal: 'Pick the simplest composable architecture that reliably solves the task.',
    withoutPattern: 'Giving an open-ended agent 30 tools for a predictable 3-step pipeline causes random failures and 5× cost.',
    withPattern: 'Use Prompt Chaining, Routing, Parallelization, or Evaluator-Optimizer first; reserve open agents for truly open-ended coding/research.',
    keyArtifacts: ['Pattern decision matrix', 'Bounded step & token caps', 'Deterministic fallback path']
  },
  {
    number: '03',
    title: 'Tool Design & MCP Engineering (ACI)',
    plainGoal: 'Design the Agent-Computer Interface (ACI) with the same care you give Human UI (UX).',
    withoutPattern: 'Vague tool names, raw stack traces, and 40 overlapping endpoints confuse the model into repeated bad calls.',
    withPattern: 'Consolidated, self-documenting MCP tools with strict schemas, clear examples, and actionable error messages.',
    keyArtifacts: ['Minimal tool surface', 'Poka-yoke parameter formats', 'Server-side OAuth & idempotency']
  },
  {
    number: '04',
    title: 'Model Tiering & Extended Thinking Budgets',
    plainGoal: 'Match intelligence and reasoning tokens to task difficulty.',
    withoutPattern: 'Sending every simple FAQ and typo-check to the largest reasoning model blows latency SLOs and monthly budgets.',
    withPattern: 'Tiered routing (Fast → Balanced → Frontier) + scoped Extended Thinking budgets achieve top accuracy at 60% lower cost.',
    keyArtifacts: ['Complexity router', 'Explicit thinking_budget cap', 'Streaming UX for long thoughts']
  },
  {
    number: '05',
    title: 'Eval-Driven Development (EDD)',
    plainGoal: 'Never ship a prompt, tool, or model change on gut feeling alone.',
    withoutPattern: 'Fixing one prompt bug silently breaks 12 other customer scenarios that nobody notices until production.',
    withPattern: '50–200 versioned real-world eval cases run automatically in CI combining deterministic code checks + calibrated rubric judges.',
    keyArtifacts: ['Versioned golden eval set', 'Pass@k reliability metrics', 'Slice regression gates']
  },
  {
    number: '06',
    title: 'Safety, Security & Production FinOps',
    plainGoal: 'Separate untrusted model outputs from trusted enterprise execution boundaries.',
    withoutPattern: 'Prompt injection in a PDF triggers privileged API mutations or leaks another tenant’s cached data.',
    withPattern: 'Zero-trust server policy gates, human approvals bound to payload hashes, redacted OTel traces, and Cost-per-Solved-Task monitoring.',
    keyArtifacts: ['Tenant-scoped ACLs & caches', 'Red-team regression suite', 'Canary + instant bundle rollback']
  }
]
