import type { Lesson } from './curriculum'

export interface AtlasScaleMetric {
  label: string
  value: string
  note: string
}

export interface AtlasStageEvolution {
  stageNum: number
  title: string
  stageGoal: string
  howItWorks: [string, string]
  mermaid: string
  nodeLabels: Record<string, string>
  architecturalRule: string
  breaksUnderLoad?: string
}

export interface AtlasSlipItem {
  boldMistake: string
  failureUnderLoad: string
  fix: string
}

export interface AtlasComparisonRow {
  option: string
  throughput: string
  latency: string
  complexity: string
  failureMode: string
}

export interface AtlasInterviewQuote {
  prompt: string
  quote: string
}

export interface AtlasLessonBlueprint {
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced' | 'Staff / Principal'
  readMinutes: number
  conceptPills: string[]
  anchor: {
    title: string
    analogy: string
    scaleMetrics: AtlasScaleMetric[]
  }
  scopeBoundary: {
    inScope: string[]
    outOfScope: string[]
  }
  stages: AtlasStageEvolution[]
  whereCandidatesSlip: AtlasSlipItem[]
  comparisonTable: {
    title: string
    rows: AtlasComparisonRow[]
  }
  interviewQuotes: AtlasInterviewQuote[]
}

const CLASS_DEFS = `
    classDef hot fill:#0C253A,stroke:#38BDF8,stroke-width:1.8px,color:#F0F9FF
    classDef ctrl fill:#1B1C42,stroke:#818CF8,stroke-width:1.8px,color:#EEF2FF
    classDef out fill:#0B2B25,stroke:#34D399,stroke-width:1.8px,color:#ECFDF5
    classDef warn fill:#361E14,stroke:#F59E0B,stroke-width:1.8px,color:#FEF3C7
    classDef danger fill:#3B1222,stroke:#F43F5E,stroke-width:1.8px,color:#FFE4E6`

function cleanMermaidLabel(text: string, maxLen = 30): string {
  const sanitized = text
    .replace(/["`[\](){}<>#;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (sanitized.length <= maxLen) return sanitized
  return `${sanitized.slice(0, maxLen - 1).trim()}...`
}

function getSlug(lessonId: string): string {
  const parts = lessonId.split(':')
  return parts.length > 1 ? parts[1] : lessonId
}

/* ============================================================================
   BESPOKE FLAGSHIP BLUEPRINTS (ENGINEERING ATLAS EDITORIAL STANDARD)
   ============================================================================ */
const FLAGSHIP_BLUEPRINTS: Record<string, AtlasLessonBlueprint> = {
  attention: {
    difficulty: 'Advanced',
    readMinutes: 14,
    conceptPills: ['Q/K/V Projections', 'O(N^2) HBM Wall', 'GQA KV Compression', 'FlashAttention Tiling'],
    anchor: {
      title: 'A Trading Desk Reading Every Past Order Ticket in One Hop',
      analogy:
        'A decoder reads a 128,000-token contract by matching its current token query against every prior token key in parallel. Unlike an RNN that compresses history into one fixed vector, attention pulls exact bytes from any past position—until quadratic HBM traffic stalls the GPU.',
      scaleMetrics: [
        { label: 'Attention Grid (128K ctx)', value: '16.4B cells / head', note: '32.8 GB in FP16 per layer if materialized' },
        { label: '70B KV Footprint (GQA-8)', value: '320 KB / token', note: '40.9 GB HBM consumed by one 128K session' },
        { label: 'H100 HBM3 Bandwidth', value: '3.35 TB/s ceiling', note: 'Single-batch decode stalls at 1 FLOP/byte' },
        { label: 'Target Decode ITL', value: '< 35 ms p99', note: '28+ tokens/sec steady streaming pace' }
      ]
    },
    scopeBoundary: {
      inScope: [
        'Scaled dot-product Q/K/V matrix flow, causal masking, and multi-head splitting',
        'Autoregressive KV caching, Grouped-Query Attention (GQA), and SRAM-tiled FlashAttention',
        'Paged virtual KV block tables that stop HBM fragmentation under concurrent traffic'
      ],
      outOfScope: [
        'Multi-node NVLink ring-attention collectives across 8+ GPU hosts',
        'Hand-tuned CUDA warp-group PTX assembly instructions'
      ]
    },
    stages: [
      {
        stageNum: 1,
        title: 'Single-Head Scaled Dot-Product Attention',
        stageGoal:
          'Connect every token to every earlier token in one parallel pass while blocking future leakage.',
        howItWorks: [
          'Input embeddings X (N x d) enter three linear projections that emit Q, K, and V tensors. The core engine multiplies Q by K-transpose and divides every score by sqrt(d_k).',
          'A lower-triangular mask overwrites future positions with -infinity before row-wise softmax runs. Multiplying the resulting weights by V emits one context vector per token.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      X["Embeddings X (N x d)"]:::hot
      MASK["Causal Mask"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      PROJ["Project Wq, Wk, Wv"]:::hot
      DOT["QK^T / sqrt(dk)"]:::warn
      SM["Row Softmax"]:::ctrl
    end
    subgraph OUT["Outcomes (Right)"]
      CTX["Context Matrix"]:::out
    end
    X --> PROJ --> DOT --> SM --> CTX
    MASK --> DOT${CLASS_DEFS}`,
        nodeLabels: {
          X: 'Embeddings X',
          MASK: 'Causal Mask',
          PROJ: 'Linear Projections',
          DOT: 'Scaled Dot Product',
          SM: 'Row Softmax',
          CTX: 'Context Matrix'
        },
        architecturalRule:
          'Dividing QK^T by sqrt(d_k) locks dot-product variance at 1.0 so softmax gradients never vanish to zero.',
        breaksUnderLoad:
          'One head blends syntax and coreference into a single average. Worse, generating N tokens recomputes K and V for all prior tokens at every step—inflating decode cost from O(N^2) to O(N^3).'
      },
      {
        stageNum: 2,
        title: 'Multi-Head Projections + Autoregressive KV Cache',
        stageGoal:
          'Track distinct linguistic subspaces in parallel and stop recomputing past K/V tensors during token generation.',
        howItWorks: [
          'The incoming token x_t splits across H parallel attention heads so each head attends to a separate subspace. The runtime projects only the single new token into q_t, k_t, and v_t.',
          'The engine appends k_t and v_t into a GPU HBM buffer holding all prior steps. It then multiplies q_t against the full cached K matrix and emits the next hidden state.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      XT["New Token x_t"]:::hot
      HBM["HBM KV Cache"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      MHA["H Head Projections"]:::hot
      APP["Append k_t, v_t"]:::ctrl
      ATTN["q_t * K_cache^T"]:::warn
      WO["Concat + Wo"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      HID["Next Token State"]:::out
    end
    XT --> MHA --> APP --> ATTN --> WO --> HID
    HBM --> APP
    HBM --> ATTN${CLASS_DEFS}`,
        nodeLabels: {
          XT: 'New Token x_t',
          HBM: 'HBM KV Cache',
          MHA: 'H Head Projections',
          APP: 'Cache Append',
          ATTN: 'Cached Attention',
          WO: 'Output Projection',
          HID: 'Next Token State'
        },
        architecturalRule:
          'Appending k_t and v_t to HBM cuts decode compute to O(N) per token, shifting the bottleneck from FLOPs to HBM bytes.',
        breaksUnderLoad:
          'Serving 64 concurrent users at 32K context on a 70B MHA model demands >160 GB of KV cache alone. HBM fills up, forcing batch size down to 1 and crashing throughput.'
      },
      {
        stageNum: 3,
        title: 'Grouped-Query Attention (GQA) Bandwidth Compression',
        stageGoal:
          'Cut KV cache memory footprint and HBM read traffic by 8x without hurting reasoning quality.',
        howItWorks: [
          'The projection layer emits 64 query heads but only 8 shared key-value heads. Each KV head maps directly to a dedicated group of 8 query heads.',
          'During decode, the kernel streams 8x fewer KV bytes from HBM3 into GPU registers and broadcasts each KV pair across its query group. Residual RMSNorm outputs the updated hidden tensor.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      Q64["64 Query Heads"]:::hot
      KV8["8 Shared KV Heads"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      GRP["Group Broadcast (8:1)"]:::ctrl
      DOT["Fused GQA Kernel"]:::hot
      NORM["RMSNorm + Residual"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      B8["8x Larger Batch"]:::out
      ITL["< 35ms Decode ITL"]:::out
    end
    Q64 --> GRP --> DOT --> NORM --> B8
    KV8 --> GRP
    NORM --> ITL${CLASS_DEFS}`,
        nodeLabels: {
          Q64: '64 Query Heads',
          KV8: '8 Shared KV Heads',
          GRP: '8:1 Group Broadcast',
          DOT: 'Fused GQA Kernel',
          NORM: 'RMSNorm + Residual',
          B8: '8x Larger Batch',
          ITL: 'Low Decode ITL'
        },
        architecturalRule:
          'Sharing one KV head across eight query heads cuts HBM decode traffic by 8x while matching full MHA perplexity.',
        breaksUnderLoad:
          'Contiguous pre-allocated KV buffers still waste 60%–80% of VRAM on unused max-length padding. Meanwhile, 128K-token prefills still crash HBM when materializing the full N x N matrix.'
      },
      {
        stageNum: 4,
        title: 'IO-Aware FlashAttention (On-Chip SRAM Tiling)',
        stageGoal:
          'Compute exact 128K-token prefill attention in O(N) HBM memory by never writing N x N weights to global RAM.',
        howItWorks: [
          'A block scheduler slices Q, K, and V from 3.35 TB/s HBM into small tiles that fit inside 19 TB/s on-chip SRAM. Each streaming multiprocessor computes block dot products locally.',
          'An online softmax loop tracks running row maxima and rescaling factors across tiles inside SRAM. Only the final context block writes back to HBM once.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      HBM["HBM Q, K, V (3.35 TB/s)"]:::ctrl
      TILE["Tile Scheduler"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      SRAM["On-Chip SRAM (19 TB/s)"]:::hot
      SOFT["Online Softmax Rescale"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      EXACT["Exact Output O(N) HBM"]:::out
      TTFT["3.4x Faster Prefill"]:::out
    end
    HBM --> TILE --> SRAM --> SOFT --> EXACT
    SOFT --> TTFT${CLASS_DEFS}`,
        nodeLabels: {
          HBM: 'HBM Q, K, V',
          TILE: 'Tile Scheduler',
          SRAM: 'On-Chip SRAM Compute',
          SOFT: 'Online Softmax',
          EXACT: 'O(N) Exact Output',
          TTFT: '3.4x Faster Prefill'
        },
        architecturalRule:
          'FlashAttention computes exact attention inside fast on-chip SRAM tiles so the quadratic N x N matrix never touches slow HBM.',
        breaksUnderLoad:
          'Even with SRAM tiling and GQA, variable-length concurrent sessions fragment physical HBM slabs—dropping max concurrency whenever long and short prompts mix on one GPU.'
      },
      {
        stageNum: 5,
        title: 'PagedAttention Virtual KV Block Tables',
        stageGoal:
          'Eliminate external HBM fragmentation and deduplicate shared system prompts across concurrent users.',
        howItWorks: [
          'Incoming tokens map through a logical Block Table that allocates fixed 16-token physical KV pages on demand from a global free pool. Zero contiguous space is pre-reserved.',
          'Identical system-prompt prefixes hash to the same read-only physical blocks via copy-on-write. The paged FlashAttention kernel reads scattered physical pages directly and streams tokens under 35 ms ITL.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      REQ["Concurrent Prompts"]:::hot
      HASH["Prefix Hash Index"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      BT["Virtual KV Block Table"]:::ctrl
      POOL["16-Token Physical Pages"]:::hot
      KERN["Paged FlashAttention"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      WASTE["< 4% VRAM Waste"]:::out
      SLO["P99 ITL < 35ms"]:::out
    end
    REQ --> HASH --> BT --> POOL --> KERN --> WASTE
    KERN --> SLO${CLASS_DEFS}`,
        nodeLabels: {
          REQ: 'Concurrent Prompts',
          HASH: 'Prefix Hash Index',
          BT: 'Virtual KV Block Table',
          POOL: '16-Token KV Pages',
          KERN: 'Paged FlashAttention',
          WASTE: '< 4% VRAM Waste',
          SLO: 'P99 ITL < 35ms'
        },
        architecturalRule:
          'Virtualizing KV tensors into 16-token non-contiguous pages drops VRAM waste below 4% and turns shared prefixes into zero-copy cache hits.'
      }
    ],
    whereCandidatesSlip: [
      {
        boldMistake: 'Blaming GPU FLOPs for decode.',
        failureUnderLoad:
          'Batch-1 decode hits 1 FLOP/byte while H100 needs 295 FLOPs/byte, leaving tensor cores 95% idle waiting on HBM reads.',
        fix: 'Separate compute-bound Prefill from memory-bandwidth-bound Decode in every capacity calculation.'
      },
      {
        boldMistake: 'Skipping the sqrt(d_k) variance proof.',
        failureUnderLoad:
          'Unscaled dot products grow with variance d_k, pushing softmax logits into saturated tails where gradients collapse to zero.',
        fix: 'State that Var(q·k) = d_k for unit inputs, so dividing by sqrt(d_k) restores unit variance.'
      },
      {
        boldMistake: 'Calling FlashAttention a lossy approximation.',
        failureUnderLoad:
          'Claiming FlashAttention drops precision signals you misunderstand online softmax rescaling and IO-aware SRAM tiling.',
        fix: 'Emphasize that FlashAttention produces mathematically identical output while eliminating quadratic HBM reads/writes.'
      }
    ],
    comparisonTable: {
      title: 'Attention Memory & Bandwidth Trade-Offs (70B Model, 32K Context)',
      rows: [
        { option: 'Standard MHA', throughput: '1.0x baseline', latency: 'High decode ITL', complexity: 'Low', failureMode: 'KV cache OOM at small batch sizes' },
        { option: 'Multi-Query (MQA)', throughput: '6.5x batch', latency: 'Lowest ITL', complexity: 'Low', failureMode: 'Quality degradation on complex reasoning' },
        { option: 'Grouped-Query (GQA-8)', throughput: '5.8x batch', latency: 'Near-MQA ITL', complexity: 'Medium', failureMode: 'External fragmentation without paging' },
        { option: 'FlashAttention + Paged GQA', throughput: '10x+ clustered', latency: '3.4x faster TTFT', complexity: 'High', failureMode: 'Hardware-specific kernel tuning (SM80/SM90)' }
      ]
    },
    interviewQuotes: [
      {
        prompt: 'When asked why LLM decoding is slow:',
        quote:
          '"Autoregressive decode is memory-bandwidth bound, not compute bound. We stream gigabytes of KV cache from HBM just to produce one token, which is why GQA and FP8 KV quantization directly lift throughput."'
      },
      {
        prompt: 'When asked how FlashAttention speeds up long contexts:',
        quote:
          '"FlashAttention computes exact attention inside 19 TB/s on-chip SRAM tiles using online softmax rescaling, so the N x N matrix never hits 3.35 TB/s HBM."'
      },
      {
        prompt: 'When asked how to maximize concurrent users per GPU:',
        quote:
          '"Pair GQA with PagedAttention 16-token block tables and prefix hashing—that drops KV fragmentation from 70% to under 4% and avoids recomputing shared system prompts."'
      }
    ]
  },

  retrieval: {
    difficulty: 'Intermediate',
    readMinutes: 12,
    conceptPills: ['BM25 + Dense Hybrid', 'Reciprocal Rank Fusion', 'ACL Pre-Filtering', 'Cross-Encoder Rerank'],
    anchor: {
      title: 'An ER Triage Desk Pairing Barcode Scans With Clinical Intuition',
      analogy:
        'A dense vector index acts like a veteran clinician matching vague symptoms to diagnoses, while BM25 acts like a barcode scanner locking onto exact error codes like ERR_4092_TLS. Production retrieval runs both paths in parallel, filters permissions before ranking, and reranks top candidates before the LLM ever sees a token.',
      scaleMetrics: [
        { label: 'Indexed Corpus', value: '50M chunks (180 GB)', note: '1536-dim FP16 HNSW + inverted BM25' },
        { label: 'Retrieval P95 Budget', value: '< 140 ms end-to-end', note: '45 ms hybrid fan-out + 75 ms reranker' },
        { label: 'Throughput Target', value: '1,200 QPS peak', note: 'Multi-tenant enterprise search tier' },
        { label: 'Recall@10 Lift', value: '+24% over vector-only', note: 'Measured on exact-ID + paraphrase golden set' }
      ]
    },
    scopeBoundary: {
      inScope: [
        'Dense HNSW vector search, sparse BM25 lexical search, and Reciprocal Rank Fusion (RRF)',
        'Mandatory tenant ACL pre-filtering prior to top-K truncation',
        'Two-stage cross-encoder reranking, abstention thresholds, and semantic cache isolation'
      ],
      outOfScope: [
        'Contrastive InfoNCE bi-encoder weight training from scratch',
        'PDF OCR bounding-box extraction and visual layout parsing'
      ]
    },
    stages: [
      {
        stageNum: 1,
        title: 'Naive Single-Vector Top-K Lookup',
        stageGoal:
          'Fetch the 5 most semantically similar document chunks for an incoming user question in under 35 ms.',
        howItWorks: [
          'The API encodes the raw user query through a bi-encoder into a 1536-dimensional float vector. It queries an HNSW vector index for the 5 nearest cosine neighbors.',
          'The orchestrator concatenates those 5 chunk strings directly into the LLM prompt template and streams back an answer.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      Q["User Query"]:::hot
    end
    subgraph CORE["Core Engine (Center)"]
      EMB["Bi-Encoder (1536-d)"]:::hot
      ANN["HNSW Top-5 Search"]:::warn
    end
    subgraph OUT["Outcomes (Right)"]
      CTX["5 Chunks to LLM"]:::out
    end
    Q --> EMB --> ANN --> CTX${CLASS_DEFS}`,
        nodeLabels: {
          Q: 'User Query',
          EMB: 'Bi-Encoder',
          ANN: 'HNSW Top-5',
          CTX: 'Prompt Context'
        },
        architecturalRule:
          'Dense embeddings capture paraphrased intent but blur exact error codes, SKUs, and contract clause numbers.',
        breaksUnderLoad:
          'When users search "Policy 14.2b" or "SKU-8841", vector cosine similarity pulls topically similar wrong clauses. Recall@5 drops below 45% and the LLM hallucinates over wrong evidence.'
      },
      {
        stageNum: 2,
        title: 'Parallel Hybrid Search + Reciprocal Rank Fusion',
        stageGoal:
          'Capture exact lexical identifiers and semantic paraphrases together without brittle score normalization.',
        howItWorks: [
          'The gateway fans out the query in parallel to an inverted BM25 index (top 50) and an HNSW vector index (top 50). Both lookups complete inside a single 45 ms window.',
          'An RRF merger ignores raw scores and sums 1 / (60 + rank) across both lists. It outputs a unified top-40 candidate pool sorted by reciprocal rank.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      Q["User Query"]:::hot
    end
    subgraph CORE["Core Engine (Center)"]
      BM25["Sparse BM25 Top-50"]:::hot
      VEC["Dense HNSW Top-50"]:::hot
      RRF["RRF Merger (k=60)"]:::ctrl
    end
    subgraph OUT["Outcomes (Right)"]
      POOL["Merged Top-40 Pool"]:::out
    end
    Q --> BM25 --> RRF
    Q --> VEC --> RRF
    RRF --> POOL${CLASS_DEFS}`,
        nodeLabels: {
          Q: 'User Query',
          BM25: 'Sparse BM25',
          VEC: 'Dense HNSW',
          RRF: 'RRF Merger',
          POOL: 'Merged Top-40 Pool'
        },
        architecturalRule:
          'Rank-only RRF merges unbounded BM25 scores and bounded cosine distances cleanly without per-query calibration drift.',
        breaksUnderLoad:
          'In multi-tenant SaaS, filtering user permissions after fetching top-40 results drops all 40 chunks whenever restricted executive documents outrank allowed files—returning empty answers or leaking existence.'
      },
      {
        stageNum: 3,
        title: 'ACL-Before-Ranking Security Pre-Filtering',
        stageGoal:
          'Guarantee zero cross-tenant leakage while keeping full top-K recall for restricted enterprise roles.',
        howItWorks: [
          'The gateway verifies the caller JWT and extracts immutable tenant_id and role_group claims. It compiles those claims into a mandatory pre-filter bitmap.',
          'Both BM25 and HNSW evaluate the ACL predicate inside graph traversal before ranking. Only authorized chunks enter RRF, yielding a strictly tenant-safe top-30 pool.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      Q["User Query"]:::hot
      JWT["Verified JWT + ACLs"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      ACL["Pre-Filter Predicate"]:::ctrl
      BM25["Scoped BM25"]:::hot
      VEC["Scoped HNSW"]:::hot
      RRF["RRF Merger"]:::ctrl
    end
    subgraph OUT["Outcomes (Right)"]
      SAFE["Authorized Top-30"]:::out
    end
    JWT --> ACL
    Q --> BM25 --> RRF
    Q --> VEC --> RRF
    ACL --> BM25
    ACL --> VEC
    RRF --> SAFE${CLASS_DEFS}`,
        nodeLabels: {
          Q: 'User Query',
          JWT: 'Verified JWT + ACLs',
          ACL: 'Pre-Filter Predicate',
          BM25: 'Scoped BM25',
          VEC: 'Scoped HNSW',
          RRF: 'RRF Merger',
          SAFE: 'Authorized Top-30'
        },
        architecturalRule:
          'Enforce tenant ACLs inside the search index before top-K truncation—never via post-filtering or LLM prompt instructions.',
        breaksUnderLoad:
          'Bi-encoders score query and chunk independently, so the top-30 pool still mixes direct answers with loosely related distractors that trigger lost-in-the-middle hallucinations.'
      },
      {
        stageNum: 4,
        title: 'Batched Cross-Encoder Reranking & Abstention Gate',
        stageGoal:
          'Lift Precision@5 by scoring query-chunk pairs jointly and refuse to answer when evidence is weak.',
        howItWorks: [
          'A GPU cross-encoder reads the query concatenated with each of the 30 authorized chunks in one 75 ms batch. Full self-attention scores exact entailment between question and evidence.',
          'A deterministic gate compares the top reranker score against tau_min (0.55). Passing queries forward top-5 cited chunks to the LLM; failing queries return a safe abstention immediately.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      SAFE["Authorized Top-30"]:::hot
      TAU["Threshold tau=0.55"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      XENC["Cross-Encoder (75ms)"]:::hot
      GATE{"Top Score >= tau?"}:::ctrl
    end
    subgraph OUT["Outcomes (Right)"]
      TOP5["Cited Top-5 Context"]:::out
      ABS["Safe Abstention"]:::warn
    end
    SAFE --> XENC --> GATE
    TAU --> GATE
    GATE -->|Pass| TOP5
    GATE -->|Fail| ABS${CLASS_DEFS}`,
        nodeLabels: {
          SAFE: 'Authorized Top-30',
          TAU: 'Calibrated Threshold',
          XENC: 'Cross-Encoder Rerank',
          GATE: 'Abstention Gate',
          TOP5: 'Cited Top-5 Context',
          ABS: 'Safe Abstention'
        },
        architecturalRule:
          'Pair fast Recall@30 bi-encoders with a batched cross-encoder and calibrated abstention gate to kill hallucinations before generation starts.',
        breaksUnderLoad:
          'At 1,200 QPS peak, running GPU cross-encoders on repeated identical enterprise FAQs saturates GPU pools and blows past the 140 ms P95 latency budget.'
      },
      {
        stageNum: 5,
        title: 'Tenant-Scoped Semantic Cache & Dual-Write Index Migration',
        stageGoal:
          'Absorb 40% repeat QPS in under 8 ms while supporting zero-downtime embedding model upgrades.',
        howItWorks: [
          'Every incoming query first hashes (tenant_id, acl_group_hash, index_version, query_vec) against a tenant-isolated Redis semantic cache. High-confidence hits (>0.96 cosine) bypass retrieval and reranking completely.',
          'Cache misses execute the ACL hybrid + cross-encoder pipeline against the active blue/green index alias, write back with a 15-minute TTL, and log Recall/MRR telemetry.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      Q["Query + Tenant Hash"]:::hot
      ALIAS["Active Index Alias"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      CACHE{"Tenant Cache Hit?"}:::ctrl
      PIPE["Hybrid + Rerank"]:::hot
      EVAL["Async Recall Telemetry"]:::ctrl
    end
    subgraph OUT["Outcomes (Right)"]
      FAST["8ms Cached Answer"]:::out
      FRESH["135ms Fresh Cited"]:::out
    end
    Q --> CACHE
    CACHE -->|Hit| FAST
    CACHE -->|Miss| PIPE --> FRESH
    ALIAS --> PIPE
    PIPE --> EVAL${CLASS_DEFS}`,
        nodeLabels: {
          Q: 'Query + Tenant Hash',
          ALIAS: 'Blue/Green Index Alias',
          CACHE: 'Tenant Semantic Cache',
          PIPE: 'Hybrid + Rerank Spine',
          EVAL: 'Recall Telemetry',
          FAST: '8ms Cache Hit',
          FRESH: 'Fresh Cited Context'
        },
        architecturalRule:
          'Key semantic caches by tenant_id, ACL group hash, and index version so cache hits never leak data across permissions or stale indexes.'
      }
    ],
    whereCandidatesSlip: [
      {
        boldMistake: 'Adding raw BM25 and cosine.',
        failureUnderLoad:
          'Unbounded BM25 scores (0–40) swamp bounded cosine scores (-1 to 1), silently turning hybrid search into keyword-only search.',
        fix: 'Merge via Reciprocal Rank Fusion (RRF) or apply per-query min-max normalization before weighting.'
      },
      {
        boldMistake: 'Post-filtering ACLs after top-K search.',
        failureUnderLoad:
          'When restricted documents dominate top-40 scores, post-filtering discards every candidate and returns zero evidence to authorized users.',
        fix: 'Push verified tenant_id and role predicates directly into BM25 and HNSW pre-filters.'
      },
      {
        boldMistake: 'Sharing semantic cache across tenants.',
        failureUnderLoad:
          'A cached answer generated from HR-only documents serves verbatim to an intern asking a similar question.',
        fix: 'Include tenant_id, ACL entitlement hash, and embedding version in every cache lookup key.'
      }
    ],
    comparisonTable: {
      title: 'Retrieval Stack Performance Comparison (50M Chunk Corpus)',
      rows: [
        { option: 'Dense Vector Only', throughput: '2,200 QPS', latency: '28 ms p95', complexity: 'Low', failureMode: 'Drops exact SKUs, codes, and policy IDs' },
        { option: 'Hybrid BM25 + HNSW (RRF)', throughput: '1,650 QPS', latency: '48 ms p95', complexity: 'Medium', failureMode: 'Distractor noise hurts top-5 faithfulness' },
        { option: 'ACL Hybrid + Cross-Encoder', throughput: '620 QPS', latency: '125 ms p95', complexity: 'High', failureMode: 'Reranker GPU queue spikes under burst QPS' },
        { option: 'Tenant-Cached Full Stack', throughput: '1,450 QPS', latency: '8 ms / 135 ms', complexity: 'High', failureMode: 'Stale answers if TTL outlives doc deletes' }
      ]
    },
    interviewQuotes: [
      {
        prompt: 'When asked why vector search alone fails in enterprise RAG:',
        quote:
          '"Dense embeddings blur exact identifiers like SKU codes or clause numbers. I pair BM25 and HNSW in parallel and fuse them with RRF so we get high recall on both exact tokens and paraphrases."'
      },
      {
        prompt: 'When asked how to prevent RAG cross-tenant data leaks:',
        quote:
          '"Never rely on prompt instructions or post-filtering. Push verified JWT tenant and ACL predicates into the vector and BM25 pre-filters before top-K ranking, and include the ACL hash in every cache key."'
      },
      {
        prompt: 'When asked how to stop hallucinations on missing docs:',
        quote:
          '"Run a batched cross-encoder over the top 30 candidates and enforce a calibrated abstention threshold—if the top score falls below tau_min, return a deterministic refusal without calling the LLM."'
      }
    ]
  },

  serving: {
    difficulty: 'Staff / Principal',
    readMinutes: 15,
    conceptPills: ['Continuous Batching', 'PagedAttention', 'Prefix Caching', 'Disaggregated Prefill'],
    anchor: {
      title: 'An Airport Runway Separating Heavy Cargo Takeoffs From Rapid Landings',
      analogy:
        'LLM inference mixes compute-heavy prompt Prefill (launching a loaded cargo jet) with bandwidth-bound token Decode (landing tiny commuter planes one by one). Static batching traps fast 50-token chats behind one 4,000-token essay—idling 65% of your $30,000 GPU.',
      scaleMetrics: [
        { label: 'Continuous Batch Gain', value: '8x–23x throughput', note: 'Eliminates static padding & EOS wait bubbles' },
        { label: 'Paged KV Overhead', value: '< 4% memory waste', note: 'Down from 60%–80% contiguous slab waste' },
        { label: 'Interactive SLO Budget', value: 'TTFT < 400ms · ITL < 35ms', note: 'Smooth real-time SSE token delivery' },
        { label: 'Cluster Capacity (8xH100)', value: '3,900+ tok/sec FP8', note: '70B model with disaggregated prefill/decode' }
      ]
    },
    scopeBoundary: {
      inScope: [
        'Iteration-level continuous batching vs static request batching',
        'PagedAttention non-contiguous KV pages and zero-copy prefix caching',
        'Chunked prefill, admission control, and disaggregated prefill/decode worker pools'
      ],
      outOfScope: [
        'Training-time ZeRO-3 / FSDP optimizer state sharding',
        'InfiniBand switch fabric hardware topology cabling'
      ]
    },
    stages: [
      {
        stageNum: 1,
        title: 'Static Request Batching With Contiguous KV Slabs',
        stageGoal:
          'Serve 8 concurrent user prompts on a single GPU node using standard PyTorch generation.',
        howItWorks: [
          'The API buffers incoming prompts until 8 arrive, pads every prompt to the longest length, and allocates contiguous max_seq_len KV slabs in HBM.',
          'The GPU runs forward steps until the slowest sequence emits EOS. Only then do all 8 responses flush back to waiting clients.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      Q["Prompt Queue"]:::hot
    end
    subgraph CORE["Core Engine (Center)"]
      PAD["Static Pad to Max"]:::warn
      SLAB["Contiguous KV (70% Waste)"]:::danger
      GPU["Lockstep GPU Loop"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      RESP["Delayed Burst Output"]:::out
    end
    Q --> PAD --> SLAB --> GPU --> RESP${CLASS_DEFS}`,
        nodeLabels: {
          Q: 'Prompt Queue',
          PAD: 'Static Padding',
          SLAB: 'Contiguous KV Slabs',
          GPU: 'Lockstep GPU Loop',
          RESP: 'Delayed Responses'
        },
        architecturalRule:
          'Static batching ties every user latency to the longest generation in the batch while contiguous KV slabs waste 70% of VRAM.',
        breaksUnderLoad:
          'One 4,000-token code answer holds 7 completed 40-token chats hostage for 30 seconds, spiking queue wait times and triggering 504 timeouts.'
      },
      {
        stageNum: 2,
        title: 'Iteration-Level Continuous Batching',
        stageGoal:
          'Evict finished sequences on the exact next token step and admit queued requests immediately.',
        howItWorks: [
          'The scheduler selects active sequences at every single GPU forward iteration instead of per batch. Each step emits one token per active user over SSE.',
          'The moment sequence #3 emits EOS, the scheduler releases its slot and injects a waiting prompt on the very next pass.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      WAIT["Waiting Queue"]:::hot
      ACT["Active Sequences"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      SCHED["Iteration Scheduler"]:::ctrl
      STEP["1-Token GPU Step"]:::hot
      EOS{"Emitted EOS?"}:::ctrl
    end
    subgraph OUT["Outcomes (Right)"]
      SSE["Live SSE Tokens"]:::out
      FREE["Instant Slot Reclaim"]:::out
    end
    WAIT --> SCHED
    ACT --> SCHED --> STEP --> EOS
    EOS -->|Yes| FREE
    EOS -->|No| ACT
    STEP --> SSE${CLASS_DEFS}`,
        nodeLabels: {
          WAIT: 'Waiting Queue',
          ACT: 'Active Sequences',
          SCHED: 'Iteration Scheduler',
          STEP: '1-Token GPU Step',
          EOS: 'EOS Check',
          SSE: 'SSE Token Stream',
          FREE: 'Instant Slot Reclaim'
        },
        architecturalRule:
          'Iteration-level scheduling removes head-of-line blocking between short and long answers, lifting effective throughput 6x.',
        breaksUnderLoad:
          'Variable sequence lengths still fragment contiguous HBM allocations—forcing premature request preemption whenever free memory breaks into unusable gaps.'
      },
      {
        stageNum: 3,
        title: 'PagedAttention + Automatic Prefix Caching',
        stageGoal:
          'Pack 4x more concurrent sessions into VRAM and skip recomputing identical 8K system prompts.',
        howItWorks: [
          'The memory manager partitions HBM into fixed 16-token physical KV blocks tracked by a per-request Block Table. Prompts claim pages lazily as they grow.',
          'An automatic prefix cache hashes completed prompt blocks. Incoming requests sharing the same system instructions attach read-only pointers in O(1) time, slashing TTFT by 70%.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      REQ["Prompt + Shared Prefix"]:::hot
      HASH["Prefix Block Hasher"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      BT["Virtual Block Table"]:::ctrl
      PAGES["16-Token KV Pages"]:::hot
      KERN["PagedAttention Kernel"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      CONC["4x Concurrent Batch"]:::out
      TTFT["70% Lower TTFT"]:::out
    end
    REQ --> HASH --> BT --> PAGES --> KERN --> CONC
    HASH --> TTFT${CLASS_DEFS}`,
        nodeLabels: {
          REQ: 'Prompt + Prefix',
          HASH: 'Prefix Hasher',
          BT: 'Virtual Block Table',
          PAGES: '16-Token KV Pages',
          KERN: 'PagedAttention Kernel',
          CONC: '4x Concurrency',
          TTFT: '70% Lower TTFT'
        },
        architecturalRule:
          'Fixed-size KV paging reduces VRAM waste below 4% and converts repeated system prompts into zero-copy O(1) cache hits.',
        breaksUnderLoad:
          'When a 32K-token RAG prompt enters prefill on the same GPU serving 40 live decode streams, it monopolizes tensor cores for 600 ms—visibly freezing every user stream.'
      },
      {
        stageNum: 4,
        title: 'Chunked Prefill Interleaving',
        stageGoal:
          'Keep live decode ITL under 35 ms even when 32K-token prompts arrive mid-burst.',
        howItWorks: [
          'The scheduler slices every long incoming prompt into 512-token prefill chunks instead of running all 32K tokens in one blocking call.',
          'Each GPU iteration packs one 512-token prefill chunk alongside all 40 active 1-token decode steps, saturating both tensor cores and memory bandwidth without stalling live streams.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      LONG["32K Prompt Stream"]:::hot
      DEC["40 Active Decodes"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      SLICE["512-Token Chunk Slicer"]:::ctrl
      MIX["Hybrid Prefill+Decode Step"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      SMOOTH["Steady < 35ms ITL"]:::out
      UTIL["88% GPU Compute Util"]:::out
    end
    LONG --> SLICE --> MIX --> SMOOTH
    DEC --> MIX --> UTIL${CLASS_DEFS}`,
        nodeLabels: {
          LONG: '32K Prompt Stream',
          DEC: '40 Active Decodes',
          SLICE: '512-Token Slicer',
          MIX: 'Mixed GPU Iteration',
          SMOOTH: 'Steady < 35ms ITL',
          UTIL: 'High Compute Util'
        },
        architecturalRule:
          'Piggybacking 512-token prefill chunks onto decode iterations absorbs compute headroom without causing 500 ms streaming stalls.',
        breaksUnderLoad:
          'At massive multi-node scale (1,000+ QPS) with 128K-token contexts, coupling prefill and decode on identical GPU pools prevents independent scaling of TTFT vs ITL.'
      },
      {
        stageNum: 5,
        title: 'Disaggregated Prefill/Decode Pools + Token Admission Control',
        stageGoal:
          'Scale TTFT and ITL independently across dedicated GPU pools and shed overload gracefully before OOM.',
        howItWorks: [
          'A prefix-aware router checks live KV-cache watermarks and rejects excess traffic cleanly with HTTP 429 + Retry-After before queues explode. Admitted prompts route to compute-optimized Prefill nodes.',
          'Prefill nodes compute the KV blocks once and push them over RDMA/NVLink to bandwidth-optimized Decode nodes, which stream tokens steadily under 25 ms ITL.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      ROUTER["Prefix-Aware Router"]:::ctrl
      ADMIT["KV Watermark Gate"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      PRE["Prefill GPU Pool"]:::hot
      RDMA["RDMA KV Transfer"]:::ctrl
      DEC["Decode GPU Pool"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      SLO["160ms TTFT · 24ms ITL"]:::out
      SHED["Fast 429 Load Shed"]:::warn
    end
    ROUTER --> ADMIT
    ADMIT -->|Admit| PRE --> RDMA --> DEC --> SLO
    ADMIT -->|Full| SHED${CLASS_DEFS}`,
        nodeLabels: {
          ROUTER: 'Prefix-Aware Router',
          ADMIT: 'Admission Control',
          PRE: 'Prefill GPU Pool',
          RDMA: 'RDMA KV Transfer',
          DEC: 'Decode GPU Pool',
          SLO: 'Protected TTFT & ITL',
          SHED: '429 Load Shedding'
        },
        architecturalRule:
          'Disaggregating prefill and decode lets you scale compute-bound TTFT and bandwidth-bound ITL on independent GPU fleets.'
      }
    ],
    whereCandidatesSlip: [
      {
        boldMistake: 'Autoscaling LLMs on GPU utilization.',
        failureUnderLoad:
          'KV cache hits 98% and starts evicting live sessions while GPU compute sits at 40%, causing severe thrashing before new pods boot.',
        fix: 'Autoscale on KV cache utilization %, pending token queue depth, and P95 TTFT burn rate.'
      },
      {
        boldMistake: 'Serving unbatched 64K prefills inline.',
        failureUnderLoad:
          'One 64K prompt locks the GPU for 1.2 seconds, freezing every concurrent user stream on the same replica.',
        fix: 'Enable chunked prefill (512–1024 tokens) or split prefill onto dedicated workers.'
      },
      {
        boldMistake: 'Shipping INT4 without tool-call evals.',
        failureUnderLoad:
          'Aggressive weight quantization passes WikiText perplexity checks but quietly doubles JSON schema errors in agent tool loops.',
        fix: 'Gate every FP8/INT4 checkpoint against production structured-output and RAG faithfulness benchmarks.'
      }
    ],
    comparisonTable: {
      title: 'Serving Architecture Benchmarks (70B FP8 on 8xH100)',
      rows: [
        { option: 'Static PyTorch Batch', throughput: '120 tok/s', latency: '4.2s TTFT · 140ms ITL', complexity: 'Low', failureMode: 'Head-of-line blocking + 70% VRAM waste' },
        { option: 'Continuous + PagedAttention', throughput: '1,850 tok/s', latency: '380ms TTFT · 42ms ITL', complexity: 'Medium', failureMode: 'Prefill bursts inject decode jitter' },
        { option: 'Chunked Prefill + Prefix Cache', throughput: '2,600 tok/s', latency: '210ms TTFT · 31ms ITL', complexity: 'Medium-High', failureMode: 'Shared pool ties TTFT and ITL scaling' },
        { option: 'Disaggregated Prefill/Decode', throughput: '3,900+ tok/s', latency: '160ms TTFT · 24ms ITL', complexity: 'High', failureMode: 'RDMA network saturation if link undersized' }
      ]
    },
    interviewQuotes: [
      {
        prompt: 'When asked how vLLM achieves 10x+ throughput over naive serving:',
        quote:
          '"Two mechanics drive almost all the gain: iteration-level continuous batching eliminates waiting on the slowest sequence, and PagedAttention cuts KV memory waste from 70% down to under 4%."'
      },
      {
        prompt: 'When asked how to stop long prompts from stuttering live chats:',
        quote:
          '"Turn on chunked prefill to interleave 512-token prompt slices with decode batches, and at higher scale disaggregate prefill and decode onto separate GPU pools linked via RDMA."'
      },
      {
        prompt: 'When asked what metric triggers LLM autoscaling:',
        quote:
          '"Never autoscale on raw GPU utilization—trigger scale-out on KV cache occupancy above 75%, waiting queue depth, and P95 TTFT burn rate."'
      }
    ]
  },

  'agent-loop': {
    difficulty: 'Intermediate',
    readMinutes: 13,
    conceptPills: ['Bounded Harness', 'Typed Tool Contracts', 'Idempotency Keys', 'Durable Checkpoints'],
    anchor: {
      title: 'Air Traffic Control Governing an Autonomous Pilot With Fuel Caps',
      analogy:
        'An LLM inside an agent loop acts like a pilot proposing maneuvers, while your deterministic harness acts as Air Traffic Control. The model inspects radar and proposes a tool call, but ATC validates schema clearance, enforces hard fuel caps, and checkpoints every leg so a dropped radio never triggers duplicate writes.',
      scaleMetrics: [
        { label: 'Hard Turn & Spend Cap', value: 'Max 10 steps / $0.25', note: 'Circuit breaker stops infinite retry loops' },
        { label: 'External Tool Latency', value: '65%–75% of wall time', note: 'APIs dominate total run duration, not LLM' },
        { label: 'Duplicate Write Rate', value: '0% with idempotency', note: 'Key = hash(run_id, step_id, payload)' },
        { label: 'Checkpoint Commit Cost', value: '< 12 ms Postgres write', note: 'Zero lost steps across pod restarts' }
      ]
    },
    scopeBoundary: {
      inScope: [
        'Observe-Reason-Act-Verify state machine with hard step, time, and token budgets',
        'Separating probabilistic LLM tool proposals from deterministic harness validation',
        'Idempotent external mutations, human approval interrupts, and durable context compaction'
      ],
      outOfScope: [
        'Cross-company Agent2Agent (A2A) federated task negotiation',
        'Reinforcement learning (GRPO/RLHF) of native tool-calling weights'
      ]
    },
    stages: [
      {
        stageNum: 1,
        title: 'Naive Unbounded While-Loop Agent',
        stageGoal:
          'Let an LLM invoke tools repeatedly until it decides the task is complete.',
        howItWorks: [
          'The script pushes the user goal into a messages array and calls the LLM. Whenever the model emits a tool_call block, the script invokes that Python function directly.',
          'The raw return string appends to the messages array and loops back to the LLM until a plain text answer appears.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      GOAL["User Task"]:::hot
    end
    subgraph CORE["Core Engine (Center)"]
      LLM["LLM Next Action"]:::hot
      EXEC["Direct Tool Call"]:::warn
      HIST["Unbounded History"]:::danger
    end
    subgraph OUT["Outcomes (Right)"]
      ANS["Final Answer"]:::out
    end
    GOAL --> LLM --> EXEC --> HIST --> LLM
    LLM --> ANS${CLASS_DEFS}`,
        nodeLabels: {
          GOAL: 'User Task',
          LLM: 'LLM Reasoning',
          EXEC: 'Direct Tool Call',
          HIST: 'Unbounded History',
          ANS: 'Final Answer'
        },
        architecturalRule:
          'An unbounded while-loop hands termination, token spend, and side-effect safety directly to a probabilistic model.',
        breaksUnderLoad:
          'One transient HTTP 500 causes the model to retry the exact same broken tool 45 times—burning $18 in input tokens, blowing the context window, or double-charging a customer.'
      },
      {
        stageNum: 2,
        title: 'Budget-Bounded & Schema-Validated Harness',
        stageGoal:
          'Cap steps, wall time, and dollar spend while rejecting malformed tool arguments before execution.',
        howItWorks: [
          'Every LLM tool proposal hits a deterministic validator that checks JSON schema types, allowlisted tool names, and remaining step/dollar budgets.',
          'Valid calls run inside a sandboxed adapter with strict timeouts. Invalid arguments never hit external APIs; the harness feeds a crisp error back so the model self-corrects within 2 tries.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      GOAL["Task + Policy"]:::ctrl
      CAP["Max 10 Steps · 45s"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      LLM["LLM Proposal"]:::hot
      VAL["Schema & Budget Gate"]:::ctrl
      TOOL["Sandboxed Adapter"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      OK["Verified Output"]:::out
      STOP["Graceful Escalation"]:::warn
    end
    GOAL --> LLM --> VAL
    CAP --> VAL
    VAL -->|Valid| TOOL --> LLM
    VAL -->|Exhausted| STOP
    LLM --> OK${CLASS_DEFS}`,
        nodeLabels: {
          GOAL: 'Task + Policy',
          CAP: 'Hard Budgets',
          LLM: 'LLM Proposal',
          VAL: 'Schema & Budget Gate',
          TOOL: 'Sandboxed Adapter',
          OK: 'Verified Output',
          STOP: 'Graceful Escalation'
        },
        architecturalRule:
          'The model proposes intent; deterministic harness code owns schema validation, authorization, and termination.',
        breaksUnderLoad:
          'When a network timeout drops an HTTP response after a refund API already succeeded, retrying the step executes the payment mutation twice.'
      },
      {
        stageNum: 3,
        title: 'Idempotent Side Effects & Human Approval Interrupts',
        stageGoal:
          'Make every external write safe under retries and pause high-risk mutations for human sign-off.',
        howItWorks: [
          'A risk classifier inspects each validated tool call. Low-risk reads proceed directly, while high-impact writes pause the workflow in WAITING_APPROVAL until a human operator clicks approve.',
          'Before dispatching any mutation, the harness attaches an idempotency key derived from hash(run_id, step_id, canonical_payload). Destination APIs deduplicate retries automatically and write immutable audit logs.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      CALL["Validated Tool Call"]:::hot
      RISK["Risk Tier Policy"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      GATE{"High-Risk Write?"}:::ctrl
      HITL["Human Approval"]:::warn
      IDEM["Idempotency Key"]:::ctrl
      API["External API"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      ONCE["Exactly-Once Write"]:::out
      AUDIT["Audit Ledger"]:::out
    end
    CALL --> RISK --> GATE
    GATE -->|Yes| HITL --> IDEM
    GATE -->|No| IDEM
    IDEM --> API --> ONCE
    API --> AUDIT${CLASS_DEFS}`,
        nodeLabels: {
          CALL: 'Validated Tool Call',
          RISK: 'Risk Policy',
          GATE: 'High-Risk Check',
          HITL: 'Human Approval',
          IDEM: 'Idempotency Key',
          API: 'External API',
          ONCE: 'Exactly-Once Write',
          AUDIT: 'Audit Ledger'
        },
        architecturalRule:
          'Destination idempotency keys make retries mathematically safe, while explicit interrupt states keep irreversible writes under human control.',
        breaksUnderLoad:
          'When a Kubernetes pod evicts mid-run, in-memory history vanishes—forcing users to restart 15-minute research tasks from zero.'
      },
      {
        stageNum: 4,
        title: 'Durable Checkpointed State Machine',
        stageGoal:
          'Persist every completed step so crashed workers resume exactly where they left off with zero rework.',
        howItWorks: [
          'Each completed tool result commits atomically to a durable checkpoint journal (Postgres or Temporal) tagged with run_id and step_seq before the next LLM call begins.',
          'If a worker crashes, the scheduler replays the journal, skips every committed step using saved outputs, and resumes strictly at the failed node.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      EVT["Step / Resume Event"]:::hot
      DB["Checkpoint Journal"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      FSM["Durable State Machine"]:::hot
      SKIP["Skip Committed Steps"]:::ctrl
      EXEC["Run Pending Step"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      REC["Zero-Loss Recovery"]:::out
    end
    EVT --> FSM
    DB --> SKIP --> FSM --> EXEC --> DB
    EXEC --> REC${CLASS_DEFS}`,
        nodeLabels: {
          EVT: 'Step / Resume Event',
          DB: 'Checkpoint Journal',
          FSM: 'Durable State Machine',
          SKIP: 'Skip Committed Steps',
          EXEC: 'Run Pending Step',
          REC: 'Zero-Loss Recovery'
        },
        architecturalRule:
          'Committing every step transition to a durable journal turns fragile in-memory loops into resumable distributed workflows.',
        breaksUnderLoad:
          'Multi-step runs accumulate 150 KB of raw JSON tool outputs inside the prompt, causing quadratic token billing on every turn and drowning out core instructions.'
      },
      {
        stageNum: 5,
        title: 'Context Compaction, Artifact Refs & OTel Trajectory Tracing',
        stageGoal:
          'Cut multi-turn token spend by 60% and trace every LLM decision and tool latency span in production.',
        howItWorks: [
          'Large tool payloads (>4 KB) spill to object storage immediately; the harness injects only a typed 15-line summary plus an artifact_id into the active context window.',
          'Every step emits linked OpenTelemetry spans capturing prompt tokens, tool duration, and retry reasons so on-call engineers replay any failed trajectory in seconds.'
        ],
        mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      RAW["Raw 80KB Tool JSON"]:::warn
    end
    subgraph CORE["Core Engine (Center)"]
      OBJ["Object Store Artifact"]:::ctrl
      COMP["Typed Summary (<500 tok)"]:::hot
      OTEL["OTel Trajectory Spans"]:::ctrl
    end
    subgraph OUT["Outcomes (Right)"]
      COST["62% Lower Token Cost"]:::out
      OBS["1-Click Replay Trace"]:::out
    end
    RAW --> OBJ --> COMP --> COST
    COMP --> OTEL --> OBS${CLASS_DEFS}`,
        nodeLabels: {
          RAW: 'Raw 80KB Tool JSON',
          OBJ: 'Object Store Artifact',
          COMP: 'Typed Summary Compactor',
          OTEL: 'OTel Trajectory Spans',
          COST: '62% Lower Spend',
          OBS: '1-Click Replay Trace'
        },
        architecturalRule:
          'Offload large tool outputs to artifact references and keep only compact structured summaries in the active prompt window.'
      }
    ],
    whereCandidatesSlip: [
      {
        boldMistake: 'Enforcing security inside system prompts.',
        failureUnderLoad:
          'Indirect prompt injection embedded inside a scraped web page overrides "never delete records" and triggers unauthorized tool execution.',
        fix: 'Enforce permissions deterministically in harness code using scoped credentials, tool allowlists, and HITL interrupts.'
      },
      {
        boldMistake: 'Retrying mutating APIs without idempotency.',
        failureUnderLoad:
          'An upstream timeout after a committed write causes the retry loop to send duplicate emails, tickets, or refunds.',
        fix: 'Bind every mutating call to hash(run_id, step_id, payload) enforced by the destination service.'
      },
      {
        boldMistake: 'Appending raw JSON to history.',
        failureUnderLoad:
          'Ten turns of 50 KB API dumps bill 500 KB+ of input tokens per run and push task goals out of attention.',
        fix: 'Spill raw payloads to object storage and pass compact schema-projected summaries to the LLM.'
      }
    ],
    comparisonTable: {
      title: 'Agent Control Loop Architecture Trade-Offs',
      rows: [
        { option: 'Unbounded While Loop', throughput: 'Fast prototype', latency: 'Unbounded', complexity: 'Low', failureMode: 'Infinite loops, $20+ runaway spend, double writes' },
        { option: 'Budgeted + Schema Harness', throughput: 'High', latency: 'Bounded <= 45s', complexity: 'Medium', failureMode: 'Pod crash wipes in-flight progress' },
        { option: 'Durable Checkpointed FSM', throughput: 'Horizontally scaled', latency: '+12ms DB commit', complexity: 'High', failureMode: 'Schema migrations on long-running checkpoints' }
      ]
    },
    interviewQuotes: [
      {
        prompt: 'When asked how to prevent runaway production agents:',
        quote:
          '"Never give an LLM an unbounded loop. Wrap it in a deterministic state machine that owns hard step, time, and dollar budgets plus strict JSON schema validation before any tool executes."'
      },
      {
        prompt: 'When asked how to handle tool retries safely:',
        quote:
          '"Attach a deterministic idempotency key derived from run_id, step_id, and payload hash to every mutating tool, and pause irreversible actions at a human-approval interrupt."'
      },
      {
        prompt: 'When asked how to keep multi-turn agent costs predictable:',
        quote:
          '"Spill raw API payloads over 4 KB to object storage and feed only compact typed summaries plus an artifact handle back into the prompt window."'
      }
    ]
  }
}

/* ============================================================================
   DOMAIN-AWARE 5-STAGE ENGINEERING ATLAS GENERATOR FOR ALL 93 LESSONS
   ============================================================================ */
interface DomainProfile {
  difficulty: AtlasLessonBlueprint['difficulty']
  readMinutes: number
  analogyLead: string
  metrics: AtlasScaleMetric[]
  comparison: AtlasComparisonRow[]
}

function getDomainProfile(stageIndex: number): DomainProfile {
  if (stageIndex <= 1) {
    return {
      difficulty: 'Foundational',
      readMinutes: 9,
      analogyLead: 'Treat this numerical layer like laser surveying before pouring a 60-story steel foundation:',
      metrics: [
        { label: 'Vectorized Speedup', value: '120x–450x vs loops', note: 'Contiguous SIMD / BLAS cache lines' },
        { label: 'Numerical Precision', value: 'FP32 / FP64 (<1e-6)', note: 'Stops silent NaN & underflow drift' },
        { label: 'Batch Throughput', value: '8M ops/sec CPU', note: 'Zero Python interpreter loop overhead' },
        { label: 'Split Isolation', value: '0% train/test leak', note: 'Fit transforms strictly on training fold' }
      ],
      comparison: [
        { option: 'Naive Python Loops', throughput: '15K ops/sec', latency: 'High CPU stall', complexity: 'Low', failureMode: '100x slower & times out on real tables' },
        { option: 'Vectorized NumPy/BLAS', throughput: '8M ops/sec', latency: '< 2 ms batch', complexity: 'Low-Medium', failureMode: 'Silent broadcasting shape mismatches' },
        { option: 'Schema-Validated Pipeline', throughput: '6M ops/sec', latency: 'Deterministic', complexity: 'Medium', failureMode: 'Schema drift if contracts unversioned' }
      ]
    }
  }
  if (stageIndex <= 3) {
    return {
      difficulty: 'Intermediate',
      readMinutes: 11,
      analogyLead: 'Operate this learning loop like a flight-control computer correcting pitch against crosswinds every 10 ms:',
      metrics: [
        { label: 'Generalization Gap', value: '< 2.5% train vs val', note: 'Guards against memorization & drift' },
        { label: 'Mixed Precision Gain', value: '2.1x BF16 speedup', note: 'Halves activation VRAM footprint' },
        { label: 'Inference P95 Budget', value: '< 18 ms per batch', note: 'Compiled graph with pre-scaled features' },
        { label: 'Validation Rigor', value: '5-Fold CV + Slices', note: 'Exposes minority-class calibration errors' }
      ],
      comparison: [
        { option: 'Unregularized Baseline', throughput: 'Fast train', latency: '< 5 ms', complexity: 'Low', failureMode: 'Overfits training noise & fails out-of-sample' },
        { option: 'Regularized + Tuned', throughput: 'Balanced', latency: '< 15 ms p95', complexity: 'Medium', failureMode: 'Degrades silently under feature shift' },
        { option: 'Calibrated Prod Pipeline', throughput: 'GPU batched', latency: '18–45 ms p95', complexity: 'High', failureMode: 'Upstream training-serving skew' }
      ]
    }
  }
  if (stageIndex <= 5) {
    return {
      difficulty: 'Advanced',
      readMinutes: 13,
      analogyLead: 'Run this retrieval and generation pipeline like an audit desk where every claim links to a stamped receipt:',
      metrics: [
        { label: 'Retrieval P95 Budget', value: '< 140 ms end-to-end', note: 'Hybrid fan-out + cross-encoder rerank' },
        { label: 'Focused Context Cap', value: '4K–12K high-signal tok', note: 'Prevents lost-in-the-middle dilution' },
        { label: 'Citation Grounding', value: '>= 94% verified spans', note: 'Deterministic refusal below tau_min' },
        { label: 'Throughput Target', value: '800–1,500 QPS', note: 'Protected by tenant-scoped semantic cache' }
      ],
      comparison: [
        { option: 'Single-Pass Baseline', throughput: '2,000 QPS', latency: '45 ms p95', complexity: 'Low', failureMode: 'Misses exact IDs, tables, and edge phrasing' },
        { option: 'Hybrid + Rerank Spine', throughput: '700 QPS', latency: '130 ms p95', complexity: 'Medium', failureMode: 'GPU reranker queues spike under bursts' },
        { option: 'ACL-Gated Cached Stack', throughput: '1,400 QPS', latency: '10 ms / 135 ms', complexity: 'High', failureMode: 'Stale cache if delete events lag' }
      ]
    }
  }
  if (stageIndex <= 8) {
    return {
      difficulty: 'Advanced',
      readMinutes: 13,
      analogyLead: 'Design this control plane like a bank clearinghouse separating untrusted requests from deterministic ledger writes:',
      metrics: [
        { label: 'Execution Guardrails', value: 'Max 10 steps / 45s', note: 'Hard circuit breaker stops infinite loops' },
        { label: 'Protocol Overhead', value: '< 5 ms JSON-RPC', note: 'Stateless Streamable HTTP transport' },
        { label: 'Side-Effect Guarantee', value: '100% idempotent', note: 'Zero duplicate mutations on retries' },
        { label: 'Crash Recovery RPO', value: '0 lost steps', note: 'Checkpointed journal survives pod restart' }
      ],
      comparison: [
        { option: 'In-Memory Ad-Hoc Loop', throughput: 'Low', latency: 'Unbounded', complexity: 'Low', failureMode: 'Crashes wipe state; retries double-write' },
        { option: 'Typed Guarded Harness', throughput: 'Medium-High', latency: 'Bounded SLA', complexity: 'Medium', failureMode: 'No crash resume without persistent journal' },
        { option: 'Durable Protocol Engine', throughput: 'Horizontally scaled', latency: '+12 ms commit', complexity: 'High', failureMode: 'Requires versioned checkpoint schemas' }
      ]
    }
  }
  return {
    difficulty: 'Staff / Principal',
    readMinutes: 14,
    analogyLead: 'Operate this production tier like a Tier-1 cloud gateway where every release proves safety before receiving traffic:',
    metrics: [
      { label: 'Availability Budget', value: '99.9% (43.2m / 30d)', note: 'Multi-window 14.4x fast-burn paging' },
      { label: 'Release Gate Policy', value: 'Fail-Closed CI/CD', note: 'Blocks rollout on >1% quality regression' },
      { label: 'Tenant Isolation', value: '0 cross-tenant leaks', note: 'Enforced in auth, index ACL, and cache' },
      { label: 'Failover Latency', value: '< 500 ms degradation', note: 'Automated fallback model ladder' }
    ],
    comparison: [
      { option: 'Manual Best-Effort Ops', throughput: 'Unpredictable', latency: 'Spiky p99', complexity: 'Low', failureMode: 'Silent regressions & slow incident recovery' },
      { option: 'Automated CI + Tracing', throughput: 'High', latency: 'Stable p95', complexity: 'Medium', failureMode: 'Human response delay during upstream outage' },
      { option: 'Fail-Closed Governed Stack', throughput: 'Elastic HPA', latency: 'Protected p99', complexity: 'High', failureMode: 'Requires chaos drills to keep fallbacks fresh' }
    ]
  }
}

function buildConceptPills(lesson: Lesson): string[] {
  const tokens = lesson.depth
    .replace(/\.$/, '')
    .split(/,| and /i)
    .map(s => s.trim())
    .filter(s => s.length >= 3 && s.length <= 32)
  const unique: string[] = []
  for (const t of tokens) {
    const titled = t.charAt(0).toUpperCase() + t.slice(1)
    if (!unique.some(u => u.toLowerCase() === titled.toLowerCase())) {
      unique.push(titled)
    }
    if (unique.length === 4) break
  }
  if (unique.length < 3) {
    unique.push('Core Mechanics', 'Scale Constraints', 'Fail-Closed Gates')
  }
  return unique.slice(0, 4)
}

function buildGenericBlueprint(
  lesson: Lesson,
  stageTitle: string,
  stageIndex: number
): AtlasLessonBlueprint {
  const profile = getDomainProfile(stageIndex)
  const pills = buildConceptPills(lesson)
  const wf = lesson.workflow
  const s1 = cleanMermaidLabel(wf[0] ?? `Ingest ${lesson.title} Inputs`)
  const s2 = cleanMermaidLabel(wf[1] ?? `Validate Schema & Limits`)
  const s3 = cleanMermaidLabel(wf[2] ?? `Execute Core ${lesson.title}`)
  const s4 = cleanMermaidLabel(wf[3] ?? `Batch & Cache Hot Path`)
  const s5 = cleanMermaidLabel(wf[4] ?? `Verify Eval & SLO Gate`)
  const shortTitle = cleanMermaidLabel(lesson.title, 26)
  const shortLab = cleanMermaidLabel(lesson.lab, 26)

  const stages: AtlasStageEvolution[] = [
    {
      stageNum: 1,
      title: `Minimal Baseline: Direct ${lesson.title}`,
      stageGoal: `Prove numerical correctness for ${lesson.title} on a clean single-request input before adding concurrency or caching.`,
      howItWorks: [
        `A raw request enters the pipeline and hits "${s1}" directly. The core engine runs a minimal implementation of ${lesson.title} with explicit intermediate assertions.`,
        `Every tensor shape, score, or payload field emits straight to the output sink so you can verify exact values against your hand-computed baseline.`
      ],
      mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      RAW["Raw Input"]:::hot
    end
    subgraph CORE["Core Engine (Center)"]
      P1["${s1}"]:::hot
      ENG["Direct ${shortTitle}"]:::warn
    end
    subgraph OUT["Outcomes (Right)"]
      OUT1["Verified Baseline"]:::out
    end
    RAW --> P1 --> ENG --> OUT1${CLASS_DEFS}`,
      nodeLabels: {
        RAW: 'Raw Input',
        P1: s1,
        ENG: `Direct ${shortTitle}`,
        OUT1: 'Verified Baseline'
      },
      architecturalRule: `Lock down exact intermediate values on a 10-item toy dataset first—scaling a broken baseline only multiplies silent corruption.`,
      breaksUnderLoad: `Malformed production payloads, missing fields, and edge-case outliers slip straight into ${lesson.title}—triggering NaN explosions, crashes, or silent bad outputs.`
    },
    {
      stageNum: 2,
      title: 'Ingress Contract Validation & Quarantine',
      stageGoal:
        'Reject malformed payloads, schema drift, and unauthorized inputs in under 2 ms before they reach core compute.',
      howItWorks: [
        `Incoming payloads pair with a versioned schema and policy spec at the ingress gate. The validator executes "${s2}" and checks bounds, types, and tenant scope.`,
        `Valid inputs flow cleanly into "${s3}". Invalid records route straight to a quarantine dead-letter queue with structured error codes instead of poisoning downstream state.`
      ],
      mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      INP["Incoming Payload"]:::hot
      SPEC["Versioned Contract"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      GATE["${s2}"]:::ctrl
      CORE2["${s3}"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      GOOD["Clean Result"]:::out
      DLQ["Quarantine DLQ"]:::warn
    end
    INP --> GATE
    SPEC --> GATE
    GATE -->|Valid| CORE2 --> GOOD
    GATE -->|Invalid| DLQ${CLASS_DEFS}`,
      nodeLabels: {
        INP: 'Incoming Payload',
        SPEC: 'Versioned Contract',
        GATE: s2,
        CORE2: s3,
        GOOD: 'Clean Result',
        DLQ: 'Quarantine DLQ'
      },
      architecturalRule:
        'Failing fast at a strict ingress contract stops silent downstream corruption and keeps every error reproducible.',
      breaksUnderLoad:
        'Under 100x concurrent traffic, single-item execution saturates CPU/GPU queues and blows past P95 latency budgets while repeating identical expensive calculations.'
    },
    {
      stageNum: 3,
      title: 'Batched Execution & Fast-Path Caching',
      stageGoal:
        'Cut P95 latency by 60%+ and raise throughput via vectorized batching and scoped caching.',
      howItWorks: [
        `The router checks a version-keyed fast cache before touching core compute. Cache hits return in single-digit milliseconds without burning compute cycles.`,
        `Cache misses group into fixed micro-batches and run "${s4}" using versioned tuning parameters, updating both the response stream and cache with strict TTLs.`
      ],
      mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      BATCH["Batched Requests"]:::hot
      CFG["Tuning Config"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      CACHE{"Scoped Cache Hit?"}:::ctrl
      OPT["${s4}"]:::hot
    end
    subgraph OUT["Outcomes (Right)"]
      FAST["< 5ms Cache Hit"]:::out
      COMP["P95 Batched Result"]:::out
    end
    BATCH --> CACHE
    CACHE -->|Hit| FAST
    CACHE -->|Miss| OPT --> COMP
    CFG --> OPT${CLASS_DEFS}`,
      nodeLabels: {
        BATCH: 'Batched Requests',
        CFG: 'Tuning Config',
        CACHE: 'Scoped Cache',
        OPT: s4,
        FAST: 'Cache Hit',
        COMP: 'P95 Batched Result'
      },
      architecturalRule:
        'Batching amortizes compute overhead while version-keyed caching absorbs hot repeat traffic before it hits core capacity.',
      breaksUnderLoad:
        'When real-world data shifts or a new config ships, cached outputs mask silent accuracy decay—and unbounded traffic bursts still trigger memory exhaustion.'
    },
    {
      stageNum: 4,
      title: 'Admission Control, Telemetry & Drift Detection',
      stageGoal:
        'Protect P99 tail latency during traffic spikes and catch quality drift before users report bugs.',
      howItWorks: [
        `An admission controller tracks active queue depth and drops overload cleanly with HTTP 429 before memory stalls. Admitted work runs through the hardened ${shortTitle} engine.`,
        `Every request emits correlated OpenTelemetry latency and quality spans into a live drift monitor, flagging slice regressions within minutes.`
      ],
      mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      TRAF["Burst Traffic"]:::hot
      LIMIT["Queue & Memory Cap"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      ADMIT{"Under Budget?"}:::ctrl
      ENG["Hardened ${shortTitle}"]:::hot
      OTEL["OTel + Drift Monitor"]:::ctrl
    end
    subgraph OUT["Outcomes (Right)"]
      SERVE["Protected P99 Output"]:::out
      SHED["Fast 429 Load Shed"]:::warn
    end
    TRAF --> ADMIT
    LIMIT --> ADMIT
    ADMIT -->|Yes| ENG --> SERVE
    ADMIT -->|No| SHED
    ENG --> OTEL${CLASS_DEFS}`,
      nodeLabels: {
        TRAF: 'Burst Traffic',
        LIMIT: 'Queue & Memory Cap',
        ADMIT: 'Admission Gate',
        ENG: `Hardened ${shortTitle}`,
        OTEL: 'OTel + Drift Monitor',
        SERVE: 'Protected P99 Output',
        SHED: '429 Load Shed'
      },
      architecturalRule:
        'Explicit admission control turns total cluster meltdowns into clean 429 backpressure while telemetry exposes silent drift early.',
      breaksUnderLoad:
        'Observability alone only tells you after production breaks. Without a fail-closed release gate and automated rollback, a bad model or prompt ships straight to 100% of users.'
    },
    {
      stageNum: 5,
      title: 'Fail-Closed Eval Gates & Automated Rollback',
      stageGoal:
        'Block regressions automatically in CI/CD and roll back canary traffic within 60 seconds of an SLO burn.',
      howItWorks: [
        `Every candidate change runs "${s5}" against a versioned golden benchmark covering accuracy, latency, and adversarial slices before touching production traffic.`,
        `Passing builds roll out to a 5% canary monitored by multi-window burn alerts. Any metric regression halts promotion and shifts 100% traffic back to the last verified artifact (${shortLab}).`
      ],
      mermaid: `flowchart LR
    subgraph IN["Inputs (Left)"]
      CAND["Candidate Build"]:::hot
      GOLD["Golden Eval Suite"]:::ctrl
    end
    subgraph CORE["Core Engine (Center)"]
      EVAL["${s5}"]:::ctrl
      CANARY{"5% Canary Healthy?"}:::ctrl
    end
    subgraph OUT["Outcomes (Right)"]
      PROD["100% Verified Prod"]:::out
      ROLL["Auto Rollback (<60s)"]:::warn
    end
    CAND --> EVAL --> CANARY
    GOLD --> EVAL
    CANARY -->|Pass| PROD
    CANARY -->|Burn Alert| ROLL${CLASS_DEFS}`,
      nodeLabels: {
        CAND: 'Candidate Build',
        GOLD: 'Golden Eval Suite',
        EVAL: s5,
        CANARY: '5% Canary Gate',
        PROD: '100% Production',
        ROLL: 'Automated Rollback'
      },
      architecturalRule:
        'Ship every change through a fail-closed golden evaluation gate and automated canary rollback—never rely on manual eyeball checks.'
    }
  ]

  return {
    difficulty: profile.difficulty,
    readMinutes: profile.readMinutes,
    conceptPills: pills,
    anchor: {
      title: `Mental Model: ${lesson.title} in ${stageTitle}`,
      analogy: `${profile.analogyLead} ${lesson.workedExample}`,
      scaleMetrics: profile.metrics
    },
    scopeBoundary: {
      inScope: [
        ...lesson.objectives.slice(0, 3),
        `Hands-on build target: ${lesson.lab}`
      ],
      outOfScope: [
        `Prerequisites assumed ready: ${lesson.prerequisites.join('; ')}`,
        'Proprietary vendor billing consoles or black-box managed wrappers'
      ]
    },
    stages,
    whereCandidatesSlip: [
      {
        boldMistake: 'Skipping toy numerical verification first.',
        failureUnderLoad:
          'Silent shape, index, or scaling bugs survive into full-scale runs where debugging takes 10x longer and burns compute.',
        fix: `Assert exact outputs on a tiny deterministic sample before scaling ${lesson.title}.`
      },
      {
        boldMistake: 'Shipping without ingress contract checks.',
        failureUnderLoad:
          'One malformed upstream record crashes batch workers or quietly poisons cached outputs for downstream users.',
        fix: 'Enforce typed schema validation and dead-letter quarantine at the entry boundary.'
      },
      {
        boldMistake: 'Monitoring only average error rates.',
        failureUnderLoad:
          'Global averages stay green while P99 latency triples or a high-value customer slice drops 15% in accuracy.',
        fix: `Track P95/P99 latency and per-slice accuracy gates before promoting "${lesson.lab}".`
      }
    ],
    comparisonTable: {
      title: `${lesson.title}: Engineering Trade-Off Matrix`,
      rows: profile.comparison
    },
    interviewQuotes: [
      {
        prompt: `When asked how you architect ${lesson.title} in production:`,
        quote: `"I lock down exact numerical behavior on a small baseline first, enforce strict ingress schemas, then layer batching, caching, and fail-closed eval gates before scaling traffic."`
      },
      {
        prompt: 'When asked where the naive version breaks under load:',
        quote: `"Without admission control and versioned caching, traffic bursts spike P99 tail latency and repeat redundant compute until workers OOM."`
      },
      {
        prompt: 'When asked how you prevent silent production regressions:',
        quote: `"Gate every build on a versioned golden suite covering both accuracy slices and latency budgets, then roll out via a 5% canary with automated rollback."`
      }
    ]
  }
}

export function getAtlasBlueprint(
  lesson: Lesson,
  stageTitle: string,
  stageIndex: number
): AtlasLessonBlueprint {
  const slug = getSlug(lesson.id)
  if (FLAGSHIP_BLUEPRINTS[slug]) {
    return FLAGSHIP_BLUEPRINTS[slug]
  }
  return buildGenericBlueprint(lesson, stageTitle, stageIndex)
}
