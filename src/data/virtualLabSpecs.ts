export type VirtualEnvControl =
  | {
      key: string
      label: string
      type: 'range'
      min: number
      max: number
      step: number
      defaultValue: number
      unit?: string
    }
  | {
      key: string
      label: string
      type: 'select'
      options: { value: string; label: string }[]
      defaultValue: string
    }
  | {
      key: string
      label: string
      type: 'toggle'
      defaultValue: boolean
    }

export type VirtualLabSpec = {
  id: string
  number: string
  title: string
  stageTag: string
  runtimeProfile: string
  packages: string[]
  summary: string
  architectGoal: string
  whatToExperiment: string[]
  mermaidDfd: string
  envControls: VirtualEnvControl[]
  executableCode: string
  pythonBlueprint: string
}

export const virtualLabSpecs: VirtualLabSpec[] = [
  {
    id: 'lab-transformer-gqa',
    number: '01',
    title: 'Transformer Causal Self-Attention, RoPE & GQA KV-Cache',
    stageTag: 'Stage 03–04 · Deep Learning & Transformers',
    runtimeProfile: 'ai-arch-venv-3.12 · Tensor Math Sandbox',
    packages: ['torch==2.5', 'einops', 'triton', 'flash-attn'],
    summary:
      'Compute real scaled dot-product causal self-attention scores, enforce upper-triangular future masking, and quantify FP16 vs. Grouped-Query Attention (GQA) KV-cache memory.',
    architectGoal:
      'Prove two non-negotiable transformer invariants: (1) token i can NEVER attend to future token j > i, and (2) GQA cuts KV-cache VRAM by 4× without shrinking query heads.',
    whatToExperiment: [
      'Switch FAIL_MODE to "leak_future_tokens" to watch the causal mask assertion fail immediately.',
      'Toggle USE_GQA off vs. on while raising SEQ_LEN to 16384 to see KV-cache VRAM explode under classic MHA.',
      'Edit the Q/K vectors or temperature scaling divisor in the code editor and re-run to inspect the updated attention distribution.'
    ],
    mermaidDfd: `flowchart LR
  TOK["Tokens [T]"] --> QKV["Q, K, V Projections"]
  QKV --> SCORE["Scores = Q·Kᵀ / √d_k"]
  SCORE --> MASK["Causal Mask (j > i => -∞)"]
  MASK --> SOFT["Row-wise Softmax"]
  SOFT --> OUT["Context = Softmax · V + KV Cache"]`,
    envControls: [
      { key: 'SEQ_LEN', label: 'Context Length (tokens)', type: 'range', min: 1024, max: 32768, step: 1024, defaultValue: 8192, unit: 'tok' },
      { key: 'USE_GQA', label: 'Grouped-Query Attention (8 KV heads vs 32 Q)', type: 'toggle', defaultValue: true },
      {
        key: 'FAIL_MODE',
        label: 'Fault Injection',
        type: 'select',
        defaultValue: 'none',
        options: [
          { value: 'none', label: 'Nominal (Causal Mask Active)' },
          { value: 'leak_future_tokens', label: 'Inject Bug: Remove Causal Mask' }
        ]
      }
    ],
    executableCode: `// Deep Lab 01 — Real Causal Self-Attention + GQA KV-Cache Sizing
const tokens = ["User", "asks", "about", "vLLM"];
const d_k = 4;

// Sample projected Query, Key, Value vectors for 4 tokens
const Q = [
  [0.9, 0.2, 0.1, 0.4],
  [0.3, 0.8, 0.2, 0.5],
  [0.2, 0.4, 0.9, 0.3],
  [0.6, 0.7, 0.8, 0.9]
];
const K = [
  [0.8, 0.1, 0.2, 0.3],
  [0.4, 0.9, 0.1, 0.4],
  [0.1, 0.3, 0.9, 0.2],
  [0.7, 0.8, 0.7, 0.9]
];
const V = [
  [1.0, 0.0, 0.2, 0.1],
  [0.2, 1.0, 0.1, 0.4],
  [0.1, 0.3, 1.0, 0.5],
  [0.8, 0.9, 0.7, 1.0]
];

const dot = (a, b) => a.reduce((acc, v, i) => acc + v * b[i], 0);
const softmax = (row) => {
  const finite = row.filter(Number.isFinite);
  const maxVal = Math.max(...finite);
  const exps = row.map(v => (Number.isFinite(v) ? Math.exp(v - maxVal) : 0));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => Number((e / sum).toFixed(4)));
};

const applyCausalMask = ENV.FAIL_MODE !== 'leak_future_tokens';
console.log("Running Causal Self-Attention for tokens:", tokens.join(" -> "));
console.log("Causal Masking:", applyCausalMask ? "ENABLED (strict autoregressive)" : "DISABLED (BUG INJECTED!)");

const weights = tokens.map((_, i) => {
  const rawRow = tokens.map((__, j) => {
    if (applyCausalMask && j > i) return -Infinity;
    return dot(Q[i], K[j]) / Math.sqrt(d_k);
  });
  return softmax(rawRow);
});

// Verify zero probability mass leaks from future tokens (j > i)
let futureLeak = 0;
for (let i = 0; i < tokens.length; i++) {
  for (let j = i + 1; j < tokens.length; j++) {
    futureLeak += weights[i][j];
  }
}

// Compute context output = AttentionWeights * V
const output = weights.map(row =>
  V[0].map((_, dim) => Number(row.reduce((acc, w, j) => acc + w * V[j][dim], 0).toFixed(3)))
);

// Exact FP16 KV-Cache Sizing for a 32-layer Llama/Claude-class decoder block
const layers = 32;
const numQHeads = 32;
const numKvHeads = ENV.USE_GQA ? 8 : 32;
const headDim = 128;
const bytesPerFp16 = 2;
const kvBytes = 2 * layers * numKvHeads * headDim * ENV.SEQ_LEN * bytesPerFp16;
const kvMb = Number((kvBytes / (1024 * 1024)).toFixed(1));
const mhaMb = Number(((2 * layers * numQHeads * headDim * ENV.SEQ_LEN * bytesPerFp16) / (1024 * 1024)).toFixed(1));

console.log("Attention Matrix (rows=query token, cols=key token):");
weights.forEach((row, i) => console.log("  " + tokens[i].padEnd(6) + " => " + JSON.stringify(row)));
console.log("KV-Cache Footprint (" + ENV.SEQ_LEN + " tok):", kvMb + " MB (vs classic MHA " + mhaMb + " MB)");

assert(futureLeak === 0, "Zero future-token attention leakage (upper triangle === 0)");
assert(weights.every(r => Math.abs(r.reduce((a, b) => a + b, 0) - 1) < 0.01), "Every attention row sums to 1.00");
assert(ENV.USE_GQA ? kvMb < mhaMb * 0.3 : kvMb === mhaMb, "KV-cache memory matches expected MHA/GQA head ratio");

emitMetric("Future Token Leak", futureLeak.toFixed(4), "prob", futureLeak === 0 ? "optimal" : "breaking");
emitMetric("KV Cache / Request", kvMb, "MB FP16", kvMb <= 1024 ? "optimal" : "tradeoff");
emitMetric("KV Compression", ENV.USE_GQA ? "4.0×" : "1.0×", "vs MHA", ENV.USE_GQA ? "optimal" : "tradeoff");
emitMetric("Active KV Heads", numKvHeads + " / " + numQHeads, "heads", "optimal");

emitArtifact("Attention Weight Matrix & Context Output", {
  tokens,
  causal_mask_active: applyCausalMask,
  attention_weights: weights,
  context_vectors: output,
  kv_cache_spec: { layers, num_q_heads: numQHeads, num_kv_heads: numKvHeads, seq_len: ENV.SEQ_LEN, kv_mb: kvMb }
});`,
    pythonBlueprint: `# Production PyTorch Architect Blueprint — Pre-RMSNorm Causal GQA Block
import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class CausalGQAAttention(nn.Module):
    def __init__(self, d_model: int = 4096, n_heads: int = 32, n_kv_heads: int = 8):
        super().__init__()
        self.n_heads = n_heads
        self.n_kv_heads = n_kv_heads
        self.head_dim = d_model // n_heads
        self.group_size = n_heads // n_kv_heads  # 4 query heads share 1 KV head

        self.wq = nn.Linear(d_model, n_heads * self.head_dim, bias=False)
        self.wk = nn.Linear(d_model, n_kv_heads * self.head_dim, bias=False)
        self.wv = nn.Linear(d_model, n_kv_heads * self.head_dim, bias=False)
        self.wo = nn.Linear(d_model, d_model, bias=False)

    def forward(self, x: torch.Tensor, kv_cache=None):
        B, T, C = x.shape
        q = self.wq(x).view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        k = self.wk(x).view(B, T, self.n_kv_heads, self.head_dim).transpose(1, 2)
        v = self.wv(x).view(B, T, self.n_kv_heads, self.head_dim).transpose(1, 2)

        # Append to incremental decode KV cache when serving
        if kv_cache is not None:
            k = torch.cat([kv_cache[0], k], dim=2)
            v = torch.cat([kv_cache[1], v], dim=2)

        # Broadcast KV heads across query groups (zero extra VRAM in FlashAttention)
        k_rep = k.repeat_interleave(self.group_size, dim=1)
        v_rep = v.repeat_interleave(self.group_size, dim=1)

        # FlashAttention-2 fused causal kernel (O(T) SRAM instead of O(T^2) HBM)
        out = F.scaled_dot_product_attention(q, k_rep, v_rep, is_causal=(kv_cache is None))
        out = out.transpose(1, 2).contiguous().view(B, T, C)
        return self.wo(out), (k, v)`
  },
  {
    id: 'lab-vllm-paged-attention',
    number: '02',
    title: 'vLLM PagedAttention BlockTable & Continuous Batching',
    stageTag: 'Stage 04 & 12 · Google → LLM → vLLM Serving',
    runtimeProfile: 'ai-arch-venv-3.12 · vLLM Engine Simulator',
    packages: ['vllm==0.6', 'ray', 'triton', 'prometheus-client'],
    summary:
      'Run a real OS-style virtual memory BlockTable allocator for LLM KV-cache pages (16 tokens/block) with Copy-on-Write prefix sharing and compare utilization against naive contiguous pre-allocation.',
    architectGoal:
      'Demonstrate mathematically why vLLM achieves 10×–24× higher GPU throughput: eliminating 60–80% contiguous KV fragmentation and sharing identical system-prompt blocks across concurrent users.',
    whatToExperiment: [
      'Switch FAIL_MODE to "naive_contiguous" to see VRAM waste jump above 60% and requests get rejected.',
      'Increase SHARED_PREFIX_TOKENS to 1024 to watch Copy-on-Write prefix caching save hundreds of physical GPU blocks.',
      'Edit blockSize or request token lengths directly in code to observe exact physical page fragmentation.'
    ],
    mermaidDfd: `flowchart LR
  REQ["Concurrent Requests"] --> PRE["Prefix Hash Check"]
  PRE --> COW["Shared Read-Only KV Blocks (CoW)"]
  COW --> BT["Logical → Physical BlockTable"]
  BT --> SCHED["Continuous Iteration Scheduler"]
  SCHED --> GPU["Zero-Waste GPU HBM Pool"]`,
    envControls: [
      { key: 'TOTAL_BLOCKS', label: 'GPU Physical Block Pool (16 tok/blk)', type: 'range', min: 120, max: 640, step: 40, defaultValue: 320, unit: 'blks' },
      { key: 'SHARED_PREFIX_TOKENS', label: 'Shared System/RAG Prefix', type: 'range', min: 0, max: 1024, step: 128, defaultValue: 512, unit: 'tok' },
      {
        key: 'FAIL_MODE',
        label: 'Allocator Mode',
        type: 'select',
        defaultValue: 'vllm_paged',
        options: [
          { value: 'vllm_paged', label: 'vLLM PagedAttention + CoW Prefix Cache' },
          { value: 'naive_contiguous', label: 'Naive Static Contiguous (Pre-vLLM)' }
        ]
      }
    ],
    executableCode: `// Deep Lab 02 — Real vLLM PagedAttention BlockTable Allocator
const BLOCK_SIZE = 16; // 16 tokens per physical KV block
const MAX_SEQ_RESERVATION = 2048; // Naive servers pre-reserve max_model_len!
const requests = [
  { id: "req_101", promptTok: ENV.SHARED_PREFIX_TOKENS + 140, genTok: 95 },
  { id: "req_102", promptTok: ENV.SHARED_PREFIX_TOKENS + 210, genTok: 180 },
  { id: "req_103", promptTok: ENV.SHARED_PREFIX_TOKENS + 90,  genTok: 60 },
  { id: "req_104", promptTok: ENV.SHARED_PREFIX_TOKENS + 310, genTok: 240 },
  { id: "req_105", promptTok: ENV.SHARED_PREFIX_TOKENS + 125, genTok: 110 },
  { id: "req_106", promptTok: ENV.SHARED_PREFIX_TOKENS + 185, genTok: 150 }
];

const isVllm = ENV.FAIL_MODE === 'vllm_paged';
const sharedBlocksCount = Math.floor(ENV.SHARED_PREFIX_TOKENS / BLOCK_SIZE);

let freePhysicalBlocks = ENV.TOTAL_BLOCKS;
let allocatedBlocks = 0;
let usefulTokenSlots = 0;
let reservedTokenSlots = 0;
let admitted = 0;
let rejected = 0;
const blockTables = [];

if (isVllm && sharedBlocksCount > 0) {
  // Allocate shared system prompt ONCE across all concurrent users (Copy-on-Write!)
  allocatedBlocks += sharedBlocksCount;
  freePhysicalBlocks -= sharedBlocksCount;
  console.log("[PrefixCache] Allocated " + sharedBlocksCount + " shared CoW blocks once for " + requests.length + " users.");
}

for (const req of requests) {
  const totalTok = req.promptTok + req.genTok;
  let blocksNeeded;
  if (isVllm) {
    const uniqueTok = totalTok - (sharedBlocksCount * BLOCK_SIZE);
    blocksNeeded = Math.ceil(Math.max(0, uniqueTok) / BLOCK_SIZE);
  } else {
    // Pre-vLLM naive allocator must reserve contiguous MAX_SEQ_RESERVATION upfront
    blocksNeeded = Math.ceil(MAX_SEQ_RESERVATION / BLOCK_SIZE);
  }

  if (blocksNeeded <= freePhysicalBlocks) {
    freePhysicalBlocks -= blocksNeeded;
    allocatedBlocks += blocksNeeded;
    admitted++;
    usefulTokenSlots += totalTok;
    reservedTokenSlots += isVllm ? (blocksNeeded + (admitted === 1 ? sharedBlocksCount : 0)) * BLOCK_SIZE : blocksNeeded * BLOCK_SIZE;
    blockTables.push({
      request: req.id,
      tokens: totalTok,
      private_blocks: blocksNeeded,
      shared_blocks: isVllm ? sharedBlocksCount : 0,
      status: "ADMITTED"
    });
    console.log("  ADMIT " + req.id + " | tokens=" + totalTok + " | private_blks=" + blocksNeeded + " | free_blks=" + freePhysicalBlocks);
  } else {
    rejected++;
    blockTables.push({ request: req.id, tokens: totalTok, status: "PREEMPTED_OOM" });
    console.warn("  PREEMPT " + req.id + " | needs=" + blocksNeeded + " blks > free=" + freePhysicalBlocks);
  }
}

const wastePct = reservedTokenSlots > 0
  ? Number((Math.max(0, 1 - usefulTokenSlots / reservedTokenSlots) * 100).toFixed(1))
  : 100;
const throughputGain = isVllm ? Number((admitted * 1.45).toFixed(1)) : Number((admitted * 0.4).toFixed(1));

console.log("Summary => Admitted:", admitted + "/" + requests.length, "| KV Waste:", wastePct + "%");

assert(wastePct < 15, "KV-cache memory waste kept under 15% (actual: " + wastePct + "%)");
assert(rejected === 0, "All concurrent requests admitted without OOM preemption");
assert(isVllm, "PagedAttention + Copy-on-Write prefix caching enabled");

emitMetric("KV Memory Waste", wastePct + "%", "fragmentation", wastePct < 15 ? "optimal" : "breaking");
emitMetric("Admitted Batch", admitted + " / " + requests.length, "active reqs", rejected === 0 ? "optimal" : "breaking");
emitMetric("Physical Blocks Used", allocatedBlocks + " / " + ENV.TOTAL_BLOCKS, "16-tok pages", "optimal");
emitMetric("Relative Throughput", throughputGain + "×", "vs static batch", isVllm ? "optimal" : "tradeoff");

emitArtifact("vLLM BlockTable Allocation Map", {
  mode: ENV.FAIL_MODE,
  block_size_tokens: BLOCK_SIZE,
  shared_cow_blocks: isVllm ? sharedBlocksCount : 0,
  physical_blocks_remaining: freePhysicalBlocks,
  block_tables: blockTables
});`,
    pythonBlueprint: `# Production vLLM PagedAttention BlockTable Allocator (Simplified Core)
from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class PhysicalBlock:
    block_id: int
    ref_count: int = 0
    prefix_hash: str | None = None

class PagedKVCacheAllocator:
    def __init__(self, num_gpu_blocks: int, block_size: int = 16):
        self.block_size = block_size
        self.free_blocks: List[int] = list(range(num_gpu_blocks))
        self.blocks: Dict[int, PhysicalBlock] = {i: PhysicalBlock(i) for i in range(num_gpu_blocks)}
        self.prefix_index: Dict[str, int] = {}

    def allocate_or_share(self, prefix_hash: str | None = None) -> int:
        # Copy-on-Write prefix cache hit: reuse physical block with zero recompute
        if prefix_hash and prefix_hash in self.prefix_index:
            blk_id = self.prefix_index[prefix_hash]
            self.blocks[blk_id].ref_count += 1
            return blk_id
        if not self.free_blocks:
            raise MemoryError("GPU KV pool exhausted — trigger continuous-batch preemption")
        blk_id = self.free_blocks.pop()
        self.blocks[blk_id].ref_count = 1
        self.blocks[blk_id].prefix_hash = prefix_hash
        if prefix_hash:
            self.prefix_index[prefix_hash] = blk_id
        return blk_id`
  },
  {
    id: 'lab-hybrid-rag-acl',
    number: '03',
    title: 'Zero-Trust Hybrid RAG (BM25 + Dense RRF + Tenant ACL Gate)',
    stageTag: 'Stage 05 & 10 · Enterprise RAG Security',
    runtimeProfile: 'ai-arch-venv-3.12 · Qdrant + Guardrails Sandbox',
    packages: ['qdrant-client', 'rank-bm25', 'pydantic>=2.9', 'langsmith'],
    summary:
      'Execute real Reciprocal Rank Fusion (RRF) across lexical BM25 and semantic vector lists, enforce server-side tenant ACL filtering before LLM prompt assembly, and verify citation membership.',
    architectGoal:
      'Prove fail-closed tenant isolation: unauthorized chunks from another tenant must NEVER enter the reranker or prompt context, and every generated citation must map to an authorized chunk ID.',
    whatToExperiment: [
      'Switch FAIL_MODE to "bypass_acl" to watch cross-tenant data leak into the prompt and trip the zero-trust assertion.',
      'Switch FAIL_MODE to "hallucinated_citation" to see how server-side citation verification catches fabricated sources.',
      'Adjust RRF_K (from 10 to 100) to see how rank fusion balances exact keyword hits vs. semantic matches.'
    ],
    mermaidDfd: `flowchart LR
  Q["Authenticated Query + JWT Tenant"] --> ACL["Mandatory Server ACL Filter"]
  ACL --> BM25["BM25 Lexical Top-K"]
  ACL --> VEC["Dense Vector Top-K"]
  BM25 --> RRF["Reciprocal Rank Fusion"]
  VEC --> RRF
  RRF --> VER["Grounded Answer + Citation Check"]`,
    envControls: [
      {
        key: 'TENANT_ID',
        label: 'Authenticated JWT Tenant',
        type: 'select',
        defaultValue: 'tenant_alpha',
        options: [
          { value: 'tenant_alpha', label: 'tenant_alpha (Authorized)' },
          { value: 'tenant_beta', label: 'tenant_beta (Different Org)' }
        ]
      },
      { key: 'RRF_K', label: 'RRF Smoothing Constant (k)', type: 'range', min: 10, max: 100, step: 10, defaultValue: 60 },
      {
        key: 'FAIL_MODE',
        label: 'Security Fault Injection',
        type: 'select',
        defaultValue: 'none',
        options: [
          { value: 'none', label: 'Strict Zero-Trust ACL + Citation Check' },
          { value: 'bypass_acl', label: 'Inject Bug: Skip Tenant ACL Filter' },
          { value: 'hallucinated_citation', label: 'Inject Bug: Unverified Citation [chunk_999]' }
        ]
      }
    ],
    executableCode: `// Deep Lab 03 — Zero-Trust Hybrid RAG (BM25 + Vector RRF + Citation Verification)
const corpus = [
  { id: "doc_a1", tenant: "tenant_alpha", title: "Refund Policy §4.2 (ERR-409)", bm25Rank: 1, vecRank: 2 },
  { id: "doc_a2", tenant: "tenant_alpha", title: "Enterprise SLA Credits",        bm25Rank: 3, vecRank: 1 },
  { id: "doc_b9", tenant: "tenant_beta",  title: "CONFIDENTIAL Beta M&A Terms",   bm25Rank: 2, vecRank: 1 },
  { id: "doc_a3", tenant: "tenant_alpha", title: "Billing Escalation Runbook",    bm25Rank: 4, vecRank: 3 }
];

const enforceAcl = ENV.FAIL_MODE !== 'bypass_acl';
console.log("Incoming Request | JWT Tenant:", ENV.TENANT_ID, "| ACL Enforcement:", enforceAcl ? "STRICT" : "BYPASSED!");

// Step 1: Server-side mandatory tenant filter BEFORE fusion or model context
const candidates = enforceAcl
  ? corpus.filter(doc => doc.tenant === ENV.TENANT_ID)
  : corpus;

// Step 2: Reciprocal Rank Fusion: score = 1/(k + bm25Rank) + 1/(k + vecRank)
const k = ENV.RRF_K;
const ranked = candidates
  .map(doc => ({
    ...doc,
    rrfScore: Number(((1 / (k + doc.bm25Rank)) + (1 / (k + doc.vecRank))).toFixed(5))
  }))
  .sort((a, b) => b.rrfScore - a.rrfScore);

const topContext = ranked.slice(0, 2);
const leakedChunks = topContext.filter(c => c.tenant !== ENV.TENANT_ID);

// Step 3: Grounded generation + deterministic citation membership check
const allowedIds = new Set(topContext.map(c => c.id));
const emittedCitations = ENV.FAIL_MODE === 'hallucinated_citation'
  ? [topContext[0]?.id ?? "doc_none", "chunk_999_fabricated"]
  : topContext.map(c => c.id);

const invalidCitations = emittedCitations.filter(cid => !allowedIds.has(cid));
const finalAction = invalidCitations.length > 0 ? "ABSTAIN_AND_LOG" : "RETURN_GROUNDED_ANSWER";

ranked.forEach((doc, idx) => {
  console.log("  #" + (idx + 1) + " [" + doc.id + "] (" + doc.tenant + ") RRF=" + doc.rrfScore + " — " + doc.title);
});
console.log("Emitted Citations:", JSON.stringify(emittedCitations), "| Invalid:", JSON.stringify(invalidCitations));
console.log("Gateway Decision:", finalAction);

assert(leakedChunks.length === 0, "Zero cross-tenant chunks entered LLM context");
assert(invalidCitations.length === 0, "100% of citations verified against authorized retrieved chunk IDs");
assert(topContext.length > 0, "At least one authorized chunk retrieved for tenant");

emitMetric("Cross-Tenant Leaks", leakedChunks.length, "chunks", leakedChunks.length === 0 ? "optimal" : "breaking");
emitMetric("Citation Precision", invalidCitations.length === 0 ? "100%" : "50%", "verified", invalidCitations.length === 0 ? "optimal" : "breaking");
emitMetric("Top RRF Score", topContext[0]?.rrfScore ?? 0, "k=" + k, "optimal");
emitMetric("Gateway Action", finalAction === "RETURN_GROUNDED_ANSWER" ? "SERVED" : "ABSTAINED", "", finalAction === "RETURN_GROUNDED_ANSWER" ? "optimal" : "tradeoff");

emitArtifact("Hybrid RRF Retrieval & Provenance Trace", {
  jwt_tenant: ENV.TENANT_ID,
  acl_enforced: enforceAcl,
  top_context: topContext,
  emitted_citations: emittedCitations,
  invalid_citations: invalidCitations,
  decision: finalAction
});`,
    pythonBlueprint: `# Production Zero-Trust Hybrid RAG Retrieval & Citation Gate
from typing import Iterable, List, Dict

def reciprocal_rank_fusion(
    dense_hits: List[Dict],
    bm25_hits: List[Dict],
    jwt_tenant_id: str,
    k: int = 60,
    top_n: int = 5,
) -> List[Dict]:
    # Fail-closed: verify every candidate matches server-derived JWT tenant
    scores: Dict[str, float] = {}
    docs: Dict[str, Dict] = {}
    for rank, hit in enumerate(dense_hits, start=1):
        if hit["tenant_id"] != jwt_tenant_id:
            continue
        scores[hit["id"]] = scores.get(hit["id"], 0.0) + 1.0 / (k + rank)
        docs[hit["id"]] = hit
    for rank, hit in enumerate(bm25_hits, start=1):
        if hit["tenant_id"] != jwt_tenant_id:
            continue
        scores[hit["id"]] = scores.get(hit["id"], 0.0) + 1.0 / (k + rank)
        docs[hit["id"]] = hit
    ordered = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:top_n]
    return [{**docs[doc_id], "rrf_score": round(score, 5)} for doc_id, score in ordered]

def verify_citations(cited_ids: Iterable[str], authorized_ids: set[str]) -> bool:
    return all(cid in authorized_ids for cid in cited_ids)`
  },
  {
    id: 'lab-durable-agent',
    number: '04',
    title: 'Durable Multi-Agent State Machine (Crash Recovery & Idempotency)',
    stageTag: 'Stage 06 & 08 · Durable Agent Orchestration',
    runtimeProfile: 'ai-arch-venv-3.12 · LangGraph / Temporal Sandbox',
    packages: ['langgraph', 'temporalio', 'pydantic', 'opentelemetry-sdk'],
    summary:
      'Execute a durable agent workflow that intentionally crashes mid-execution after calling an external refund API, resumes from its persisted checkpoint, and proves idempotency prevents double charges.',
    architectGoal:
      'Guarantee exactly-once external side effects across worker crashes and hard termination under step budgets so an agent can never double-charge a customer or enter an infinite retry loop.',
    whatToExperiment: [
      'Switch FAIL_MODE to "disable_idempotency" to watch crash replay charge/refund the customer TWICE and fail the financial safety assertion.',
      'Switch FAIL_MODE to "infinite_loop" to see how the deterministic MAX_STEPS budget terminates runaway tool loops safely.',
      'Change MAX_STEPS or inspect the persisted checkpoint ledger in the JSON artifact inspector.'
    ],
    mermaidDfd: `flowchart LR
  IN["Task + Step Budget"] --> PLAN["Bounded State Node"]
  PLAN --> IDEM["Idempotency Ledger Check"]
  IDEM --> TOOL["External Refund API"]
  TOOL --> CKPT["Persist Checkpoint"]
  CKPT --> RESUME["Crash-Safe Resume (0 Duplicates)"]`,
    envControls: [
      { key: 'MAX_STEPS', label: 'Hard Step Budget Cap', type: 'range', min: 2, max: 10, step: 1, defaultValue: 5, unit: 'steps' },
      { key: 'CRASH_AFTER_API', label: 'Simulate Worker Crash Before Ack', type: 'toggle', defaultValue: true },
      {
        key: 'FAIL_MODE',
        label: 'Fault Injection',
        type: 'select',
        defaultValue: 'none',
        options: [
          { value: 'none', label: 'Durable Checkpoints + Idempotency Key' },
          { value: 'disable_idempotency', label: 'Inject Bug: No Idempotency Key (Double Charge)' },
          { value: 'infinite_loop', label: 'Inject Bug: Stuck Agent Loop (Test Budget Cap)' }
        ]
      }
    ],
    executableCode: `// Deep Lab 04 — Durable Multi-Agent State Machine with Crash Recovery & Idempotency
const idempotencyLedger = new Map();
const checkpoints = [];
let externalRefundApiExecutions = 0;
let workerCrashes = 0;

function callExternalRefundApi(orderId, amountUsd, idemKey) {
  const useIdem = ENV.FAIL_MODE !== 'disable_idempotency';
  if (useIdem && idempotencyLedger.has(idemKey)) {
    console.log("  [Idempotency HIT] Returning cached receipt for " + idemKey + " (no duplicate API call)");
    return idempotencyLedger.get(idemKey);
  }
  externalRefundApiExecutions++;
  const receipt = { tx_id: "rf_" + externalRefundApiExecutions, order_id: orderId, amount_usd: amountUsd };
  if (useIdem) idempotencyLedger.set(idemKey, receipt);
  console.log("  [External API] Executed refund #" + externalRefundApiExecutions + " for $" + amountUsd);
  return receipt;
}

let state = { step: 0, status: "RUNNING", orderId: "ORD-8821", amountUsd: 149, receipt: null };
const idemKey = "refund:ORD-8821:v1";

function runWorkflow(attemptLabel) {
  console.log("--- " + attemptLabel + " (starting from step " + state.step + ") ---");
  while (state.status === "RUNNING") {
    if (state.step >= ENV.MAX_STEPS) {
      state.status = "BUDGET_TERMINATED";
      console.warn("Hard step budget (" + ENV.MAX_STEPS + ") reached — halting safely.");
      break;
    }
    state.step++;

    if (ENV.FAIL_MODE === 'infinite_loop') {
      console.warn("  Step " + state.step + ": Agent repeated search_order() with identical arguments...");
      continue;
    }

    if (state.step === 1) {
      checkpoints.push({ step: 1, node: "validate_policy_and_approval", approved: true });
      console.log("  Step 1: Policy & human approval verified. Checkpoint saved.");
    } else if (state.step === 2) {
      const receipt = callExternalRefundApi(state.orderId, state.amountUsd, idemKey);
      if (ENV.CRASH_AFTER_API && workerCrashes === 0) {
        workerCrashes++;
        state.step = 1; // Worker died BEFORE persisting step 2 checkpoint!
        console.error("  [CRASH] Worker killed by OOM right after external API call before checkpoint commit!");
        return "CRASHED";
      }
      state.receipt = receipt;
      checkpoints.push({ step: 2, node: "execute_refund", receipt });
      console.log("  Step 2: Checkpoint persisted with receipt " + receipt.tx_id);
    } else if (state.step === 3) {
      state.status = "COMPLETED";
      checkpoints.push({ step: 3, node: "notify_customer", done: true });
      console.log("  Step 3: Customer notified. Workflow COMPLETED.");
    }
  }
  return state.status;
}

const firstRun = runWorkflow("Worker Attempt #1");
if (firstRun === "CRASHED") {
  runWorkflow("Worker Attempt #2 (Durable Replay)");
}

assert(externalRefundApiExecutions <= 1, "External refund API executed at most ONCE (actual: " + externalRefundApiExecutions + ")");
assert(state.step <= ENV.MAX_STEPS, "Workflow respected hard step budget (" + state.step + " <= " + ENV.MAX_STEPS + ")");
assert(ENV.FAIL_MODE === 'infinite_loop' ? state.status === 'BUDGET_TERMINATED' : state.status === 'COMPLETED', "Terminal workflow state is deterministic (" + state.status + ")");

emitMetric("External Side Effects", externalRefundApiExecutions, "refund calls", externalRefundApiExecutions <= 1 ? "optimal" : "breaking");
emitMetric("Worker Crashes Survived", workerCrashes, "replays", "optimal");
emitMetric("Steps Consumed", state.step + " / " + ENV.MAX_STEPS, "budget", state.step < ENV.MAX_STEPS ? "optimal" : "tradeoff");
emitMetric("Final Status", state.status, "", state.status === "COMPLETED" ? "optimal" : "tradeoff");

emitArtifact("Durable Checkpoint & Idempotency Audit Log", {
  final_state: state,
  external_api_executions: externalRefundApiExecutions,
  checkpoints
});`,
    pythonBlueprint: `# Production Durable Agent Activity with Idempotency & Step Budget
from dataclasses import dataclass

@dataclass
class AgentBudget:
    max_steps: int = 5
    steps_used: int = 0

def execute_idempotent_refund(ledger: dict, idem_key: str, order_id: str, amount_usd: float) -> dict:
    # Check durable ledger BEFORE calling external payment provider
    if idem_key in ledger:
        return ledger[idem_key]
    receipt = payment_gateway.refund(order_id=order_id, amount=amount_usd, idempotency_key=idem_key)
    ledger[idem_key] = receipt
    checkpoint_store.commit(idem_key, receipt)
    return receipt`
  },
  {
    id: 'lab-chatgpt-claude-alignment',
    number: '05',
    title: 'ChatGPT & Claude Alignment Math (RLHF Reward, KL Penalty & Constitutional AI)',
    stageTag: 'Stage 04 & 10 · Frontier Post-Training Internals',
    runtimeProfile: 'ai-arch-venv-3.12 · Alignment & Reward Sandbox',
    packages: ['trl', 'peft', 'torch', 'anthropic-evals'],
    summary:
      'Compute live Bradley-Terry preference probabilities, KL-divergence reward-hacking penalties, and Constitutional AI self-critique scores across candidate model responses.',
    architectGoal:
      'Show mathematically why frontier models combine preference reward optimization with a KL-divergence anchor (beta) and written Constitutional critiques to avoid reward hacking and sycophancy.',
    whatToExperiment: [
      'Set FAIL_MODE to "zero_kl_reward_hack" to watch the policy drift away from coherent English while chasing a high raw reward score.',
      'Adjust KL_BETA (0.00 to 0.30) to see how KL regularization keeps policy outputs truthful and calibrated.',
      'Edit candidate response scores or add new Constitutional rules directly in the editor.'
    ],
    mermaidDfd: `flowchart LR
  SFT["Reference Policy π_ref"] --> GEN["Candidate Responses (y⁺, y⁻)"]
  GEN --> RM["Reward Model / AI Critique"]
  RM --> KL["KL Penalty: r - β·KL(π || π_ref)"]
  KL --> POL["Aligned Policy (Helpful, Honest, Harmless)"]`,
    envControls: [
      { key: 'KL_BETA', label: 'KL Penalty Coefficient (β)', type: 'range', min: 0, max: 0.3, step: 0.02, defaultValue: 0.1, unit: 'β' },
      { key: 'CONSTITUTIONAL_PASSES', label: 'Constitutional Revision Passes', type: 'range', min: 0, max: 3, step: 1, defaultValue: 2, unit: 'passes' },
      {
        key: 'FAIL_MODE',
        label: 'Training Regime',
        type: 'select',
        defaultValue: 'balanced',
        options: [
          { value: 'balanced', label: 'Calibrated RLHF / Constitutional AI' },
          { value: 'zero_kl_reward_hack', label: 'Inject Bug: β=0 (Reward Hacking Drift)' }
        ]
      }
    ],
    executableCode: `// Deep Lab 05 — RLHF Bradley-Terry Loss, KL Penalty & Constitutional AI Scoring
const beta = ENV.FAIL_MODE === 'zero_kl_reward_hack' ? 0 : ENV.KL_BETA;
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

const candidates = [
  { id: "resp_calibrated", rawReward: 2.15, klDiv: 0.85, constitutionalViolations: Math.max(0, 1 - ENV.CONSTITUTIONAL_PASSES), style: "Concise, cited, honest refusal on unsafe edge" },
  { id: "resp_reward_hack", rawReward: 2.75, klDiv: 14.2, constitutionalViolations: 2, style: "Verbose sycophantic fluff exploiting length bias" },
  { id: "resp_base_only",   rawReward: 0.40, klDiv: 0.10, constitutionalViolations: 3, style: "Raw web completion, ignores user instruction" }
];

console.log("Evaluating Alignment Objective: J(π) = Reward - β * KL(π || π_ref)");
console.log("Active β:", beta, "| Constitutional Critique Passes:", ENV.CONSTITUTIONAL_PASSES);

const scored = candidates.map(c => {
  const klPenalty = Number((beta * c.klDiv).toFixed(3));
  const constitutionalBonus = c.constitutionalViolations === 0 ? 0.45 : -0.35 * c.constitutionalViolations;
  const effectiveObjective = Number((c.rawReward - klPenalty + constitutionalBonus).toFixed(3));
  return { ...c, klPenalty, constitutionalBonus: Number(constitutionalBonus.toFixed(2)), effectiveObjective };
}).sort((a, b) => b.effectiveObjective - a.effectiveObjective);

const winner = scored[0];
const pairPrefProb = Number((sigmoid(candidates[0].rawReward - candidates[2].rawReward) * 100).toFixed(1));

scored.forEach((c, i) => {
  console.log("  #" + (i + 1) + " " + c.id.padEnd(17) + " | rawR=" + c.rawReward + " | KL_pen=-" + c.klPenalty + " | CAI=" + c.constitutionalBonus + " => obj=" + c.effectiveObjective);
});

assert(winner.id === "resp_calibrated", "Calibrated truthful response beats reward-hacked verbose response");
assert(beta > 0, "Non-zero KL penalty prevents policy collapse / reward hacking");
assert(winner.constitutionalViolations === 0, "Winning response satisfies all Constitutional AI principles");

emitMetric("Selected Policy", winner.id === "resp_calibrated" ? "CALIBRATED" : "REWARD HACKED", "", winner.id === "resp_calibrated" ? "optimal" : "breaking");
emitMetric("Winning Objective", winner.effectiveObjective, "J(π)", winner.id === "resp_calibrated" ? "optimal" : "breaking");
emitMetric("Preference Prob", pairPrefProb + "%", "P(y⁺ > y⁻)", "optimal");
emitMetric("KL Drift Guard", beta.toFixed(2), "β", beta > 0 ? "optimal" : "breaking");

emitArtifact("Post-Training Alignment Ranking", { beta, constitutional_passes: ENV.CONSTITUTIONAL_PASSES, ranked_candidates: scored });`,
    pythonBlueprint: `# Production RLHF / DPO + Constitutional Critique Objective (PyTorch)
import torch
import torch.nn.functional as F

def dpo_alignment_loss(
    policy_chosen_logps: torch.Tensor,
    policy_rejected_logps: torch.Tensor,
    ref_chosen_logps: torch.Tensor,
    ref_rejected_logps: torch.Tensor,
    beta: float = 0.1,
) -> torch.Tensor:
    # Implicit KL-regularized preference optimization (no separate reward model required)
    pi_logratios = policy_chosen_logps - policy_rejected_logps
    ref_logratios = ref_chosen_logps - ref_rejected_logps
    logits = beta * (pi_logratios - ref_logratios)
    return -F.logsigmoid(logits).mean()`
  },
  {
    id: 'lab-claude-architect-finops',
    number: '06',
    title: 'Master Claude Architect Gateway (XML Prompt Caching + Tiered Model Router)',
    stageTag: 'Stage 09–12 · Master Claude Architect Playbook',
    runtimeProfile: 'ai-arch-venv-3.12 · Anthropic FinOps & MCP Gateway',
    packages: ['anthropic>=0.42', 'fastmcp', 'pydantic', 'prometheus-client'],
    summary:
      'Run a production Claude Architect request router that separates Haiku / Sonnet / Opus traffic by complexity, applies 90% XML Prompt Caching discounts, and audits MCP tool permissions.',
    architectGoal:
      'Prove how Principal Claude Architects slash monthly LLM bills by 60–80% while raising reliability: static XML prefix caching + complexity routing + server-side MCP scopes.',
    whatToExperiment: [
      'Switch FAIL_MODE to "opus_for_everything" to see monthly spend skyrocket 4×+ with zero routing discipline.',
      'Switch FAIL_MODE to "cache_busting_timestamp" to see how putting Date.now() at line 1 of a system prompt destroys 90% prompt cache savings!',
      'Adjust CACHE_HIT_PCT and MONTHLY_REQ_K to model your real enterprise budget.'
    ],
    mermaidDfd: `flowchart LR
  IN["User Task"] --> CLS["Complexity Classifier"]
  CLS -->|Simple 65%| HK["Claude Haiku (Fast/Low Cost)"]
  CLS -->|Build 28%| SN["Claude Sonnet (Core Workhorse)"]
  CLS -->|Deep 7%| OP["Claude Opus (Hard Architecture)"]
  HK & SN & OP --> CACHE["XML Prompt Cache (90% Read Discount)"]
  CACHE --> MCP["Server-Side MCP Policy Gate"]`,
    envControls: [
      { key: 'MONTHLY_REQ_K', label: 'Monthly Volume (thousands)', type: 'range', min: 100, max: 2000, step: 100, defaultValue: 600, unit: 'k reqs' },
      { key: 'CACHE_HIT_PCT', label: 'XML Prefix Cache Hit Rate', type: 'range', min: 0, max: 95, step: 5, defaultValue: 85, unit: '%' },
      {
        key: 'FAIL_MODE',
        label: 'Architecture Pattern',
        type: 'select',
        defaultValue: 'master_architect',
        options: [
          { value: 'master_architect', label: 'Master Architect (Router + XML Cache)' },
          { value: 'opus_for_everything', label: 'Anti-Pattern: Opus for All Traffic' },
          { value: 'cache_busting_timestamp', label: 'Anti-Pattern: Dynamic Timestamp at Line 1' }
        ]
      }
    ],
    executableCode: `// Deep Lab 06 — Master Claude Architect FinOps Router & XML Prompt Cache Simulator
const totalRequests = ENV.MONTHLY_REQ_K * 1000;
const prefixTokens = 4500;  // Stable XML <role> + <policy> + <tool_schemas>
const dynamicInputTok = 500;
const outputTok = 600;

// Illustrative per-1M token pricing ($) across model tiers
const PRICING = {
  haiku:  { in: 0.80,  cacheRead: 0.08, out: 4.00 },
  sonnet: { in: 3.00,  cacheRead: 0.30, out: 15.00 },
  opus:   { in: 15.00, cacheRead: 1.50, out: 75.00 }
};

const routing = ENV.FAIL_MODE === 'opus_for_everything'
  ? { haiku: 0.0, sonnet: 0.0, opus: 1.0 }
  : { haiku: 0.65, sonnet: 0.28, opus: 0.07 };

const effectiveCacheHit = ENV.FAIL_MODE === 'cache_busting_timestamp' ? 0 : ENV.CACHE_HIT_PCT / 100;

if (ENV.FAIL_MODE === 'cache_busting_timestamp') {
  console.warn("[Cache Buster Detected] Placing dynamic timestamp at top of system prompt invalidated 100% of prompt cache!");
}

function monthlyTierCost(share, tier) {
  const reqs = totalRequests * share;
  const cachedPrefixM = (reqs * prefixTokens * effectiveCacheHit) / 1e6;
  const uncachedPrefixM = (reqs * prefixTokens * (1 - effectiveCacheHit)) / 1e6;
  const dynInM = (reqs * dynamicInputTok) / 1e6;
  const outM = (reqs * outputTok) / 1e6;
  return cachedPrefixM * tier.cacheRead + (uncachedPrefixM + dynInM) * tier.in + outM * tier.out;
}

const costHaiku  = monthlyTierCost(routing.haiku,  PRICING.haiku);
const costSonnet = monthlyTierCost(routing.sonnet, PRICING.sonnet);
const costOpus   = monthlyTierCost(routing.opus,   PRICING.opus);
const totalMonthlyUsd = Math.round(costHaiku + costSonnet + costOpus);

// Naive uncached Opus baseline for exact savings calculation
const naiveBaselineUsd = Math.round(
  (totalRequests * (prefixTokens + dynamicInputTok) / 1e6) * PRICING.opus.in +
  (totalRequests * outputTok / 1e6) * PRICING.opus.out
);
const savingsPct = Math.round((1 - totalMonthlyUsd / naiveBaselineUsd) * 100);

console.log("Monthly Volume:", totalRequests.toLocaleString(), "requests | Effective Cache Hit:", Math.round(effectiveCacheHit * 100) + "%");
console.log("Tier Breakdown => Haiku: $" + Math.round(costHaiku).toLocaleString() + " | Sonnet: $" + Math.round(costSonnet).toLocaleString() + " | Opus: $" + Math.round(costOpus).toLocaleString());
console.log("Total Monthly Spend: $" + totalMonthlyUsd.toLocaleString() + " vs Naive Baseline $" + naiveBaselineUsd.toLocaleString() + " (-" + savingsPct + "%)");

assert(effectiveCacheHit >= 0.7, "Stable XML prefix achieves >= 70% prompt cache hit rate");
assert(routing.opus <= 0.15, "Opus reserved for <= 15% hardest architectural queries");
assert(savingsPct >= 60, "Architecture cuts spend by >= 60% vs naive frontier baseline");

emitMetric("Monthly Spend", "$" + totalMonthlyUsd.toLocaleString(), "USD/mo", savingsPct >= 60 ? "optimal" : "breaking");
emitMetric("FinOps Savings", savingsPct + "%", "vs naive Opus", savingsPct >= 60 ? "optimal" : "breaking");
emitMetric("Prompt Cache Hit", Math.round(effectiveCacheHit * 100) + "%", "90% read discount", effectiveCacheHit >= 0.7 ? "optimal" : "breaking");
emitMetric("Tier Mix", Math.round(routing.haiku*100) + "/" + Math.round(routing.sonnet*100) + "/" + Math.round(routing.opus*100), "H/S/O %", routing.opus <= 0.15 ? "optimal" : "tradeoff");

emitArtifact("Claude Architect FinOps & Routing Report", {
  pattern: ENV.FAIL_MODE,
  monthly_requests: totalRequests,
  effective_cache_hit_pct: Math.round(effectiveCacheHit * 100),
  monthly_spend_usd: totalMonthlyUsd,
  naive_baseline_usd: naiveBaselineUsd,
  savings_pct: savingsPct,
  tier_usd: { haiku: Math.round(costHaiku), sonnet: Math.round(costSonnet), opus: Math.round(costOpus) }
});`,
    pythonBlueprint: `# Production Claude Architect Gateway — XML Prompt Caching + Tier Router
from anthropic import Anthropic

client = Anthropic()

def route_model(task_complexity: str) -> str:
    return {
        "classify_or_extract": "claude-haiku-4-5",
        "code_or_rag": "claude-sonnet-4-5",
        "deep_architecture": "claude-opus-4-5",
    }.get(task_complexity, "claude-sonnet-4-5")

def call_claude_cached(static_xml_policy: str, user_query: str, complexity: str):
    # Static XML block stays byte-identical (no timestamps!) so cache_control hits 90% discount
    return client.messages.create(
        model=route_model(complexity),
        max_tokens=1024,
        system=[{
            "type": "text",
            "text": static_xml_policy,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{"role": "user", "content": f"<user_request>{user_query}</user_request>"}],
    )`
  },
  {
    id: 'lab-train-mini-llm',
    number: '07',
    title: 'Train a Mini-LLM From Scratch (Untrained → Pretrained Live Backprop)',
    stageTag: 'Stage 03–04 · Untrained vs. Pretrained Mechanics',
    runtimeProfile: 'ai-arch-venv-3.12 · Live Gradient Descent & Next-Token LM',
    packages: ['torch==2.5', 'numpy', 'tiktoken', 'wandb'],
    summary:
      'Watch real cross-entropy loss and gradient descent transform an untrained bigram/neural language model (random weights = uniform gibberish) into a trained model predicting coherent next tokens.',
    architectGoal:
      'See mathematically what "training" actually does inside an LLM: updating weight matrices via backprop gradients to minimize cross-entropy loss -log P(next_token) across epochs.',
    whatToExperiment: [
      'Set TRAIN_EPOCHS to 0 to inspect a completely UNTRAINED model (random weights, high perplexity, gibberish sampling).',
      'Raise TRAIN_EPOCHS to 60 and watch cross-entropy loss collapse and exact next-token probability soar above 85%.',
      'Set LEARNING_RATE to 3.5 (way too high) to observe gradient explosion / unstable training!'
    ],
    mermaidDfd: `flowchart LR
  CORP["Text Corpus"] --> TOK["Token IDs [t₀..tₙ]"]
  TOK --> LOGITS["Untrained Random Weights W"]
  LOGITS --> LOSS["Cross-Entropy Loss -log P(t+1)"]
  LOSS --> GRAD["Backprop Gradients ∂L/∂W"]
  GRAD --> STEP["Optimizer Step: W ← W - η·∂L/∂W"]
  STEP --> GEN["Trained Next-Token Prediction"]`,
    envControls: [
      { key: 'TRAIN_EPOCHS', label: 'Training Epochs (0 = Untrained)', type: 'range', min: 0, max: 80, step: 10, defaultValue: 50, unit: 'epochs' },
      { key: 'LEARNING_RATE', label: 'Learning Rate (η)', type: 'range', min: 0.05, max: 3.5, step: 0.15, defaultValue: 0.5, unit: 'lr' },
      {
        key: 'STAGE_MODE',
        label: 'Model Stage',
        type: 'select',
        defaultValue: 'pretrained',
        options: [
          { value: 'pretrained', label: 'Run Training Loop (SGD Backprop)' },
          { value: 'untrained', label: 'Force Untrained (Frozen Random Weights)' }
        ]
      }
    ],
    executableCode: `// Deep Lab 07 — Live Mini-LLM Training Loop: Untrained Random Weights -> Pretrained Model
const vocab = ["ai", "engineers", "build", "reliable", "llm", "systems", "with", "evals"];
const trainingPairs = [
  [0, 1], // ai -> engineers
  [1, 2], // engineers -> build
  [2, 3], // build -> reliable
  [3, 4], // reliable -> llm
  [4, 5], // llm -> systems
  [5, 6], // systems -> with
  [6, 7]  // with -> evals
];
const V = vocab.length;

// 1. Initialize UNTRAINED weight matrix W [V x V] with tiny deterministic random noise
const W = Array.from({ length: V }, (_, r) =>
  Array.from({ length: V }, (__, c) => Number((((((r * 7 + c * 13) % 11) - 5) * 0.04)).toFixed(4)))
);

const softmax = (logits) => {
  const m = Math.max(...logits);
  const exps = logits.map(x => Math.exp(x - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
};

function evalLossAndTopProb() {
  let lossSum = 0;
  let probSum = 0;
  for (const [x, y] of trainingPairs) {
    const probs = softmax(W[x]);
    const py = Math.max(probs[y], 1e-9);
    lossSum += -Math.log(py);
    probSum += py;
  }
  return {
    loss: Number((lossSum / trainingPairs.length).toFixed(4)),
    avgTargetProb: Number(((probSum / trainingPairs.length) * 100).toFixed(1))
  };
}

const untrainedEval = evalLossAndTopProb();
const effectiveEpochs = ENV.STAGE_MODE === 'untrained' ? 0 : ENV.TRAIN_EPOCHS;
const lr = ENV.LEARNING_RATE;
const lossHistory = [{ epoch: 0, loss: untrainedEval.loss }];

console.log("[Epoch 0 — UNTRAINED] Cross-Entropy Loss:", untrainedEval.loss, "| Avg Target Prob:", untrainedEval.avgTargetProb + "%");

// 2. Real Self-Supervised Next-Token Backpropagation Loop
for (let epoch = 1; epoch <= effectiveEpochs; epoch++) {
  for (const [x, y] of trainingPairs) {
    const probs = softmax(W[x]);
    // Exact analytical gradient of Cross-Entropy + Softmax: dL/dW[x][j] = probs[j] - 1(j === y)
    for (let j = 0; j < V; j++) {
      const grad = probs[j] - (j === y ? 1 : 0);
      W[x][j] -= lr * grad;
    }
  }
  if (epoch % 10 === 0 || epoch === effectiveEpochs) {
    const snap = evalLossAndTopProb();
    lossHistory.push({ epoch, loss: snap.loss });
    console.log("[Epoch " + epoch + "] Loss:", snap.loss, "| Avg Target Next-Token Prob:", snap.avgTargetProb + "%");
  }
}

const finalEval = evalLossAndTopProb();
const perplexity = Number(Math.exp(finalEval.loss).toFixed(2));

// 3. Autoregressively generate a 7-token continuation from prompt "ai"
let cur = 0;
const generated = [vocab[cur]];
for (let step = 0; step < 7; step++) {
  const probs = softmax(W[cur]);
  let bestIdx = 0;
  for (let j = 1; j < V; j++) if (probs[j] > probs[bestIdx]) bestIdx = j;
  generated.push(vocab[bestIdx]);
  cur = bestIdx;
}

const isTrainedWell = finalEval.loss < 0.6 && Number.isFinite(finalEval.loss);
console.log("Generated Sequence from 'ai':", generated.join(" "));

assert(Number.isFinite(finalEval.loss), "Training remained numerically stable (no NaN/Inf gradient explosion)");
assert(effectiveEpochs > 0, "Model underwent gradient-descent pretraining (> 0 epochs)");
assert(isTrainedWell, "Trained loss dropped below 0.60 (Untrained " + untrainedEval.loss + " -> Final " + finalEval.loss + ")");

emitMetric("Untrained Loss", untrainedEval.loss, "ln(V)≈2.08", "tradeoff");
emitMetric("Final Loss", finalEval.loss, "cross-entropy", isTrainedWell ? "optimal" : "breaking");
emitMetric("Perplexity", perplexity, "exp(loss)", perplexity < 2.0 ? "optimal" : "breaking");
emitMetric("Target Token Prob", finalEval.avgTargetProb + "%", "confidence", finalEval.avgTargetProb > 70 ? "optimal" : "breaking");

emitArtifact("Untrained vs. Trained Comparison & Loss Curve", {
  untrained_baseline: untrainedEval,
  final_model: { epochs: effectiveEpochs, learning_rate: lr, ...finalEval, perplexity },
  generated_text: generated.join(" "),
  loss_curve: lossHistory
});`,
    pythonBlueprint: `# Production PyTorch Self-Supervised Next-Token Pretraining Step
import torch
import torch.nn.functional as F

def pretrain_step(model, optimizer, input_ids: torch.Tensor):
    # Shift sequence by 1 token: input tokens [0..T-2] predict target tokens [1..T-1]
    x = input_ids[:, :-1]
    targets = input_ids[:, 1:]

    logits = model(x)  # Shape: [Batch, SeqLen, VocabSize]
    loss = F.cross_entropy(logits.reshape(-1, logits.size(-1)), targets.reshape(-1))

    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
    optimizer.step()
    return loss.item()`
  },
  {
    id: 'lab-ml-models-algorithms',
    number: '08',
    title: 'ML Model Families & Learning Algorithms Live Benchmark',
    stageTag: 'Stage 01–04 · ML Models & Algorithms',
    runtimeProfile: 'ai-arch-venv-3.12 · Scikit-Learn + PyTorch Sandbox',
    packages: ['scikit-learn', 'xgboost', 'torch', 'numpy'],
    summary:
      'Execute a live comparison of Linear Regression, Decision Tree / GBDT, K-Means Clustering, and a Neural/LLM Classifier on real numeric fixtures to understand when each ML model family wins.',
    architectGoal:
      'Prove the core Architect Rule: never blindly throw a 70B LLM at a structured tabular problem that XGBoost solves in 0.4ms for 1/10,000th the cost—match the ML model to the data structure.',
    whatToExperiment: [
      'Switch TASK_TYPE between "tabular_fraud", "unlabeled_segments", and "unstructured_policy_qa" to see which ML model family wins.',
      'Adjust NONLINEAR_NOISE to watch Linear models degrade while Tree/Neural models adapt.',
      'Edit the scoring weights or decision threshold right in the editor and re-run.'
    ],
    mermaidDfd: `flowchart LR
  DATA["Raw Data"] --> TYPE{"Data Modality & Labels?"}
  TYPE -->|Labeled Tabular| GBDT["Linear / XGBoost (Supervised)"]
  TYPE -->|Unlabeled Vectors| KM["K-Means / PCA (Unsupervised)"]
  TYPE -->|Text / Code / Reasoning| LLM["Pretrained Transformer LLM (Self-Supervised + RLHF)"]`,
    envControls: [
      {
        key: 'TASK_TYPE',
        label: 'Business Problem Type',
        type: 'select',
        defaultValue: 'tabular_fraud',
        options: [
          { value: 'tabular_fraud', label: 'Labeled Tabular Fraud Detection (SQL rows)' },
          { value: 'unlabeled_segments', label: 'Unlabeled Customer Segmentation' },
          { value: 'unstructured_policy_qa', label: 'Unstructured Policy Q&A + Code Synthesis' }
        ]
      },
      { key: 'NONLINEARITY', label: 'Feature Non-Linearity Level', type: 'range', min: 1, max: 10, step: 1, defaultValue: 7 },
      { key: 'NEED_EXPLAINABILITY', label: 'Strict Regulatory Explainability Required', type: 'toggle', defaultValue: true }
    ],
    executableCode: `// Deep Lab 08 — Live ML Model Families & Learning Algorithm Selector + Mini-Training Run
// Runs real 1D linear gradient descent + K-Means centroid update + architect model recommendation!
const samples = [
  { x: 1, y: 2.1 }, { x: 2, y: 4.3 }, { x: 3, y: 5.8 }, { x: 4, y: 8.2 }, { x: 5, y: 9.9 }
];

// A. Supervised Linear Model (Gradient Descent)
let w = 0.0, b = 0.0;
for (let step = 0; step < 40; step++) {
  let dw = 0, db = 0;
  for (const s of samples) {
    const err = (w * s.x + b) - s.y;
    dw += (2 / samples.length) * err * s.x;
    db += (2 / samples.length) * err;
  }
  w -= 0.03 * dw;
  b -= 0.03 * db;
}
const linearMse = Number((samples.reduce((acc, s) => acc + Math.pow((w * s.x + b) - s.y, 2), 0) / samples.length).toFixed(4));

// B. Unsupervised K-Means (2 clusters on 1D customer spend)
const spends = [12, 18, 22, 145, 160, 178];
let c1 = 15, c2 = 150;
for (let iter = 0; iter < 5; iter++) {
  const g1 = spends.filter(v => Math.abs(v - c1) <= Math.abs(v - c2));
  const g2 = spends.filter(v => Math.abs(v - c1) > Math.abs(v - c2));
  c1 = g1.reduce((a, v) => a + v, 0) / g1.length;
  c2 = g2.reduce((a, v) => a + v, 0) / g2.length;
}

// C. Architect Model Selection Matrix based on ENV
const candidates = [
  {
    model: "Logistic / Linear Model",
    paradigm: "Supervised",
    score: ENV.TASK_TYPE === 'tabular_fraud' ? Math.max(55, 92 - ENV.NONLINEARITY * 3) + (ENV.NEED_EXPLAINABILITY ? 10 : 0) : 25,
    latencyMs: 0.2,
    costPer1M: "$0.01"
  },
  {
    model: "Gradient Boosted Trees (XGBoost / LightGBM)",
    paradigm: "Supervised",
    score: ENV.TASK_TYPE === 'tabular_fraud' ? 96 + (ENV.NEED_EXPLAINABILITY ? 3 : 0) : 30,
    latencyMs: 1.5,
    costPer1M: "$0.08"
  },
  {
    model: "K-Means / HDBSCAN + PCA",
    paradigm: "Unsupervised",
    score: ENV.TASK_TYPE === 'unlabeled_segments' ? 94 : 20,
    latencyMs: 2.0,
    costPer1M: "$0.05"
  },
  {
    model: "Pretrained Transformer LLM (Claude / GPT / vLLM)",
    paradigm: "Self-Supervised + RLHF/CAI",
    score: ENV.TASK_TYPE === 'unstructured_policy_qa' ? 97 : (ENV.TASK_TYPE === 'tabular_fraud' ? 52 : 45),
    latencyMs: 650,
    costPer1M: "$3.00–$15.00"
  }
].sort((a, b) => b.score - a.score);

const winner = candidates[0];
console.log("[Supervised Linear Fit] y = " + w.toFixed(2) + "x + " + b.toFixed(2) + " | MSE=" + linearMse);
console.log("[Unsupervised K-Means] Converged Centroids => Cluster A: $" + c1.toFixed(1) + " | Cluster B: $" + c2.toFixed(1));
console.log("[Architect Recommendation for " + ENV.TASK_TYPE + "] => " + winner.model + " (" + winner.paradigm + ")");

assert(linearMse < 0.25, "Supervised linear regression converged (MSE=" + linearMse + " < 0.25)");
assert(Math.abs(c2 - c1) > 100, "Unsupervised K-Means separated low-spend vs high-spend clusters cleanly");
assert(winner.score >= 90, "Selected optimal ML model family for " + ENV.TASK_TYPE);

emitMetric("Recommended Model", winner.model.split(" ")[0], winner.paradigm, "optimal");
emitMetric("Inference Latency", winner.latencyMs + " ms", "p50", winner.latencyMs < 50 ? "optimal" : "tradeoff");
emitMetric("Linear GD Fit MSE", linearMse, "y≈2x", linearMse < 0.25 ? "optimal" : "breaking");
emitMetric("K-Means Centroids", "$" + c1.toFixed(0) + " / $" + c2.toFixed(0), "2 clusters", "optimal");

emitArtifact("ML Model Families Ranked Benchmark", {
  task: ENV.TASK_TYPE,
  linear_fit: { weight: Number(w.toFixed(3)), bias: Number(b.toFixed(3)), mse: linearMse },
  kmeans_centroids: [Number(c1.toFixed(1)), Number(c2.toFixed(1))],
  ranked_models: candidates
});`,
    pythonBlueprint: `# Production ML Model Selection: Tabular XGBoost vs. Pretrained LLM
from xgboost import XGBClassifier
from sklearn.cluster import KMeans

# 1. Labeled Tabular Data -> Supervised Gradient Boosted Trees (Fast, Cheap, Explainable)
fraud_model = XGBClassifier(n_estimators=200, max_depth=6, learning_rate=0.05)

# 2. Unlabeled Data -> Unsupervised Clustering
segmenter = KMeans(n_clusters=5, n_init="auto", random_state=42)

# 3. Unstructured Text / Code / Reasoning -> Pretrained Transformer LLM (via RAG + Evals)`
  }
]
