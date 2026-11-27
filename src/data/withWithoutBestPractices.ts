export interface OutcomeMetricDelta {
  label: string
  withoutValue: string
  withValue: string
  gainSummary: string
}

export interface BestPracticeRule {
  doThis: string
  avoidThis: string
  whyItMatters: string
}

export interface WithWithoutBestPractice {
  scenarioContext: string
  withoutConcept: {
    headline: string
    whatBreaks: string
    symptom: string
  }
  withConcept: {
    headline: string
    whatIsAchieved: string
    proofSignal: string
  }
  metrics: [OutcomeMetricDelta, OutcomeMetricDelta, OutcomeMetricDelta]
  bestPractices: BestPracticeRule[]
}

/**
 * Topic-specific With-vs-Without outcomes and production best practices
 * for all 12 core interactive studio topics (Stages 1–6).
 */
export const interactiveTopicOutcomes: Record<string, WithWithoutBestPractice> = {
  'py-data-pipelines': {
    scenarioContext: 'Preparing 50,000 customer rows for churn prediction',
    withoutConcept: {
      headline: 'Silent Data Leakage & Corrupted Scales',
      whatBreaks: 'Imputing averages across the full CSV before splitting leaks test answers into training, while unclipped typos (age=999) crush valid feature ranges.',
      symptom: '97% offline demo accuracy that plunges to 63% on day one in production.'
    },
    withConcept: {
      headline: 'Honest Validation & Reproducible Pipelines',
      whatIsAchieved: 'Deduplication, strict train-first splits, and train-only medians produce trustworthy metrics that accurately predict live customer performance.',
      proofSignal: 'Offline validation (89%) matches live production accuracy (88.4%).'
    },
    metrics: [
      { label: 'Prod Accuracy', withoutValue: '63.0%', withValue: '88.4%', gainSummary: '+25.4 pts real generalization' },
      { label: 'Leakage Risk', withoutValue: 'High (Test Clues)', withValue: 'Zero', gainSummary: 'Strict split boundary' },
      { label: 'Debug Time', withoutValue: '12 hrs / release', withValue: '15 mins', gainSummary: '98% faster triage' }
    ],
    bestPractices: [
      {
        doThis: 'Split train, validation, and test sets BEFORE computing any mean, median, scaler, or encoder.',
        avoidThis: 'Running fit_transform() on the entire DataFrame prior to splitting.',
        whyItMatters: 'Prevents future or held-out statistics from inflating evaluation scores.'
      },
      {
        doThis: 'Deduplicate by canonical entity/user ID and split by time or user group.',
        avoidThis: 'Randomly shuffling duplicate user events across train and test.',
        whyItMatters: 'Stops the model from memorizing the same customer in both piles.'
      },
      {
        doThis: 'Enforce an explicit schema contract with type checks and realistic bounds.',
        avoidThis: 'Silently coercing invalid strings or extreme sensor glitches into raw floats.',
        whyItMatters: 'Catches upstream data bugs before wasting GPU training cycles.'
      },
      {
        doThis: 'Save fitted preprocessing parameters alongside the trained model artifact.',
        avoidThis: 'Recomputing medians or scaling constants separately in serving code.',
        whyItMatters: 'Eliminates train-serving skew.'
      }
    ]
  },

  'py-async-batching': {
    scenarioContext: 'Embedding & storing 10,000 incoming support tickets',
    withoutConcept: {
      headline: 'Slow Serial Calls & Mid-Job Crashes',
      whatBreaks: 'Sending 10,000 individual HTTP calls wastes 90% of wall-clock time on network handshakes, and one blank record crashes the entire batch at ticket #8,400.',
      symptom: '18-minute ingestion lag, frequent HTTP 429 bans, and partial unrecoverable writes.'
    },
    withConcept: {
      headline: 'Fast, Fault-Isolated Bulk Pipelines',
      whatIsAchieved: 'Schema validation routes bad records to a Dead-Letter Queue (DLQ) while bounded workers ship clean 32-item batches at 12× higher throughput.',
      proofSignal: '10,000 tickets indexed in 48 seconds with 0 unhandled pipeline crashes.'
    },
    metrics: [
      { label: 'Total Runtime', withoutValue: '18 min', withValue: '48 sec', gainSummary: '22× faster ingestion' },
      { label: 'Crash Rate', withoutValue: '14% of jobs', withValue: '0% (DLQ isolated)', gainSummary: 'Bad rows quarantined' },
      { label: 'API Call Overhead', withoutValue: '10,000 calls', withValue: '313 calls', gainSummary: '96.8% fewer round trips' }
    ],
    bestPractices: [
      {
        doThis: 'Validate records at the ingress boundary and route malformed items to a Dead-Letter Queue.',
        avoidThis: 'Letting a single null field throw an uncaught exception that aborts the whole batch.',
        whyItMatters: 'Isolates poison-pill payloads so healthy data keeps flowing.'
      },
      {
        doThis: 'Cap both batch_size and worker concurrency to stay below API payload and rate limits.',
        avoidThis: 'Spawning unbounded async tasks (`asyncio.gather` over 5,000 items).',
        whyItMatters: 'Prevents HTTP 429 retry storms and out-of-memory crashes.'
      },
      {
        doThis: 'Use bulk writes with idempotent upserts keyed by content hash or record ID.',
        avoidThis: 'Blindly inserting rows one by one without duplicate protection.',
        whyItMatters: 'Makes retries safe if a network hiccup occurs mid-batch.'
      },
      {
        doThis: 'Emit structured batch metrics (accepted, rejected, p95 latency) per run.',
        avoidThis: 'Running silent ingestion loops with no visibility into dropped rows.',
        whyItMatters: 'Alerts engineers immediately if an upstream schema changes.'
      }
    ]
  },

  'math-vectors-similarity': {
    scenarioContext: 'Semantic search over 100,000 product manuals & FAQs',
    withoutConcept: {
      headline: 'Exact-Word Blindness & Length Bias',
      whatBreaks: 'Keyword matching misses synonyms ("laptop won’t charge" vs "battery adapter fault"), and raw unnormalized dot products let verbose 10-page docs outrank crisp answers.',
      symptom: 'Users rephrase queries 3 times and still get irrelevant long articles.'
    },
    withConcept: {
      headline: 'Direction-Aware Meaning Matching',
      whatIsAchieved: 'Unit-normalized vectors compare conceptual direction via cosine similarity, instantly surfacing paraphrased answers regardless of document length.',
      proofSignal: 'Top-3 search recall climbs from 52% to 91% in under 15 ms.'
    },
    metrics: [
      { label: 'Paraphrase Recall@3', withoutValue: '52%', withValue: '91%', gainSummary: '+39 pts semantic lift' },
      { label: 'Length Bias Errors', withoutValue: 'Frequent', withValue: 'Eliminated', gainSummary: 'L2 unit normalization' },
      { label: 'Lookup Speed', withoutValue: 'Full text scan', withValue: '12 ms (ANN)', gainSummary: 'Fast dot product on unit vectors' }
    ],
    bestPractices: [
      {
        doThis: 'Pre-normalize embedding vectors to unit L2 length (|v| = 1) at index time.',
        avoidThis: 'Computing raw dot products on unnormalized vectors of varying lengths.',
        whyItMatters: 'Makes fast dot product mathematically identical to cosine similarity.'
      },
      {
        doThis: 'Tune similarity cutoff thresholds empirically on a labeled validation set (including unanswerable queries).',
        avoidThis: 'Guessing a hard cutoff like 0.90 that silently drops valid paraphrases.',
        whyItMatters: 'Balances high recall against false-positive noise.'
      },
      {
        doThis: 'Pin the exact embedding model ID and dimension version alongside every vector index.',
        avoidThis: 'Mixing vectors generated by two different embedding models in one collection.',
        whyItMatters: 'Different models live in incompatible geometric spaces—distances become meaningless.'
      },
      {
        doThis: 'Pair dense cosine search with lexical BM25 for exact SKU codes, acronyms, and error IDs.',
        avoidThis: 'Relying solely on dense vectors for exact alphanumeric identifiers.',
        whyItMatters: 'Embeddings smooth over exact part numbers that keyword search nails.'
      }
    ]
  },

  'math-gradient-descent': {
    scenarioContext: 'Optimizing model weights across 50,000 training updates',
    withoutConcept: {
      headline: 'Blind Guessing or Exploding Loss',
      whatBreaks: 'Without slope-guided updates and tuned learning rates, weights either wander randomly, crawl too slowly to learn, or overshoot into NaN divergence.',
      symptom: 'Training runs burn hours of GPU compute while loss flatlines or hits Infinity.'
    },
    withConcept: {
      headline: 'Fast, Stable Loss Minimization',
      whatIsAchieved: 'Following negative gradients with a controlled learning rate schedule and gradient clipping glides smoothly into low-error basins.',
      proofSignal: 'Loss drops 99.1% in 20 epochs with zero NaN spikes.'
    },
    metrics: [
      { label: 'Convergence Rate', withoutValue: 'Diverges / Stalls', withValue: '99.1% loss drop', gainSummary: 'Predictable optimization' },
      { label: 'Wasted GPU Runs', withoutValue: '40% NaN crashes', withValue: '<1%', gainSummary: 'LR warmup + clipping' },
      { label: 'Tuning Effort', withoutValue: 'Trial & error', withValue: 'Structured sweep', gainSummary: 'Faster experiment velocity' }
    ],
    bestPractices: [
      {
        doThis: 'Start with a small learning rate warmup followed by cosine decay.',
        avoidThis: 'Launching training with a single aggressive constant learning rate.',
        whyItMatters: 'Early gradients are noisy; warmup prevents instant divergence.'
      },
      {
        doThis: 'Log both training loss and gradient norm at every step and enable gradient clipping.',
        avoidThis: 'Watching only final epoch loss without inspecting step-level spikes.',
        whyItMatters: 'Catches exploding gradients before they turn weights into NaNs.'
      },
      {
        doThis: 'Sanity-check your implementation by overfitting a tiny 10-row batch to near-zero loss first.',
        avoidThis: 'Launching a multi-hour full-dataset run before verifying gradient signs.',
        whyItMatters: 'A flipped sign (`w + lr * grad`) shows up in 5 seconds on a tiny batch.'
      },
      {
        doThis: 'Use AdamW for fast adaptive defaults on deep models, and tune weight decay separately.',
        avoidThis: 'Increasing learning rate blindly when loss plateaus instead of inspecting data quality.',
        whyItMatters: 'Adaptive step sizes handle features with very different gradient scales.'
      }
    ]
  },

  'ml-bias-variance': {
    scenarioContext: 'Deploying a credit-risk classifier to unseen applicants',
    withoutConcept: {
      headline: 'Memorized Noise & Production Collapse',
      whatBreaks: 'Unconstrained trees or polynomials memorize training quirks (99% train accuracy) and make erratic decisions on real customers who don’t match training rows verbatim.',
      symptom: 'Severe train-to-validation gap (24%) and costly false approvals in production.'
    },
    withConcept: {
      headline: 'Controlled Complexity & True Generalization',
      whatIsAchieved: 'Depth caps, regularization penalties, and k-fold cross-validation keep train and validation scores tightly aligned on unseen applicants.',
      proofSignal: 'Validation accuracy rises +15 pts while train-val gap stays under 3%.'
    },
    metrics: [
      { label: 'Unseen Val Accuracy', withoutValue: '74.0%', withValue: '89.2%', gainSummary: '+15.2 pts on new users' },
      { label: 'Train-Val Gap', withoutValue: '25.0% (Overfit)', withValue: '2.8%', gainSummary: 'Generalization verified' },
      { label: 'False Decisions', withoutValue: '1 in 4 users', withValue: '1 in 10 users', gainSummary: '60% fewer errors' }
    ],
    bestPractices: [
      {
        doThis: 'Always compare training score AND held-out validation score side by side.',
        avoidThis: 'Promoting a model solely because training accuracy reached 99%.',
        whyItMatters: 'Training accuracy alone rewards memorization, not generalization.'
      },
      {
        doThis: 'Start with a simple, regularized baseline before adding complex ensembles.',
        avoidThis: 'Jumping straight to max-depth boosted trees without a baseline benchmark.',
        whyItMatters: 'Proves whether extra complexity actually beats a simpler, cheaper model.'
      },
      {
        doThis: 'Use early stopping and k-fold cross-validation on smaller tabular datasets.',
        avoidThis: 'Tuning hyperparameters repeatedly against your single final test set.',
        whyItMatters: 'Keeps the final test set genuinely unseen until release sign-off.'
      },
      {
        doThis: 'Check precision, recall, and slice errors on minority classes—not just raw accuracy.',
        avoidThis: 'Celebrating 95% accuracy on a 95%/5% imbalanced fraud dataset.',
        whyItMatters: 'A dummy model predicting "no fraud" every time gets 95% accuracy while catching zero fraud.'
      }
    ]
  },

  'dl-neural-backprop': {
    scenarioContext: 'Training a multi-layer neural classifier on complex non-linear signals',
    withoutConcept: {
      headline: 'Flat Linear Ceilings & Dead/Overfit Layers',
      whatBreaks: 'Without non-linear activations, regularization (dropout), and normalized layer gradients, deep networks either collapse into a single linear rule or overfit/vanish.',
      symptom: 'Gradients vanish to 0 in early layers or validation loss climbs after epoch 3.'
    },
    withConcept: {
      headline: 'Rich Hierarchical Feature Learning',
      whatIsAchieved: 'Non-linear activations (ReLU/GELU), clean backprop flow, and moderate dropout let stacked layers automatically discover complex patterns.',
      proofSignal: 'Validation error drops steadily across epochs with stable gradient norms.'
    },
    metrics: [
      { label: 'Val Accuracy', withoutValue: '68.5%', withValue: '93.1%', gainSummary: '+24.6 pts non-linear power' },
      { label: 'Gradient Health', withoutValue: 'Vanishing / Dead', withValue: 'Stable Norm', gainSummary: 'Clean chain-rule flow' },
      { label: 'Overfit Resistance', withoutValue: 'Weak', withValue: 'Strong (0.2 Drop)', gainSummary: 'Resilient representations' }
    ],
    bestPractices: [
      {
        doThis: 'Pair hidden layers with LayerNorm/BatchNorm and residual connections in deeper networks.',
        avoidThis: 'Stacking 10+ raw layers without normalization or skip connections.',
        whyItMatters: 'Prevents vanishing and exploding gradients across deep stacks.'
      },
      {
        doThis: 'Keep dropout moderate (0.1–0.3) and ALWAYS switch the model to `.eval()` mode during inference.',
        avoidThis: 'Leaving dropout active at inference time or setting dropout above 0.6.',
        whyItMatters: 'Active dropout during serving causes random, inconsistent predictions.'
      },
      {
        doThis: 'Use seeded deterministic runs and save checkpoints keyed by best validation loss.',
        avoidThis: 'Shipping the final epoch weights after validation loss already started rising.',
        whyItMatters: 'Preserves the highest-generalizing model state automatically.'
      },
      {
        doThis: 'Monitor dead ReLU fractions and prefer GELU/SiLU or LeakyReLU if activations saturate.',
        avoidThis: 'Ignoring zeroed-out hidden layers whose weights stopped updating.',
        whyItMatters: 'Dead neurons waste memory and model capacity permanently.'
      }
    ]
  },

  'genai-attention-decoding': {
    scenarioContext: 'Generating structured JSON & accurate customer answers from an LLM',
    withoutConcept: {
      headline: 'Hallucinations, Broken JSON & Unpredictable Bills',
      whatBreaks: 'Using high default temperature (1.2+) and uncapped output lengths causes the model to invent facts, emit invalid JSON commas, and ramble for 1,500 tokens.',
      symptom: '18% JSON parser crashes, inconsistent answers on identical prompts, and 4× latency.'
    },
    withConcept: {
      headline: 'Deterministic, Schema-Safe & Budgeted Generation',
      whatIsAchieved: 'Task-matched temperature (0.0–0.3 for facts/JSON), calibrated top-p, and strict output budgets yield crisp, parseable, fast responses.',
      proofSignal: '99.4% schema validity with predictable p95 latency and token spend.'
    },
    metrics: [
      { label: 'JSON / Fact Accuracy', withoutValue: '72.0%', withValue: '96.2%', gainSummary: '+24.2 pts reliability' },
      { label: 'Decode Latency', withoutValue: '4,800 ms', withValue: '1,440 ms', gainSummary: '70% faster responses' },
      { label: 'Output Token Cost', withoutValue: '$0.0085/req', withValue: '$0.0017/req', gainSummary: '80% lower spend' }
    ],
    bestPractices: [
      {
        doThis: 'Use low temperature (0.0–0.2) for extraction, coding, classification, and RAG; reserve 0.7–0.9 for creative writing.',
        avoidThis: 'Leaving temperature high (>1.0) on factual or JSON workflows.',
        whyItMatters: 'Low temperature concentrates probability mass on the most accurate tokens.'
      },
      {
        doThis: 'Set explicit `max_output_tokens` and structured JSON schema enforcement on every API call.',
        avoidThis: 'Allowing unbounded generation and parsing free-form text with brittle regex.',
        whyItMatters: 'Caps tail latency, prevents runaway bills, and guarantees machine-readable output.'
      },
      {
        doThis: 'Tune EITHER temperature OR top-p—not extreme values of both simultaneously.',
        avoidThis: 'Randomly combining temperature=1.8 with top_p=0.1.',
        whyItMatters: 'Makes behavior predictable and reproducible across evaluations.'
      },
      {
        doThis: 'Stream tokens to the UI for long answers so users see progress within 200–400 ms (low TTFT).',
        avoidThis: 'Blocking the UI for 8 seconds waiting for the entire response to finish.',
        whyItMatters: 'Dramatically improves perceived responsiveness.'
      }
    ]
  },

  'genai-rag-hybrid': {
    scenarioContext: 'Enterprise policy assistant answering private company questions',
    withoutConcept: {
      headline: 'Confident Hallucinations & Cross-Tenant Leaks',
      whatBreaks: 'Asking a base LLM without RAG invents outdated rules; naive RAG without ACL filters, overlap, or reranking misses key terms or leaks another tenant’s file.',
      symptom: '31% unsupported answers, wrong policy versions, and unverified citations.'
    },
    withConcept: {
      headline: 'Grounded, Cited & Access-Controlled Answers',
      whatIsAchieved: 'Tenant-filtered hybrid search (BM25 + Dense) + cross-encoder reranking + citation checks deliver verified answers—or safely abstain when evidence is absent.',
      proofSignal: '94.5% citation faithfulness and 0 cross-tenant leaks.'
    },
    metrics: [
      { label: 'Grounded Faithfulness', withoutValue: '64.0%', withValue: '94.5%', gainSummary: '+30.5 pts accuracy' },
      { label: 'Hallucination Rate', withoutValue: '31%', withValue: '<2% (Abstains)', gainSummary: 'Cites or abstains safely' },
      { label: 'Prompt Token Spend', withoutValue: '12,000 tok', withValue: '1,600 tok', gainSummary: '86% leaner context' }
    ],
    bestPractices: [
      {
        doThis: 'Enforce tenant_id and document ACL filters inside the database BEFORE top-K ranking.',
        avoidThis: 'Retrieving global top-K first and filtering unauthorized chunks afterward.',
        whyItMatters: 'Prevents security leaks and avoids returning empty results when top slots belong to another tenant.'
      },
      {
        doThis: 'Combine keyword (BM25) + vector search via Reciprocal Rank Fusion and rerank the top 20 down to top 4–5.',
        avoidThis: 'Stuffing 15–20 raw unranked chunks into the prompt.',
        whyItMatters: 'Improves precision while avoiding lost-in-the-middle degradation and bloated costs.'
      },
      {
        doThis: 'Preserve immutable source IDs, page numbers, and offsets—and verify citations in application code.',
        avoidThis: 'Trusting the LLM’s self-reported `[Page 4]` tag without checking retrieved chunk IDs.',
        whyItMatters: 'Guarantees every citation points to real, authorized evidence.'
      },
      {
        doThis: 'Treat retrieved text strictly as untrusted data—never as instructions granting tool permissions.',
        avoidThis: 'Concatenating raw PDF text directly into privileged system instructions.',
        whyItMatters: 'Neutralizes indirect prompt injection hidden inside documents.'
      }
    ]
  },

  'agents-loop-budgets': {
    scenarioContext: 'Customer operations agent calling inventory and pricing APIs',
    withoutConcept: {
      headline: 'Infinite Loops, Runaway Bills & Tool Abuse',
      whatBreaks: 'An unbounded agent retries broken tools 40 times, burning quadratic conversation tokens—and a prompt injection can trick it into calling privileged admin tools.',
      symptom: '$12 single-request API spikes, 90-second hangs, and unauthorized write calls.'
    },
    withConcept: {
      headline: 'Bounded, Policy-Enforced Autonomous Execution',
      whatIsAchieved: 'Explicit step/token/time caps stop stuck runs cleanly, while a server-side allow-list and schema validator authorize every proposed tool call.',
      proofSignal: '100% unauthorized tool proposals blocked; max cost bounded under $0.03/task.'
    },
    metrics: [
      { label: 'Unauthorized Actions', withoutValue: 'Exposed', withValue: '0 (Deny-by-default)', gainSummary: 'Server policy boundary' },
      { label: 'Runaway Cost Cap', withoutValue: 'Unbounded ($10+)', withValue: '<$0.03 / task', gainSummary: 'Hard step & token cap' },
      { label: 'Task Completion', withoutValue: '61% (Stalls)', withValue: '93%', gainSummary: 'Structured observations' }
    ],
    bestPractices: [
      {
        doThis: 'Treat every LLM tool call as an untrusted proposal—validate tool name, argument schema, and user scope on the server.',
        avoidThis: 'Relying on system-prompt wording ("never delete records") as your security control.',
        whyItMatters: 'Models can be persuaded by injections; deterministic server policies cannot.'
      },
      {
        doThis: 'Set hard budgets on max_steps, total tokens, wall-clock deadline, and per-tool timeouts.',
        avoidThis: 'Using `while True:` loops that trust the LLM to emit a stop token eventually.',
        whyItMatters: 'Guarantees termination and protects latency and FinOps budgets.'
      },
      {
        doThis: 'Detect repeated identical tool calls with the same arguments and break loops early.',
        avoidThis: 'Letting an agent call a failing endpoint 10 times with identical bad inputs.',
        whyItMatters: 'Turns silent hangs into crisp, diagnosable stop reasons.'
      },
      {
        doThis: 'Use a deterministic pipeline when steps are fixed—only use an autonomous agent loop when branching is genuinely needed.',
        avoidThis: 'Wrapping a 3-step static workflow inside an expensive autonomous agent.',
        whyItMatters: 'Deterministic chains are faster, cheaper, and easier to test.'
      }
    ]
  },

  'agents-durable-checkpoints': {
    scenarioContext: 'Multi-agent refund & compliance workflow handling real money',
    withoutConcept: {
      headline: 'Lost Progress & Double-Charged Customers',
      whatBreaks: 'A container restart loses 4 minutes of completed agent research, and retrying an unguarded refund API charges or refunds the customer twice.',
      symptom: 'Duplicate financial transactions, unapproved high-risk actions, and zero audit trail.'
    },
    withConcept: {
      headline: 'Crash-Proof, Exactly-Once & Human-Approved Workflows',
      whatIsAchieved: 'Step checkpoints resume immediately from saved state, idempotency keys deduplicate side effects, and human approval tokens bind to exact payload hashes.',
      proofSignal: 'Zero duplicate side effects across crash/retry drills with full audit lineage.'
    },
    metrics: [
      { label: 'Duplicate Side Effects', withoutValue: '3.2% on retry', withValue: '0.0% (Idempotent)', gainSummary: 'Exactly-once outcome' },
      { label: 'Crash Recovery Work', withoutValue: '100% restart', withValue: 'Resume last step', gainSummary: 'Saves 80% rework cost' },
      { label: 'Audit & Governance', withoutValue: 'None', withValue: 'Hash-bound sign-off', gainSummary: 'Compliance ready' }
    ],
    bestPractices: [
      {
        doThis: 'Attach a stable, deterministic idempotency key to every external write/mutation tool call.',
        avoidThis: 'Assuming checkpoints alone prevent duplicate external API calls.',
        whyItMatters: 'A crash between an external API succeeding and checkpointing will replay that step on resume.'
      },
      {
        doThis: 'Bind human approval tokens to a cryptographic hash of the exact action, target ID, and arguments—with an expiry timestamp.',
        avoidThis: 'Using generic "Yes/No" approvals that don’t re-verify arguments before execution.',
        whyItMatters: 'Prevents stale or tampered parameters from piggybacking on old approvals.'
      },
      {
        doThis: 'Revalidate user permissions and tenant membership when resuming a paused workflow.',
        avoidThis: 'Executing a resumed action hours later without checking if access was revoked.',
        whyItMatters: 'Closes time-of-check to time-of-use (TOCTOU) security gaps.'
      },
      {
        doThis: 'Persist checkpoints at every side-effect boundary and hibernate idle waiting runs out of RAM.',
        avoidThis: 'Holding open HTTP connections or worker threads while waiting hours for human review.',
        whyItMatters: 'Scales cleanly to thousands of concurrent paused workflows.'
      }
    ]
  },

  'llmops-kv-batching': {
    scenarioContext: 'Self-hosting an 8B–70B LLM on a 24 GB GPU for live traffic',
    withoutConcept: {
      headline: 'Idle GPUs, 8-Second Latency & CUDA OOM Crashes',
      whatBreaks: 'Serving one FP16 request at a time without KV cache or continuous batching leaves GPU compute starving—while naive unbounded batching crashes VRAM with OOM.',
      symptom: '12 tokens/sec throughput, $4.50/1M token GPU bill, and sudden server crashes.'
    },
    withConcept: {
      headline: 'High-Throughput, VRAM-Safe Production Serving',
      whatIsAchieved: 'Paged KV cache eliminates redundant math, 8-bit quantization halves weight VRAM, and bounded continuous batching maximizes GPU utilization safely.',
      proofSignal: '410 tokens/sec throughput at 1/4th the GPU cost per million tokens.'
    },
    metrics: [
      { label: 'Throughput', withoutValue: '45 tok/sec', withValue: '410 tok/sec', gainSummary: '9× higher GPU yield' },
      { label: 'Cost / 1M Tokens', withoutValue: '$4.50', withValue: '$0.36', gainSummary: '92% lower serving cost' },
      { label: 'OOM Crash Risk', withoutValue: 'High spikes', withValue: '0 (Admission cap)', gainSummary: 'Bounded KV budget' }
    ],
    bestPractices: [
      {
        doThis: 'Always calculate KV-cache VRAM per active sequence and enforce admission control + queue caps.',
        avoidThis: 'Accepting unlimited concurrent long-context prompts until CUDA crashes with OOM.',
        whyItMatters: 'Graceful queueing or 429 shedding beats crashing all active users on the GPU.'
      },
      {
        doThis: 'Measure TTFT (prefill) and Inter-Token Latency (decode) separately at p50 and p95.',
        avoidThis: 'Tracking only average total request duration.',
        whyItMatters: 'Prefill bottlenecks need prefix caching/chunked prefill; decode bottlenecks need quantization/batch tuning.'
      },
      {
        doThis: 'Benchmark output quality on your domain golden set after applying INT8 or INT4 quantization.',
        avoidThis: 'Assuming 4-bit quantization is lossless for complex reasoning or coding tasks.',
        whyItMatters: 'Quantization is a quality-vs-memory trade-off that must be verified on real tasks.'
      },
      {
        doThis: 'Propagate client disconnect cancellations immediately to free KV-cache blocks.',
        avoidThis: 'Continuing to generate 800 tokens for a user who already closed the browser tab.',
        whyItMatters: 'Reclaims precious GPU memory and compute instantly.'
      }
    ]
  },

  'llmops-eval-canary': {
    scenarioContext: 'Shipping weekly prompt, retriever, and model updates to 100k users',
    withoutConcept: {
      headline: 'Silent Quality Regressions & Big-Bang Outages',
      whatBreaks: 'Pushing a prompt tweak straight to 100% of users based on "vibe checks" silently breaks edge-case billing queries and spikes retry bills across every customer.',
      symptom: 'Support tickets surge 3 days later with no reproducible baseline or fast rollback bundle.'
    },
    withConcept: {
      headline: 'Evidence-Gated, Auto-Reversible Releases',
      whatIsAchieved: 'Golden-set CI evaluation blocks bad candidates before deploy; 5% canary routing verifies live SLOs and auto-restores the previous immutable bundle on breach.',
      proofSignal: '99.9% uptime, zero silent regressions shipped, and 45% FinOps savings via tenant-safe caching.'
    },
    metrics: [
      { label: 'Blast Radius', withoutValue: '100% of users', withValue: '≤5% canary slice', gainSummary: '95% users shielded' },
      { label: 'Rollback Speed', withoutValue: '2+ hrs manual', withValue: '<60 sec bundle swap', gainSummary: 'Immutable rollback' },
      { label: 'Cost / 1k Tasks', withoutValue: '$9.30 (Retries)', withValue: '$3.80', gainSummary: '59% FinOps reduction' }
    ],
    bestPractices: [
      {
        doThis: 'Version code, model digest, prompt template, and vector index together as one immutable release bundle.',
        avoidThis: 'Editing prompts live in production without pinning compatible index/model versions.',
        whyItMatters: 'Guarantees rollback restores a fully compatible working system.'
      },
      {
        doThis: 'Fail closed in CI when ANY critical safety, quality, latency, or sample-size threshold fails.',
        avoidThis: 'Letting a 95% average score hide a failing safety check or broken tenant slice.',
        whyItMatters: 'Averages conceal catastrophic failures in high-value slices.'
      },
      {
        doThis: 'Key response caches by `(tenant_id, user_acl_hash, model_ver, prompt_ver, index_ver)`.',
        avoidThis: 'Caching answers solely by raw query string.',
        whyItMatters: 'Eliminates cross-tenant cache leaks and stale responses after updates.'
      },
      {
        doThis: 'Measure "Cost per Successful Task" including retries, embeddings, reranking, and failed attempts.',
        avoidThis: 'Looking only at single-call token price while ignoring retry amplification.',
        whyItMatters: 'A slightly cheaper model that fails 30% of tasks often costs more per solved task.'
      }
    ]
  }
}

/**
 * Stage-level With-vs-Without outcomes and best practices covering ALL 12 stages
 * (93 lessons) inside TopicLearningStudio when learners open any lesson drawer.
 */
const stageProfiles: Record<number, WithWithoutBestPractice> = {
  1: interactiveTopicOutcomes['py-data-pipelines'],
  2: interactiveTopicOutcomes['ml-bias-variance'],
  3: interactiveTopicOutcomes['dl-neural-backprop'],
  4: interactiveTopicOutcomes['genai-attention-decoding'],
  5: interactiveTopicOutcomes['genai-rag-hybrid'],
  6: interactiveTopicOutcomes['agents-loop-budgets'],
  7: {
    scenarioContext: 'Connecting AI hosts, MCP servers, and independent A2A/ACP agents',
    withoutConcept: {
      headline: 'Fragile Custom Glue & Confused-Deputy Security Gaps',
      whatBreaks: 'Ad-hoc tool scripts lack standard schemas, capability negotiation, and per-tool OAuth scopes—exposing internal APIs to confused-deputy attacks.',
      symptom: 'Every new model or IDE requires rewriting connectors and weakens audit trails.'
    },
    withConcept: {
      headline: 'Interoperable, Least-Privilege Protocol Boundaries',
      whatIsAchieved: 'Standardized MCP, A2A, and ACP contracts separate host policy from tool servers, enforcing strict schemas, OAuth 2.1 scopes, and stateless scaling.',
      proofSignal: 'Plug-and-play tools across hosts with zero cross-tenant scope escalation.'
    },
    metrics: [
      { label: 'Integration Reuse', withoutValue: '1-off glue code', withValue: 'Standard protocol', gainSummary: 'Write once, connect anywhere' },
      { label: 'Scope Violations', withoutValue: 'High risk', withValue: '0 (OAuth + PRM)', gainSummary: 'Strict host enforcement' },
      { label: 'Horizontal Scaling', withoutValue: 'Sticky sessions', withValue: 'Stateless HTTP', gainSummary: 'Clean replica routing' }
    ],
    bestPractices: [
      {
        doThis: 'Keep authorization and user consent inside the trusted host—never delegate trust to tool descriptions.',
        avoidThis: 'Allowing an external MCP server to elevate scopes or bypass tenant checks.',
        whyItMatters: 'Prevents confused-deputy attacks and prompt-driven privilege escalation.'
      },
      {
        doThis: 'Use stateless Streamable HTTP with OAuth 2.1 audience/issuer checks for remote services.',
        avoidThis: 'Exposing unauthenticated STDIO or localhost servers over public networks.',
        whyItMatters: 'Protects against DNS rebinding and enables multi-replica scaling.'
      },
      {
        doThis: 'Distinguish MCP (model↔tools/context), A2A (agent↔agent), and ACP (IDE↔coding agent).',
        avoidThis: 'Treating all agent protocols as interchangeable drop-ins.',
        whyItMatters: 'Each protocol models a different trust and lifecycle boundary.'
      }
    ]
  },
  8: interactiveTopicOutcomes['agents-durable-checkpoints'],
  9: interactiveTopicOutcomes['llmops-eval-canary'],
  10: {
    scenarioContext: 'Defending multi-tenant enterprise AI services under real-world attack & load',
    withoutConcept: {
      headline: 'Cross-Tenant Data Leaks, Blind Outages & Cost Blowups',
      whatBreaks: 'Missing RLS/ACL isolation, unredacted logs, and missing SLO error budgets allow indirect prompt injections, secret leakage, and silent quality degradation.',
      symptom: 'Security incidents discovered by customers instead of automated monitors.'
    },
    withConcept: {
      headline: 'Defense-in-Depth, Observable & Budget-Protected AI',
      whatIsAchieved: 'Server-resolved tenant identity, PostgreSQL RLS, OpenTelemetry redacted traces, burn-rate SLOs, and strict spend envelopes contain both attacks and outages.',
      proofSignal: '100% cross-tenant probes blocked; p95 & spend anomalies alerted within 2 minutes.'
    },
    metrics: [
      { label: 'Tenant Isolation', withoutValue: 'UI filter only', withValue: 'DB RLS + Vector ACL', gainSummary: 'Zero cross-tenant reads' },
      { label: 'Incident Detection', withoutValue: 'Hours (Customer)', withValue: '<2 min (Burn-rate)', gainSummary: 'Fast containment' },
      { label: 'Secret Leakage', withoutValue: 'Raw prompts logged', withValue: 'Redacted OTel', gainSummary: 'Privacy-safe telemetry' }
    ],
    bestPractices: [
      {
        doThis: 'Enforce tenant isolation at every layer: auth middleware, DB RLS, vector filters, cache keys, and background workers.',
        avoidThis: 'Trusting a tenant_id field sent from client JSON or generated by an LLM.',
        whyItMatters: 'Defense-in-depth stops a single bug from exposing customer data.'
      },
      {
        doThis: 'Redact prompts, PII, and credentials before exporting traces or logs; use allowlisted metric labels.',
        avoidThis: 'Logging raw user prompts or putting unbounded user_ids into Prometheus labels.',
        whyItMatters: 'Prevents privacy breaches and telemetry cardinality explosions.'
      },
      {
        doThis: 'Propagate one end-to-end deadline and circuit breakers across retrieval, LLM, and tool calls.',
        avoidThis: 'Allowing slow downstream dependencies to exhaust all worker threads.',
        whyItMatters: 'Enables graceful degradation instead of cascading outages.'
      }
    ]
  },
  11: {
    scenarioContext: 'Shipping an integrated enterprise knowledge & agentic operations platform',
    withoutConcept: {
      headline: 'Disconnected Prototypes That Fail Security & Ops Review',
      whatBreaks: 'Building isolated notebooks without threat models, ADRs, vertical-slice contracts, or rollback drills stalls projects permanently in pilot purgatory.',
      symptom: 'Great demo slides that fail InfoSec sign-off and break under real traffic.'
    },
    withConcept: {
      headline: 'Production-Ready Vertical Slice with Full Governance',
      whatIsAchieved: 'Threat-modeled trust boundaries, verified tenant RAG, human-approved MCP/A2A mutations, and signed canary delivery ship safely to production.',
      proofSignal: 'Passes security, evaluation, SLO, and disaster-recovery acceptance gates.'
    },
    metrics: [
      { label: 'InfoSec Sign-Off', withoutValue: 'Blocked', withValue: 'Verified STRIDE', gainSummary: 'Documented controls' },
      { label: 'Vertical Slice', withoutValue: 'Fragmented demos', withValue: 'End-to-end tested', gainSummary: 'Real contract parity' },
      { label: 'Recovery RPO/RTO', withoutValue: 'Untested', withValue: 'Drilled & measured', gainSummary: 'Proven resilience' }
    ],
    bestPractices: [
      {
        doThis: 'Ship one secure, measurable vertical slice end to end before multiplying features.',
        avoidThis: 'Building 10 half-wired agents before proving auth, citations, and rollback.',
        whyItMatters: 'De-risks the hardest architectural boundaries immediately.'
      },
      {
        doThis: 'Write concise ADRs and STRIDE + AI abuse threat models with negative regression tests.',
        avoidThis: 'Treating security and observability as post-launch add-ons.',
        whyItMatters: 'Negative tests prove your defenses stay intact on every commit.'
      },
      {
        doThis: 'Test full-bundle rollback and backup restore drills before opening production traffic.',
        avoidThis: 'Assuming rollback works without ever running it.',
        whyItMatters: 'Eliminates panic during real incidents.'
      }
    ]
  },
  12: interactiveTopicOutcomes['llmops-kv-batching']
}

const slugOverrides: Record<string, string> = {
  vectors: 'math-vectors-similarity',
  calculus: 'math-gradient-descent',
  optimization: 'math-gradient-descent',
  'python-core': 'py-async-batching',
  'numpy-pandas': 'py-data-pipelines',
  'data-quality': 'py-data-pipelines',
  'linear-regression': 'ml-bias-variance',
  'logistic-regression': 'ml-bias-variance',
  trees: 'ml-bias-variance',
  metrics: 'ml-bias-variance',
  perceptron: 'dl-neural-backprop',
  forward: 'dl-neural-backprop',
  backprop: 'dl-neural-backprop',
  optimizers: 'dl-neural-backprop',
  tokenization: 'genai-attention-decoding',
  embeddings: 'math-vectors-similarity',
  attention: 'genai-attention-decoding',
  multihead: 'genai-attention-decoding',
  decoder: 'genai-attention-decoding',
  sampling: 'genai-attention-decoding',
  inference: 'llmops-kv-batching',
  chunking: 'genai-rag-hybrid',
  'rag-embeddings': 'math-vectors-similarity',
  retrieval: 'genai-rag-hybrid',
  generation: 'genai-rag-hybrid',
  reranking: 'genai-rag-hybrid',
  'rag-eval': 'llmops-eval-canary',
  'agent-loop': 'agents-loop-budgets',
  state: 'agents-durable-checkpoints',
  'human-loop': 'agents-durable-checkpoints',
  durable: 'agents-durable-checkpoints',
  'eval-ci': 'llmops-eval-canary',
  serving: 'llmops-kv-batching',
  rollouts: 'llmops-eval-canary',
  'agent-orchestration': 'agents-durable-checkpoints',
  'advanced-retrieval': 'genai-rag-hybrid',
  'evaluation-scale': 'llmops-eval-canary',
  'inference-performance': 'llmops-kv-batching'
}

export function getLessonOutcomeProfile(stageNumber: number, topicId: string): WithWithoutBestPractice {
  const mappedKey = slugOverrides[topicId]
  if (mappedKey && interactiveTopicOutcomes[mappedKey]) {
    return interactiveTopicOutcomes[mappedKey]
  }
  return stageProfiles[stageNumber] ?? interactiveTopicOutcomes['py-data-pipelines']
}

/**
 * Generates clean, valid Mermaid flowchart TD syntax from any lesson's workflow steps
 * so all 93 lessons automatically get a synchronized live Mermaid visualization.
 */
export function buildWorkflowMermaid(workflowSteps: string[]): {
  syntax: string
  nodeIds: string[]
  nodeLabels: Record<string, string>
} {
  const safeSteps = (workflowSteps.length ? workflowSteps : ['Define inputs', 'Run transformation', 'Verify output']).slice(0, 8)
  const nodeIds: string[] = []
  const nodeLabels: Record<string, string> = {}
  const lines: string[] = ['flowchart TD']

  safeSteps.forEach((step, idx) => {
    const id = `S${idx + 1}`
    nodeIds.push(id)
    // Strip quotes/brackets/special mermaid tokens safely and keep labels concise
    const cleaned = step
      .replace(/["`<>[\]{}|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    const shortLabel = cleaned.length > 52 ? `${cleaned.slice(0, 49)}...` : cleaned
    nodeLabels[id] = cleaned
    lines.push(`    ${id}["${String(idx + 1).padStart(2, '0')}. ${shortLabel}"]`)
    if (idx > 0) {
      lines.push(`    S${idx} --> ${id}`)
    }
  })

  return { syntax: lines.join('\n'), nodeIds, nodeLabels }
}
