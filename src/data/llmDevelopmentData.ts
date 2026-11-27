export type LlmMasterTabId =
  | 'llm-lifecycle'
  | 'trained-vs-untrained'
  | 'why-llm-internals'
  | 'pretraining-algorithms'
  | 'ml-models-taxonomy'

export type LifecycleStep = {
  step: number
  nodeId: string
  title: string
  stageType: string
  plainMeaning: string
  algorithmUsed: string
  dataIn: string
  dataOut: string
  metricsSnapshot: Record<string, string | number | boolean>
}

export const llmLifecycleMermaid = `flowchart TD
  DATA["1. Corpus Curation & Deduplication (15T Tokens)"] --> TOK["2. BPE Tokenizer Training (100k Vocab)"]
  TOK --> INIT["3. Untrained Transformer Init (Random Weights)"]
  INIT --> PRE["4. Pretraining (Self-Supervised Next-Token Loss)"]
  PRE --> SFT["5. Supervised Fine-Tuning (Instruction Pairs)"]
  SFT --> ALIGN["6. Alignment (RLHF / DPO / Constitutional AI)"]
  ALIGN --> RLVR["7. Reasoning RL (Verifiable Rewards & Thinking)"]
  RLVR --> SERVE["8. Quantization, CI Evals & vLLM Deployment"]`

export const llmLifecycleSteps: LifecycleStep[] = [
  {
    step: 1,
    nodeId: 'DATA',
    title: '1. Massive Data Curation, Deduplication & Filtering',
    stageType: 'Data Engineering',
    plainMeaning:
      'Before any GPU trains, engineers clean web pages, code repos, papers, and books—removing duplicates, spam, PII, and toxic text. Data quality beats raw parameter count every time.',
    algorithmUsed: 'MinHash LSH fuzzy deduplication + quality classifier filtering + domain mixing',
    dataIn: '100+ TB raw internet crawls, GitHub repositories, books, scientific papers',
    dataOut: '10T–15T clean, deduplicated, balanced training tokens',
    metricsSnapshot: { raw_tb: 120, dedup_removed_pct: 64, clean_tokens_trillion: 15, human_labels_needed: 0 }
  },
  {
    step: 2,
    nodeId: 'TOK',
    title: '2. Subword Tokenizer Training (BPE)',
    stageType: 'Representation',
    plainMeaning:
      'Computers cannot multiply raw words. Byte-Pair Encoding (BPE) iteratively merges frequent byte/character pairs into a fixed vocabulary (e.g. 100,000 subword IDs) so every language and code symbol maps cleanly to integers.',
    algorithmUsed: 'Byte-Pair Encoding (BPE) / Unigram LM greedy merge algorithm',
    dataIn: 'Representative multilingual text + code sample',
    dataOut: 'Vocabulary table (V = 100,000) + reversible encode/decode rules',
    metricsSnapshot: { vocab_size: 100277, avg_chars_per_token: 4.1, unknown_tokens_pct: 0 }
  },
  {
    step: 3,
    nodeId: 'INIT',
    title: '3. Untrained Architecture Initialization (Pure Random Noise)',
    stageType: 'Untrained State',
    plainMeaning:
      'The Transformer skeleton is allocated on GPUs with billions of numbers drawn from random Gaussian noise. At this moment, the model knows ZERO grammar, facts, or reasoning—every next word is an equal random guess.',
    algorithmUsed: 'Scaled Normal / Xavier-He initialization N(0, 0.02²)',
    dataIn: 'Hyperparameters: layers L, hidden width d_model, GQA heads, SwiGLU width',
    dataOut: 'Untrained weight tensors (loss ≈ ln(V) ≈ 11.5, perplexity ≈ 100,000)',
    metricsSnapshot: { state: 'UNTRAINED', initial_loss: 11.51, perplexity: 100000, useful_output: false }
  },
  {
    step: 4,
    nodeId: 'PRE',
    title: '4. Pretraining (Self-Supervised Next-Token Prediction)',
    stageType: 'Base Model Creation (95% of Compute)',
    plainMeaning:
      'For weeks across thousands of GPUs, the model reads trillions of tokens and repeatedly predicts the next token. Every single mistake triggers backpropagation and AdamW weight updates—compressing language, code, logic, and world facts into the weights.',
    algorithmUsed: 'Cross-Entropy Loss + Backpropagation + AdamW + Cosine LR + 3D Parallelism',
    dataIn: '15T clean token sequences + random weights',
    dataOut: 'Pretrained Base Model (world knowledge mastered, but still a raw text completer)',
    metricsSnapshot: { compute_share_pct: 95, final_loss: 1.68, perplexity: 5.37, state: 'PRETRAINED_BASE' }
  },
  {
    step: 5,
    nodeId: 'SFT',
    title: '5. Supervised Fine-Tuning (Instruction & Tool Following)',
    stageType: 'Post-Training Stage 1',
    plainMeaning:
      'A base model completes text like a document instead of answering you. SFT trains on 50k–500k high-craft (User Prompt → Ideal Assistant Reply) examples so the model learns turn-taking, JSON formatting, and tool calling.',
    algorithmUsed: 'Supervised Cross-Entropy masked strictly on assistant response tokens',
    dataIn: 'Pretrained Base Model + curated expert instruction & tool-call dialogues',
    dataOut: 'SFT Instruct Model (follows instructions, not yet preference-calibrated)',
    metricsSnapshot: { curated_examples: 250000, compute_share_pct: 2, instruction_follow_pct: 84 }
  },
  {
    step: 6,
    nodeId: 'ALIGN',
    title: '6. Preference Alignment (RLHF / DPO / Constitutional AI)',
    stageType: 'Post-Training Stage 2',
    plainMeaning:
      'Humans or Constitutional AI principles rank pairs of candidate answers (helpful & honest vs. harmful or sycophantic). Reinforcement learning or DPO steers the model toward safe, truthful, calibrated outputs with a KL penalty preventing drift.',
    algorithmUsed: 'PPO / DPO + Reward Model (ChatGPT) or Constitutional AI / RLAIF (Claude)',
    dataIn: 'SFT Model + preference pairs (chosen y⁺, rejected y⁻) + written Constitution',
    dataOut: 'Aligned Assistant Model (Helpful, Honest, Harmless)',
    metricsSnapshot: { safety_calibration_pct: 97, kl_penalty_beta: 0.1, refusal_precision: 0.96 }
  },
  {
    step: 7,
    nodeId: 'RLVR',
    title: '7. Reasoning RL (Verifiable Rewards & Extended Thinking)',
    stageType: 'Post-Training Stage 3',
    plainMeaning:
      'On coding, math, and logic tasks with automated unit tests, RL rewards the model only when final code/proofs verify. The model learns to self-check, backtrack, and spend thinking tokens on hard problems.',
    algorithmUsed: 'GRPO / Reinforcement Learning with Verifiable Rewards (RLVR)',
    dataIn: 'Aligned Model + unit-testable math/code environments',
    dataOut: 'Frontier Reasoning LLM (Claude Extended Thinking / OpenAI o-series)',
    metricsSnapshot: { unit_test_verified: true, reasoning_gain_pct: '+24%', self_correction: true }
  },
  {
    step: 8,
    nodeId: 'SERVE',
    title: '8. Quantization, Red-Teaming, CI Evals & vLLM Deployment',
    stageType: 'Production Serving',
    plainMeaning:
      'Weights are compressed (BF16 → FP8/INT4), red-teamed against prompt injection, gated by golden benchmarks, and served behind vLLM PagedAttention + Continuous Batching + Prefix Caching for fast, affordable live traffic.',
    algorithmUsed: 'FP8/AWQ Quantization + vLLM PagedAttention + CI Golden Eval Gates',
    dataIn: 'Aligned Reasoning Weights + Production Eval Suite',
    dataOut: 'Live Low-Latency API Endpoint with Guardrails & Redacted Observability',
    metricsSnapshot: { vram_reduction: '2×–4×', kv_waste_pct: 3.5, serving_ready: true }
  }
]

export type UntrainedComparisonRow = {
  dimension: string
  untrained: string
  pretrainedBase: string
  postTrainedAssistant: string
}

export const trainedVsUntrainedRows: UntrainedComparisonRow[] = [
  {
    dimension: 'Internal Weights',
    untrained: 'Random Gaussian noise N(0, 0.02²). Zero encoded patterns.',
    pretrainedBase: 'Billions of tuned weights encoding grammar, code, math, and world facts.',
    postTrainedAssistant: 'Same knowledge weights refined via SFT + RLHF/CAI for dialogue & safety.'
  },
  {
    dimension: 'Cross-Entropy Loss',
    untrained: '~10.8–11.5 (equals ln(vocab_size) — pure uniform guessing).',
    pretrainedBase: '~1.5–2.0 (confident next-token predictions on web/code text).',
    postTrainedAssistant: 'Calibrated on dialogue, refusal boundaries, and structured JSON/tools.'
  },
  {
    dimension: 'Perplexity (Choices per Word)',
    untrained: '~50,000–100,000 (totally confused at every single token).',
    pretrainedBase: '~4.5–7.5 (narrows 100k vocab down to ~5 plausible words).',
    postTrainedAssistant: 'Low perplexity on helpful answers; high refusal precision on attacks.'
  },
  {
    dimension: 'Prompt: "What is 2+2?"',
    untrained: '"xj9 banana {== 4021 purple..." (nonsense random tokens).',
    pretrainedBase: '"What is 3+3? What is 4+4? Quiz Worksheet #2..." (continues text!).',
    postTrainedAssistant: '"2 + 2 = 4." (Directly answers the user intent clearly).'
  },
  {
    dimension: 'Compute & Data Required',
    untrained: '$0 · 0 tokens · milliseconds to allocate.',
    pretrainedBase: '95%+ of total cost · 10T–15T unlabeled tokens · thousands of GPUs.',
    postTrainedAssistant: '<5% extra compute · 50k–500k high-quality examples + RL preferences.'
  }
]

export type LearningAlgorithmCard = {
  id: string
  name: string
  category: 'Core Optimization' | 'Supervised' | 'Unsupervised' | 'Self-Supervised' | 'Reinforcement'
  plainAnalogy: string
  mathRule: string
  whatItDoes: string
  usedInLlmWhere: string
  keyHyperparams: string[]
}

export const learningAlgorithms: LearningAlgorithmCard[] = [
  {
    id: 'backprop-sgd',
    name: 'Backpropagation & Gradient Descent',
    category: 'Core Optimization',
    plainAnalogy: 'Walking downhill blindfolded by feeling which direction slopes steepest downward and taking a measured step.',
    mathRule: 'W_new = W_old - η · (∂Loss / ∂W)',
    whatItDoes: 'Uses the calculus chain rule backward from the output error to compute exactly how much each of billions of weights contributed to the mistake, then nudges every weight to reduce error.',
    usedInLlmWhere: 'Every single forward/backward pass during Pretraining, SFT, and RLHF.',
    keyHyperparams: ['Learning rate (η)', 'Gradient clipping (1.0)', 'Batch size']
  },
  {
    id: 'adamw-cosine',
    name: 'AdamW Optimizer + Cosine Decay',
    category: 'Core Optimization',
    plainAnalogy: 'A smart hiker who builds downhill momentum on smooth slopes, slows down on bumpy terrain, and gently trims heavy gear (weight decay).',
    mathRule: 'm_t = β₁m_{t-1} + (1-β₁)g_t;  v_t = β₂v_{t-1} + (1-β₂)g_t²;  W ← (1-ηλ)W - η·m̂/√(v̂+ε)',
    whatItDoes: 'Tracks both the moving average direction (momentum) and variance of gradients per parameter so deep transformers converge smoothly without exploding.',
    usedInLlmWhere: 'The universal default optimizer for GPT, Claude, Llama, and Gemini pretraining.',
    keyHyperparams: ['β₁=0.9, β₂=0.95', 'Weight decay λ=0.1', 'Warmup + Cosine LR']
  },
  {
    id: 'self-supervised-clm',
    name: 'Self-Supervised Next-Token Learning (Pretraining)',
    category: 'Self-Supervised',
    plainAnalogy: 'Covering the next word in a library of 10 million books with your thumb, guessing it, uncovering it to check, and repeating trillions of times.',
    mathRule: 'L = - (1/T) Σ log P_θ(x_t | x_1, ..., x_{t-1})',
    whatItDoes: 'Turns unlabeled raw text and code into trillions of free supervision pairs automatically—no human labeling needed to absorb grammar, facts, and reasoning patterns.',
    usedInLlmWhere: 'Stage 4 Pretraining—creates the general-purpose Foundation / Base Model.',
    keyHyperparams: ['Context window (T)', 'Token budget (Chinchilla ~20× params)', 'Causal mask']
  },
  {
    id: 'supervised-learning',
    name: 'Supervised Learning (Labeled Input → Output)',
    category: 'Supervised',
    plainAnalogy: 'Studying flashcards where every question on the front has a verified expert answer on the back.',
    mathRule: 'min_θ Σ Loss(f_θ(x_i), y_i)',
    whatItDoes: 'Learns an explicit mapping from labeled inputs X to ground-truth targets Y (fraud/not-fraud, house price, or ideal assistant response).',
    usedInLlmWhere: 'Classical tabular ML (XGBoost/Logistic) AND Stage 5 Instruction SFT of LLMs.',
    keyHyperparams: ['Train/Val/Test split', 'Regularization', 'Epochs (watch overfit)']
  },
  {
    id: 'unsupervised-learning',
    name: 'Unsupervised Learning (Clustering & PCA)',
    category: 'Unsupervised',
    plainAnalogy: 'Sorting a box of unlabeled mixed hardware into natural piles by shape and size without anyone telling you the pile names.',
    mathRule: 'min Σ ||x_i - μ_{cluster(i)}||²',
    whatItDoes: 'Discovers hidden groupings, anomalies, or lower-dimensional structure in unlabeled data.',
    usedInLlmWhere: 'Corpus deduplication/clustering, semantic topic discovery, embedding visualization.',
    keyHyperparams: ['Number of clusters (k)', 'Distance metric (Cosine/L2)', 'Variance retained']
  },
  {
    id: 'rlhf-dpo-grpo',
    name: 'Reinforcement Learning (RLHF / DPO / Constitutional AI / GRPO)',
    category: 'Reinforcement',
    plainAnalogy: 'Coaching an athlete with a scoreboard + rules book: reward winning plays, penalize rule violations, and prevent wild ungrounded behavior.',
    mathRule: 'max_π E[ Reward(x, y) - β · KL(π(y|x) || π_ref(y|x)) ]',
    whatItDoes: 'Optimizes sequence-level qualities that simple next-word loss cannot capture directly—helpfulness, honesty, harmlessness, and verifiable multi-step reasoning.',
    usedInLlmWhere: 'Stages 6–7 Post-Training that transform Base Models into ChatGPT and Claude.',
    keyHyperparams: ['KL Penalty (β)', 'Preference dataset quality', 'Verifiable reward tests']
  }
]

export type MlModelFamily = {
  id: string
  name: string
  paradigm: string
  howItWorks: string
  bestFor: string
  avoidWhen: string
  interpretability: 'High' | 'Medium' | 'Low'
  typicalLatency: string
  examples: string
}

export const mlModelFamilies: MlModelFamily[] = [
  {
    id: 'linear',
    name: 'Linear & Logistic Models',
    paradigm: 'Supervised (Parametric)',
    howItWorks: 'Computes a weighted sum w₁x₁ + w₂x₂ + b (plus sigmoid for classification probabilities).',
    bestFor: 'Fast baselines, credit risk scoring, regulated pricing where every feature weight must be explained.',
    avoidWhen: 'Relationships are deeply non-linear, visual, or unstructured text.',
    interpretability: 'High',
    typicalLatency: '< 0.5 ms',
    examples: 'Linear Regression, Ridge/Lasso, Logistic Regression'
  },
  {
    id: 'gbdt',
    name: 'Decision Trees & Gradient Boosted Ensembles',
    paradigm: 'Supervised (Tabular)',
    howItWorks: 'Builds hundreds of sequential decision trees where each new tree corrects the residual errors of prior trees.',
    bestFor: 'Structured SQL/CSV tabular business data: fraud detection, churn prediction, demand forecasting, ranking.',
    avoidWhen: 'Input is raw unstructured paragraphs, images, or open-ended code generation.',
    interpretability: 'Medium',
    typicalLatency: '1–5 ms',
    examples: 'Random Forest, XGBoost, LightGBM, CatBoost'
  },
  {
    id: 'clustering',
    name: 'Clustering & Dimensionality Reduction',
    paradigm: 'Unsupervised',
    howItWorks: 'Groups nearby vectors into clusters or projects high-dimensional features onto principal axes.',
    bestFor: 'Customer segmentation, anomaly detection, compressing embeddings, exploring unlabeled datasets.',
    avoidWhen: 'You already have clean target labels and need supervised prediction accuracy.',
    interpretability: 'Medium',
    typicalLatency: '1–10 ms',
    examples: 'K-Means, HDBSCAN, PCA, UMAP'
  },
  {
    id: 'cnn-rnn',
    name: 'Classical Deep Neural Networks (MLP, CNN, LSTM)',
    paradigm: 'Supervised Deep Learning',
    howItWorks: 'Stacks non-linear layers (convolutional filters for spatial images or recurrent gates for short sequences).',
    bestFor: 'Edge/embedded computer vision, sensor time-series, ultra-low-latency specialized classifiers.',
    avoidWhen: 'Long-range sequence reasoning or multi-task language understanding (Transformers dominate here).',
    interpretability: 'Low',
    typicalLatency: '3–25 ms',
    examples: 'ResNet, ConvNeXt, YOLO, LSTM'
  },
  {
    id: 'encoder-transformer',
    name: 'Encoder Transformers & Embedding Models',
    paradigm: 'Self-Supervised + Contrastive',
    howItWorks: 'Bidirectional self-attention reads the full text at once and compresses meaning into dense vectors or relevance scores.',
    bestFor: 'RAG semantic retrieval, cross-encoder reranking, fast classification, PII/toxicity guardrails.',
    avoidWhen: 'You need to generate open-ended prose, code, or step-by-step reasoning.',
    interpretability: 'Low',
    typicalLatency: '8–30 ms',
    examples: 'BERT, DeBERTa, BGE-M3, Cohere Rerank'
  },
  {
    id: 'decoder-llm',
    name: 'Decoder-Only Foundation LLMs (Dense & MoE)',
    paradigm: 'Self-Supervised Pretraining + SFT + RLHF/CAI',
    howItWorks: 'Causal autoregressive Transformer predicting one token at a time using GQA attention, RoPE, SwiGLU, and KV caching.',
    bestFor: 'Reasoning, code generation, RAG synthesis, tool-calling agents, unstructured document extraction.',
    avoidWhen: 'Simple deterministic business rules or tabular SQL scoring where XGBoost is 1,000× cheaper and faster.',
    interpretability: 'Low',
    typicalLatency: '250–2,500 ms',
    examples: 'Claude 4/3.5, GPT-4o/o-series, Gemini, Llama 3, DeepSeek-V3'
  }
]
