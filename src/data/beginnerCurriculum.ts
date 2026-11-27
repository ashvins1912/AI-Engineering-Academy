import { beginnerTopicsPart1 } from './beginnerCurriculumPart1'
import { beginnerTopicsPart2 } from './beginnerCurriculumPart2'
import type {
  BeginnerCurriculumStage,
  BeginnerCurriculumTopic,
  SimulatorResult
} from './beginnerCurriculumTypes'

export * from './beginnerCurriculumTypes'

export const beginnerStages: BeginnerCurriculumStage[] = [
  {
    id: 'foundations-python-data',
    stageNumber: 1,
    title: 'Python & Data Foundations',
    subtitle: 'Leakage-free data prep, typed schemas, and batched loading'
  },
  {
    id: 'math-intuition',
    stageNumber: 2,
    title: 'Math Intuition',
    subtitle: 'Vectors, cosine similarity, derivatives, and gradient descent'
  },
  {
    id: 'ml-deep-learning',
    stageNumber: 3,
    title: 'ML & Deep Learning',
    subtitle: 'Overfitting control, regularization, neural layers, and backpropagation'
  },
  {
    id: 'genai-rag',
    stageNumber: 4,
    title: 'GenAI, Transformers & RAG',
    subtitle: 'Tokens, self-attention, temperature decoding, chunking, and hybrid RAG'
  },
  {
    id: 'durable-multi-agent',
    stageNumber: 5,
    title: 'Durable Multi-Agent Orchestration',
    subtitle: 'Bounded tool loops, checkpoints, idempotency, and human approval'
  },
  {
    id: 'inference-llmops',
    stageNumber: 6,
    title: 'Inference Performance & LLMOps',
    subtitle: 'KV cache, continuous batching, quantization, CI evals, and canary rollouts'
  }
]

export const beginnerTopics: BeginnerCurriculumTopic[] = [
  ...beginnerTopicsPart1,
  ...beginnerTopicsPart2
]

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))
const num = (values: Record<string, number | boolean>, key: string, fallback: number): number => {
  const v = values[key]
  return typeof v === 'number' ? v : fallback
}
const bool = (values: Record<string, number | boolean>, key: string, fallback: boolean): boolean => {
  const v = values[key]
  return typeof v === 'boolean' ? v : fallback
}

export function getDefaultSimulatorValues(topic: BeginnerCurriculumTopic): Record<string, number | boolean> {
  return Object.fromEntries(topic.simulatorConfig.controls.map(c => [c.id, c.defaultValue]))
}

export function evaluateTopicSimulation(
  topicId: string,
  values: Record<string, number | boolean>
): SimulatorResult {
  switch (topicId) {
    case 'py-data-pipelines': {
      const split = num(values, 'train_split_ratio', 80)
      const cap = num(values, 'outlier_cap_pct', 96)
      const impute = bool(values, 'median_impute', true)
      const accuracy = clamp(
        91 - Math.abs(split - 80) * 0.35 - Math.abs(cap - 95) * 0.65 - (impute ? 0 : 5.5),
        48,
        96
      )
      const latency = Math.round(18 + split * 0.45 + (impute ? 9 : 2))
      const cost = Number((0.0004 + (split / 100) * 0.0018).toFixed(4))
      const breaking = split >= 94 || cap === 100 || split <= 54
      const tradeoff = !breaking && (!impute || cap < 88 || split > 88 || split < 70)
      return {
        simulatedOutput:
          split >= 94
            ? `Test split is only ${100 - split}% of rows — validation accuracy swings wildly (+/- 9%) and hides real defects.`
            : cap === 100
              ? `Raw outlier (age=999) survived uncapped — linear feature scaling compressed all valid ages into [0.02, 0.08].`
              : impute
                ? `Split ${split}/${100 - split} clean: 100% of rows preserved via train-only median imputation and p${cap} outlier clipping.`
                : `Split ${split}/${100 - split}: dropped 14% of valid customer rows due to missing ages instead of imputing.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: Math.round(split * 12),
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason:
          split >= 94
            ? 'Held-out test set is too small to trust evaluation.'
            : cap === 100
              ? 'Uncapped outliers distort feature scales.'
              : impute
                ? 'Balanced train/test split with clean train-only statistics.'
                : 'Dropping rows reduces sample diversity.'
      }
    }

    case 'py-async-batching': {
      const batch = num(values, 'batch_size', 32)
      const workers = num(values, 'worker_count', 4)
      const strict = bool(values, 'strict_schema', true)
      const accuracy = clamp((strict ? 98 : 74) - (batch > 192 ? 10 : 0) - (workers > 9 ? 5 : 0), 55, 99)
      const latency = Math.round(1800 / (Math.min(batch, 64) * Math.min(workers, 6)) + batch * 0.85 + (workers > 8 ? 220 : 0))
      const cost = Number((0.002 + (1 / Math.max(batch, 1)) * 0.04 + workers * 0.0005).toFixed(4))
      const breaking = !strict || batch > 192 || workers > 9 || batch === 1
      const tradeoff = !breaking && (batch < 8 || batch > 128 || workers > 6)
      return {
        simulatedOutput: !strict
          ? `Malformed records (null text, bad types) passed unchecked and caused downstream NaN errors.`
          : batch > 192
            ? `Batch size ${batch} exceeded worker memory budget — payload chunk split & tail latency spiked.`
            : workers > 9
              ? `${workers} parallel workers triggered HTTP 429 rate-limit throttling from downstream API.`
              : `Packing ${batch} validated records/batch across ${workers} workers achieved smooth bulk throughput.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: batch * workers * 25,
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason: !strict
          ? 'Schema validation disabled.'
          : batch > 192
            ? 'Oversized batch risks OOM & payload limits.'
            : workers > 9
              ? 'Too many concurrent workers trigger rate limits.'
              : batch === 1
                ? 'Single-item requests waste network overhead.'
                : 'Healthy batch size and bounded worker concurrency.'
      }
    }

    case 'math-vectors-similarity': {
      const dims = num(values, 'vector_dims', 384)
      const thresh = num(values, 'similarity_threshold', 0.72)
      const norm = bool(values, 'normalize_vectors', true)
      const accuracy = clamp(84 + Math.log2(dims / 64) * 2.2 - Math.abs(thresh - 0.74) * 68 - (norm ? 0 : 7.5), 42, 97)
      const latency = Math.round(6 + (dims / 128) * 3.8 + (norm ? 0 : 5))
      const cost = Number((0.0005 + (dims / 1536) * 0.0045).toFixed(4))
      const breaking = thresh >= 0.9 || thresh <= 0.45 || !norm
      const tradeoff = !breaking && (dims >= 1280 || dims <= 128 || thresh > 0.84)
      return {
        simulatedOutput:
          thresh >= 0.9
            ? `Threshold ${thresh.toFixed(2)} rejected valid paraphrased matches ("orbital launch" scored 0.86) — returning 0 results.`
            : thresh <= 0.45
              ? `Threshold ${thresh.toFixed(2)} admitted unrelated cooking articles (score 0.48) into top results.`
              : !norm
                ? `Unnormalized dot product ranked a 10-page document above a precise 1-sentence match due to vector length bias.`
                : `Unit-normalized ${dims}-dim vectors with cutoff ${thresh.toFixed(2)} retrieved exact semantic neighbors cleanly.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: Math.round(dims * 0.8),
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason:
          thresh >= 0.9
            ? 'Cutoff too strict — recall collapses.'
            : thresh <= 0.45
              ? 'Cutoff too loose — precision floods with noise.'
              : !norm
                ? 'Length bias distorts raw dot product.'
                : 'Balanced semantic precision and vector index speed.'
      }
    }

    case 'math-gradient-descent': {
      const lr = num(values, 'learning_rate', 0.2)
      const steps = num(values, 'steps', 20)
      const momentum = bool(values, 'momentum', false)
      // Simulate w starting at 0.0 minimizing (w - 3)^2
      let w = 0.0
      let v = 0.0
      let diverged = false
      for (let i = 0; i < steps; i++) {
        const grad = 2 * (w - 3.0)
        if (momentum) {
          v = 0.6 * v + lr * grad
          w = w - v
        } else {
          w = w - lr * grad
        }
        if (!Number.isFinite(w) || Math.abs(w) > 500) {
          diverged = true
          break
        }
      }
      const dist = diverged ? 999 : Math.abs(w - 3.0)
      const accuracy = diverged ? 5 : clamp(100 - dist * 28, 12, 99.8)
      const latency = Math.round(4 + steps * 1.4)
      const cost = Number((0.0002 + steps * 0.00008).toFixed(4))
      const breaking = diverged || lr >= 0.95 || dist > 1.2
      const tradeoff = !breaking && (dist > 0.25 || lr > 0.75)
      return {
        simulatedOutput: diverged || lr >= 1.0
          ? `DIVERGED! With lr=${lr.toFixed(2)}, each step jumped past the valley (w=3.0) and error exploded toward Infinity.`
          : dist > 0.8
            ? `Crawling slowly: after ${steps} steps at lr=${lr.toFixed(2)}, weight only reached w=${w.toFixed(2)} (target is 3.00).`
            : `Smooth convergence: weight moved 0.00 → ${w.toFixed(3)} (target 3.000), residual loss = ${(dist * dist).toFixed(4)}.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: steps * 16,
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason:
          diverged || lr >= 1.0
            ? 'Learning rate ≥ 1.0 overshoots the valley and explodes.'
            : dist > 0.8
              ? 'Learning rate too small for current step count.'
              : 'Converged cleanly to minimum error.'
      }
    }

    case 'ml-bias-variance': {
      const depth = num(values, 'tree_depth', 6)
      const lam = num(values, 'reg_lambda', 1.5)
      const cv = bool(values, 'cross_val', true)
      const trainAcc = clamp(65 + Math.min(depth, 15) * 2.4 - lam * 1.5, 58, 99.5)
      const underfitPen = depth < 5 ? (5 - depth) * 6.5 : 0
      const overfitPen = depth > 7 ? Math.max(0, (depth - 7) * (2.2 - Math.min(lam, 3.5) * 0.35)) : 0
      const overRegPen = lam > 3.5 ? (lam - 3.5) * 4.5 : 0
      const valAcc = clamp(91.5 - underfitPen - overfitPen - overRegPen + (cv ? 1.8 : -2.2), 52, 95)
      const gap = Math.max(0, trainAcc - valAcc)
      const latency = Math.round((12 + depth * 4.5) * (cv ? 3.2 : 1))
      const cost = Number((0.001 + depth * 0.0003 * (cv ? 4 : 1)).toFixed(4))
      const breaking = gap > 12 || depth <= 2 || (lam >= 4.5 && depth <= 4)
      const tradeoff = !breaking && (gap > 7 || !cv || depth > 11)
      return {
        simulatedOutput:
          depth <= 2
            ? `UNDERFITTING: Depth ${depth} is too shallow (Train ${trainAcc.toFixed(1)}% / Val ${valAcc.toFixed(1)}%) — missing key patterns.`
            : gap > 12
              ? `OVERFITTING: Train hit ${trainAcc.toFixed(1)}% but Validation fell to ${valAcc.toFixed(1)}% (gap ${gap.toFixed(1)}%) — memorizing noise!`
              : `Balanced generalization: Train ${trainAcc.toFixed(1)}% vs Validation ${valAcc.toFixed(1)}% (healthy ${gap.toFixed(1)}% gap).`,
        accuracyScore: Number(valAcc.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: depth * (cv ? 150 : 40),
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason:
          depth <= 2
            ? 'Model complexity too low (high bias).'
            : gap > 12
              ? 'Severe train-validation gap (high variance / overfitting).'
              : 'Low bias and controlled variance.'
      }
    }

    case 'dl-neural-backprop': {
      const units = num(values, 'hidden_units', 64)
      const dropout = num(values, 'dropout_rate', 0.2)
      const batch = num(values, 'batch_size', 32)
      const dropPen = dropout > 0.45 ? (dropout - 0.45) * 75 : Math.abs(dropout - 0.2) * 14
      const widthGain = Math.min(units, 128) * 0.07 - (units > 192 && dropout < 0.1 ? 6 : 0)
      const accuracy = clamp(85 + widthGain - dropPen, 42, 95.5)
      const latency = Math.round(8 + units * 0.16 + batch * 0.22)
      const cost = Number((0.0012 + (units / 256) * 0.006 + (128 / batch) * 0.0008).toFixed(4))
      const breaking = dropout >= 0.6 || units <= 8
      const tradeoff = !breaking && (dropout === 0 || units >= 200 || batch <= 8)
      return {
        simulatedOutput:
          dropout >= 0.6
            ? `Signal starved: ${Math.round(dropout * 100)}% of neurons are randomly muted each step — gradients collapse and accuracy plunges.`
            : units <= 8
              ? `Bottleneck layer (${units} neurons) cannot capture non-linear feature combinations.`
              : dropout === 0 && units >= 192
                ? `Wide ${units}-neuron layer with 0% dropout memorizes training batches quickly — add 0.2 dropout.`
                : `${units} ReLU units + ${Math.round(dropout * 100)}% dropout on batch ${batch} produces stable backward gradients.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: units * 6,
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason:
          dropout >= 0.6
            ? 'Excessive dropout destroys forward & backward signal.'
            : units <= 8
              ? 'Hidden width too small for complex patterns.'
              : 'Clean gradient flow and regularized capacity.'
      }
    }

    case 'genai-attention-decoding': {
      const temp = num(values, 'temperature', 0.3)
      const topP = num(values, 'top_p', 0.9)
      const maxTok = num(values, 'max_output_tokens', 200)
      const accuracy = clamp(96 - Math.max(0, temp - 0.4) * 26 - (topP > 0.95 && temp > 1.0 ? 8 : 0), 40, 97)
      const latency = Math.round(140 + maxTok * 6.5)
      const cost = Number((350 * 0.0000015 + maxTok * 0.000006).toFixed(5))
      const breaking = temp >= 1.3
      const tradeoff = !breaking && (temp >= 0.8 || maxTok >= 600)
      return {
        simulatedOutput:
          temp >= 1.3
            ? `{"city": "Paris-ish croissant nebula!!", ...} — High temperature (${temp.toFixed(1)}) flattened softmax odds and broke factual JSON!`
            : temp >= 0.8
              ? `Creative prose: "Paris, the glowing City of Light along the Seine..." — Good for brainstorming, risky for strict extraction.`
              : `{"capital": "Paris", "country": "France"} — Focused temperature (${temp.toFixed(1)}) & top-p (${topP.toFixed(2)}) kept output exact.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: 350 + maxTok,
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason:
          temp >= 1.3
            ? 'High temperature causes hallucinations and syntax errors.'
            : temp >= 0.8
              ? 'Higher creativity trades off deterministic repeatability.'
              : 'Reliable, crisp decoding within latency budget.'
      }
    }

    case 'genai-rag-hybrid': {
      const chunk = num(values, 'chunk_size', 350)
      const topK = num(values, 'top_k', 4)
      const rerank = bool(values, 'hybrid_rerank', true)
      const ctxTokens = chunk * topK + 200
      const chunkPen = chunk < 200 ? (200 - chunk) * 0.11 : chunk > 600 ? (chunk - 600) * 0.025 : 0
      const kPen = topK < 2 ? 12 : topK > 8 ? (topK - 8) * 1.9 : 0
      const accuracy = clamp(85 + (rerank ? 9.5 : 0) - chunkPen - kPen, 48, 96.5)
      const latency = Math.round(180 + (rerank ? 115 : 35) + chunk * topK * 0.08)
      const cost = Number((ctxTokens * 0.000002 + 0.0009).toFixed(4))
      const breaking = ctxTokens > 7500 || chunk <= 120 || topK === 1
      const tradeoff = !breaking && (!rerank || ctxTokens > 4000 || chunk > 650)
      return {
        simulatedOutput:
          ctxTokens > 7500
            ? `Context bloat (${ctxTokens.toLocaleString()} tokens)! Answer buried in middle of ${topK} giant chunks — latency & cost spiked.`
            : chunk <= 120
              ? `Tiny ${chunk}-token chunks sliced the refund exception rule off from the policy header — incomplete citation.`
              : topK === 1
                ? `Top-1 retrieval missed a multi-sentence policy nuance; raising top_k to 3–5 restores recall.`
                : `Retrieved ${topK} focused ${chunk}-token passages (${ctxTokens.toLocaleString()} tokens) ${rerank ? '+ Cross-Encoder Rerank ' : ''}→ cited answer verified.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: ctxTokens,
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason:
          ctxTokens > 7500
            ? 'Massive prompt triggers lost-in-the-middle & high token spend.'
            : chunk <= 120
              ? 'Chunks too fragmented to preserve sentence meaning.'
              : topK === 1
                ? 'Single chunk lacks fallback recall.'
                : 'High-precision retrieval with tight token budget.'
      }
    }

    case 'agents-loop-budgets': {
      const steps = num(values, 'max_steps', 5)
      const timeout = num(values, 'tool_timeout_ms', 1200)
      const gate = bool(values, 'strict_policy_gate', true)
      const accuracy = clamp(
        (steps < 2 ? 54 : 93 - Math.max(0, steps - 8) * 2.2) - (gate ? 0 : 32) - (timeout < 300 ? 14 : 0),
        35,
        95
      )
      const latency = Math.round(steps * (320 + Math.min(timeout, 1800) * 0.35))
      let totalTokens = 0
      for (let t = 1; t <= steps; t++) totalTokens += 600 + t * 350
      const cost = Number((totalTokens * 0.000003).toFixed(4))
      const breaking = !gate || steps === 1 || steps >= 12 || timeout < 300
      const tradeoff = !breaking && (steps >= 9 || timeout >= 3500)
      return {
        simulatedOutput: !gate
          ? `SECURITY BREACH: Prompt injection proposed "export_all_users" — with policy gate OFF, unauthorized tool ran!`
          : steps === 1
            ? `Budget stopped at step 1/1 after lookup — agent couldn’t finish the discount calculation (safe incomplete stop).`
            : steps >= 12
              ? `Runaway loop risk: ${steps} turns accumulated ${totalTokens.toLocaleString()} cumulative tokens (~$${cost.toFixed(3)}/run).`
              : timeout < 300
                ? `${timeout}ms tool timeout cut off healthy database lookups before responses returned.`
                : `Bounded ${steps}-step agent verified every tool against server allow-list and completed safely.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: totalTokens,
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason: !gate
          ? 'Disabling server-side policy gate breaks security boundary.'
          : steps >= 12
            ? 'High step cap allows quadratic token spend on stuck loops.'
            : steps === 1
              ? 'Step budget too small for multi-tool tasks.'
              : 'Safe bounded reasoning with enforced permissions.'
      }
    }

    case 'agents-durable-checkpoints': {
      const interval = num(values, 'checkpoint_interval', 1)
      const retries = num(values, 'retry_limit', 2)
      const hitl = bool(values, 'require_human_approval', true)
      const accuracy = clamp(
        96 - (interval - 1) * 4.5 - (hitl ? 0 : 16) - (retries === 0 ? 11 : retries > 5 ? 6 : 0),
        48,
        98
      )
      const latency = Math.round(240 + interval * 140 + retries * 190 + (hitl ? 600 : 0))
      const cost = Number((0.004 + interval * 0.0022 + retries * 0.0018).toFixed(4))
      const breaking = !hitl || retries >= 6 || interval >= 5
      const tradeoff = !breaking && (retries === 0 || interval >= 3)
      return {
        simulatedOutput: !hitl
          ? `UNAPPROVED MUTATION: Agent issued a $450 refund automatically without manager sign-off on the action hash.`
          : retries >= 6
            ? `Retry storm (${retries} retries): transient outage kept workers locked and multiplied token & API load.`
            : interval >= 5
              ? `Crash at step 4 wiped all unsaved progress — workflow had to replay from step 0 and pay for 4 LLM calls twice.`
              : `Step-by-step checkpoints + idempotency key + human sign-off recovered from crash with exactly 1 side effect.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: cost,
        tokenEstimate: Math.round(1400 + interval * 600 + retries * 450),
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason: !hitl
          ? 'High-impact mutations require human approval.'
          : retries >= 6
            ? 'Excessive retries amplify outages.'
            : interval >= 5
              ? 'Infrequent checkpoints waste work after crashes.'
              : 'Durable, idempotent, human-governed execution.'
      }
    }

    case 'llmops-kv-batching': {
      const batch = num(values, 'batch_size', 16)
      const bits = num(values, 'quant_bits', 8)
      const kv = bool(values, 'kv_cache_enabled', true)
      const vramUsedGb = Number(((bits === 16 ? 14 : bits === 8 ? 7.5 : 4.2) + batch * (kv ? 0.32 : 0.08)).toFixed(1))
      const oom = vramUsedGb > 24
      const accuracy = clamp((bits === 16 ? 97 : bits === 8 ? 95.5 : 91) - (oom ? 38 : 0), 40, 98)
      const latency = Math.round((kv ? 110 : 780) + batch * (bits === 16 ? 9.5 : bits === 8 ? 6.2 : 4.4) + (oom ? 1200 : 0))
      const costPer1M = Number(((1.45 / Math.sqrt(batch)) * (bits / 8) * (kv ? 1 : 3.2)).toFixed(3))
      const breaking = oom || !kv
      const tradeoff = !breaking && (batch <= 2 || batch >= 48 || bits === 4)
      return {
        simulatedOutput: oom
          ? `CUDA OOM! Estimated ${vramUsedGb} GB exceeds 24 GB GPU VRAM (batch=${batch} at ${bits}-bit) — lower batch_size or quantize to 8-bit/4-bit.`
          : !kv
            ? `KV Cache OFF: GPU recomputed all prompt tokens on every generated word — latency jumped to ${latency} ms.`
            : `Continuous batching ${batch} sequences at ${bits}-bit (${vramUsedGb}/24 GB VRAM) → $${costPer1M.toFixed(2)} per 1M tokens.`,
        accuracyScore: Number(accuracy.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: Number((costPer1M / 1000).toFixed(4)),
        tokenEstimate: batch * 512,
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason: oom
          ? `VRAM overflow (${vramUsedGb} GB > 24 GB GPU cap).`
          : !kv
            ? 'Disabling KV cache destroys decode speed.'
            : 'High GPU efficiency within safe VRAM headroom.'
      }
    }

    case 'llmops-eval-canary': {
      const canary = num(values, 'canary_pct', 5)
      const floor = num(values, 'quality_floor', 90)
      const cache = bool(values, 'semantic_cache', true)
      const safety = clamp(floor * 0.92 + (canary <= 10 ? 11 : -(canary - 10) * 0.25), 45, 99)
      const latency = Math.round((cache ? 410 : 980) + canary * 1.8)
      const costPer1k = Number(((cache ? 3.8 : 6.9) + (floor < 85 ? 2.4 : 0)).toFixed(2))
      const breaking = canary >= 50 || floor < 80
      const tradeoff = !breaking && (!cache || canary > 15 || floor >= 98)
      return {
        simulatedOutput:
          canary >= 50
            ? `HIGH BLAST RADIUS: Routing ${canary}% of users straight to an unproven prompt risks widespread customer failure.`
            : floor < 80
              ? `Weak CI Gate (${floor}%): buggy prompt passed CI, forcing customer retries and inflating FinOps spend to $${costPer1k}/1k tasks.`
              : `Safe ${canary}% canary gated at ≥${floor}% golden accuracy ${cache ? '+ tenant-scoped cache ' : ''}→ $${costPer1k} per 1k successful tasks.`,
        accuracyScore: Number(safety.toFixed(1)),
        latencyMs: latency,
        tokenCostUsd: Number((costPer1k / 1000).toFixed(4)),
        tokenEstimate: cache ? 650 : 1450,
        healthStatus: breaking ? 'breaking' : tradeoff ? 'tradeoff' : 'optimal',
        healthLabel: breaking ? 'Breaking Point' : tradeoff ? 'Trade-off' : 'Optimal',
        healthReason:
          canary >= 50
            ? 'Initial canary blast radius is dangerously wide.'
            : floor < 80
              ? 'CI quality gate is too weak to block regressions.'
              : 'Measured rollout with fail-closed gates and low unit cost.'
      }
    }

    default:
      return {
        simulatedOutput: 'Simulation active.',
        accuracyScore: 90,
        latencyMs: 120,
        tokenCostUsd: 0.002,
        tokenEstimate: 400,
        healthStatus: 'optimal',
        healthLabel: 'Optimal',
        healthReason: 'Nominal parameters.'
      }
  }
}
