import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Workflow,
  XCircle,
  Zap
} from 'lucide-react'
import {
  chatgptClaudeBuildMermaid,
  chatgptClaudeBuildSteps,
  claudeArchitectDfdMermaid,
  claudeArchitectDfdSteps,
  claudeArchitectPillars,
  evolutionEras,
  googleToVllmMermaid,
  googleToVllmSteps,
  transformerDfdMermaid,
  transformerDfdSteps,
  type DeepDiveTabId,
  type DfdStep
} from '../data/frontierArchitectureData'
import MermaidDiagram from './MermaidDiagram'
import SelfAttentionVisualizer from './SelfAttentionVisualizer'

const TABS: { id: DeepDiveTabId; shortLabel: string; title: string; subtitle: string }[] = [
  {
    id: 'dl-transformer',
    shortLabel: '01. DL & Transformer Internals',
    title: 'Deep Learning & Transformer Engine (Inside the Block)',
    subtitle: 'Trace live tensor shapes through Embeddings, RoPE, Causal GQA Attention, Residual Streams, and SwiGLU.'
  },
  {
    id: 'chatgpt-claude-build',
    shortLabel: '02. Inside ChatGPT & Claude',
    title: 'How ChatGPT & Claude Are Built End-to-End (Architecture & DFD)',
    subtitle: 'From 15T-token pretraining and SFT to RLHF, Constitutional AI (RLAIF), Extended Thinking, and serving guardrails.'
  },
  {
    id: 'google-to-llm-to-vllm',
    shortLabel: '03. Google → LLM → vLLM',
    title: 'Transformation: Google (2017) → Frontier LLMs → vLLM Engine',
    subtitle: 'How OS-style PagedAttention, Continuous Batching, and Prefix Caching unlock 10×–24× more serving throughput.'
  },
  {
    id: 'claude-architect-mastery',
    shortLabel: '04. Master Claude Architect',
    title: 'How to Become a Master Claude & Frontier LLM Architect',
    subtitle: 'The 6-pillar mastery playbook: Context Engineering, Prompt Caching, Workflows vs. Agents, MCP, Evals, and FinOps.'
  }
]

export default function FrontierArchitectureDeepDive() {
  const [activeTab, setActiveTab] = useState<DeepDiveTabId>('dl-transformer')
  const [stepIdx, setStepIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showMermaidCode, setShowMermaidCode] = useState(false)

  // Simulator 1: Transformer Hardware & Tensor Math
  const [layers, setLayers] = useState(32)
  const [dModel, setDModel] = useState(4096)
  const [seqLen, setSeqLen] = useState(4096)
  const [useGqa, setUseGqa] = useState(true)

  // Simulator 2: ChatGPT / Claude Build Pipeline
  const [enableSft, setEnableSft] = useState(true)
  const [enableAlignment, setEnableAlignment] = useState(true)
  const [thinkingBudget, setThinkingBudget] = useState(2048)
  const [enableToolVerify, setEnableToolVerify] = useState(true)

  // Simulator 3: Naive HuggingFace vs vLLM Serving
  const [concurrentUsers, setConcurrentUsers] = useState(32)
  const [avgPromptLen, setAvgPromptLen] = useState(2048)
  const [sharedPrefixPct, setSharedPrefixPct] = useState(65)
  const [enableVllm, setEnableVllm] = useState(true)

  // Simulator 4: Master Claude Architect Maturity
  const [archPromptCache, setArchPromptCache] = useState(true)
  const [archModelRouting, setArchModelRouting] = useState(true)
  const [archWorkflowsFirst, setArchWorkflowsFirst] = useState(true)
  const [archCiEvals, setArchCiEvals] = useState(true)
  const [archMcpSecurity, setArchMcpSecurity] = useState(true)
  const [monthlyRequestsK, setMonthlyRequestsK] = useState(500)

  const currentTabMeta = TABS.find(t => t.id === activeTab) ?? TABS[0]

  const { mermaidSyntax, steps } = useMemo((): { mermaidSyntax: string; steps: DfdStep[] } => {
    switch (activeTab) {
      case 'dl-transformer':
        return { mermaidSyntax: transformerDfdMermaid, steps: transformerDfdSteps }
      case 'chatgpt-claude-build':
        return { mermaidSyntax: chatgptClaudeBuildMermaid, steps: chatgptClaudeBuildSteps }
      case 'google-to-llm-to-vllm':
        return { mermaidSyntax: googleToVllmMermaid, steps: googleToVllmSteps }
      case 'claude-architect-mastery':
        return { mermaidSyntax: claudeArchitectDfdMermaid, steps: claudeArchitectDfdSteps }
    }
  }, [activeTab])

  const nodeLabels = useMemo(
    () => Object.fromEntries(steps.map(s => [s.nodeId, s.title])),
    [steps]
  )

  useEffect(() => {
    setStepIdx(0)
    setPlaying(false)
    setShowMermaidCode(false)
  }, [activeTab])

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      setStepIdx(prev => {
        if (prev >= steps.length - 1) {
          setPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 2400)
    return () => window.clearTimeout(timer)
  }, [playing, stepIdx, steps.length])

  const currentStep = steps[stepIdx] ?? steps[0]

  // --- Computed Simulator Metrics ---
  const sim1 = useMemo(() => {
    // Approx decoder transformer params: ~12 * L * d^2
    const paramsBillions = Number(((12 * layers * dModel * dModel) / 1e9).toFixed(2))
    const kvRatio = useGqa ? 0.25 : 1.0
    // KV cache per sequence in FP16 (2 bytes) for K & V
    const kvMbPerSeq = Number(((2 * layers * dModel * kvRatio * 2 * seqLen) / (1024 * 1024)).toFixed(1))
    const weightGbFp16 = Number((paramsBillions * 2).toFixed(1))
    const fits24Gb = weightGbFp16 + kvMbPerSeq / 1024 <= 22
    const decodeLatencyMs = Math.round(6 + paramsBillions * 1.4 + (seqLen / 1024) * (useGqa ? 1.8 : 6.2))
    return { paramsBillions, kvMbPerSeq, weightGbFp16, fits24Gb, decodeLatencyMs }
  }, [layers, dModel, seqLen, useGqa])

  const sim2 = useMemo(() => {
    const baseFollow = enableSft ? 84 : 38
    const alignSafety = enableAlignment ? 97 : 54
    const thinkBoost = Math.min(13, Math.round(Math.log2(Math.max(128, thinkingBudget) / 128) * 3.1))
    const toolBoost = enableToolVerify ? 4 : -6
    const reasoningAccuracy = Math.min(98, Math.max(30, baseFollow + thinkBoost + toolBoost + (enableAlignment ? 2 : -4)))
    const latencyMs = Math.round(320 + thinkingBudget * 1.15 + (enableToolVerify ? 240 : 0))
    const costPerReq = Number((0.002 + thinkingBudget * 0.000012 + (enableToolVerify ? 0.001 : 0)).toFixed(4))
    const status: 'optimal' | 'tradeoff' | 'breaking' =
      !enableSft || !enableAlignment ? 'breaking' : thinkingBudget > 6000 ? 'tradeoff' : 'optimal'
    const output = !enableSft
      ? 'BASE MODEL ONLY: Continues your prompt as raw web text instead of answering your question.'
      : !enableAlignment
        ? 'UNALIGNED SFT: Answers instructions but fails safety refusals, shows sycophancy, and lacks Constitutional calibration.'
        : `FRONTIER ASSISTANT: Constitutional/RLHF calibrated + ${thinkingBudget} thinking tokens${enableToolVerify ? ' + verified tool checks' : ''} → accurate, safe, structured answer.`
    return { alignSafety, reasoningAccuracy, latencyMs, costPerReq, status, output }
  }, [enableSft, enableAlignment, thinkingBudget, enableToolVerify])

  const sim3 = useMemo(() => {
    // Compare Naive Static HuggingFace vs vLLM PagedAttention + Continuous Batching + Prefix Cache
    const gpuFreeKvGb = 54 // On an 80GB H100/A100 after ~26GB weights
    const kvWastePct = enableVllm ? 3.5 : 68.0
    const effectiveKvPerUserGb = ((avgPromptLen + 512) * 0.00013) * (enableVllm ? 1.04 : 3.15) * (enableVllm ? (1 - (sharedPrefixPct / 100) * 0.65) : 1)
    const maxUsersFit = Math.max(2, Math.floor(gpuFreeKvGb / Math.max(0.08, effectiveKvPerUserGb)))
    const queued = Math.max(0, concurrentUsers - maxUsersFit)
    const activeBatch = Math.min(concurrentUsers, maxUsersFit)
    const throughputTokSec = Math.round(activeBatch * (enableVllm ? 42 : 11) * (enableVllm ? 1 + sharedPrefixPct / 250 : 1))
    const ttftMs = Math.round(
      (avgPromptLen * (enableVllm ? (1 - (sharedPrefixPct / 100) * 0.78) * 0.09 : 0.32)) +
      queued * (enableVllm ? 45 : 380)
    )
    const costPer1M = Number((enableVllm ? Math.max(0.18, 2.4 / Math.sqrt(activeBatch)) : Math.max(1.8, 9.5 / Math.sqrt(activeBatch))).toFixed(2))
    const status: 'optimal' | 'tradeoff' | 'breaking' = !enableVllm || queued > 16 ? 'breaking' : queued > 0 ? 'tradeoff' : 'optimal'
    return { kvWastePct, maxUsersFit, queued, throughputTokSec, ttftMs, costPer1M, status }
  }, [concurrentUsers, avgPromptLen, sharedPrefixPct, enableVllm])

  const sim4 = useMemo(() => {
    const enabledCount = [archPromptCache, archModelRouting, archWorkflowsFirst, archCiEvals, archMcpSecurity].filter(Boolean).length
    const maturityScore = enabledCount * 20
    const baselineMonthlyUsd = monthlyRequestsK * 18 // $18 per 1k unoptimized frontier calls
    let mult = 1.0
    if (archPromptCache) mult *= 0.48
    if (archModelRouting) mult *= 0.56
    if (archWorkflowsFirst) mult *= 0.78
    const optimizedMonthlyUsd = Math.round(baselineMonthlyUsd * mult)
    const savingsPct = Math.round((1 - optimizedMonthlyUsd / baselineMonthlyUsd) * 100)
    const reliabilityPct = Math.min(99.6, 72 + (archWorkflowsFirst ? 9 : 0) + (archCiEvals ? 11 : 0) + (archMcpSecurity ? 7.6 : 0))
    const level =
      maturityScore >= 100
        ? 'Principal Claude Architect'
        : maturityScore >= 80
          ? 'Senior AI Systems Architect'
          : maturityScore >= 60
            ? 'Production Builder'
            : 'Prototype Stage (High Risk)'
    return { maturityScore, baselineMonthlyUsd, optimizedMonthlyUsd, savingsPct, reliabilityPct, level }
  }, [archPromptCache, archModelRouting, archWorkflowsFirst, archCiEvals, archMcpSecurity, monthlyRequestsK])

  return (
    <section className="fd-shell" id="frontier-deep-dive" aria-label="Deep Learning, ChatGPT/Claude Internals, Google to vLLM, and Master Claude Architect">
      <header className="fd-header">
        <div>
          <div className="bc-meta-line">
            <span>Frontier Architecture Deep Dive</span>
            <span aria-hidden="true">·</span>
            <span>Interactive DFDs</span>
            <span aria-hidden="true">·</span>
            <span>Virtual Simulators</span>
            <span aria-hidden="true">·</span>
            <span>Architect Mastery Blueprint</span>
          </div>
          <h2>Inside Deep Learning, ChatGPT &amp; Claude, Google → vLLM, and Claude Architecture Mastery</h2>
          <p>
            Explore how modern transformers actually compute, how frontier models like ChatGPT and Claude are trained and
            aligned, how serving evolved from Google’s 2017 paper to vLLM PagedAttention, and how to master production Claude architecture.
          </p>
        </div>
      </header>

      {/* Clean Single-Line Segmented Tabs */}
      <div className="fd-tabs" role="tablist" aria-label="Deep dive modules">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.shortLabel}
          </button>
        ))}
      </div>

      <div className="fd-body">
        <div className="fd-title-row">
          <div>
            <h3>{currentTabMeta.title}</h3>
            <p>{currentTabMeta.subtitle}</p>
          </div>
          <div className="bc-segmented">
            <button
              type="button"
              className={!showMermaidCode ? 'active' : ''}
              onClick={() => setShowMermaidCode(false)}
            >
              Live DFD Diagram
            </button>
            <button
              type="button"
              className={showMermaidCode ? 'active' : ''}
              onClick={() => setShowMermaidCode(true)}
            >
              Mermaid DFD Code
            </button>
          </div>
        </div>

        {/* Two-Zone Animated Architecture & DFD Canvas */}
        <div className="bc-flow-timeline-grid">
          <div className="bc-stage-canvas">
            {!showMermaidCode ? (
              <MermaidDiagram
                syntax={mermaidSyntax}
                diagramType="flowchart"
                highlightNode={currentStep.nodeId}
                nodeLabels={nodeLabels}
              />
            ) : (
              <pre className="bc-code-pre">
                <code>{mermaidSyntax}</code>
              </pre>
            )}
          </div>

          <div className="bc-timeline-deck">
            <div className="bc-timeline-controls">
              <button
                type="button"
                className="bc-ctrl-btn"
                disabled={stepIdx === 0}
                onClick={() => {
                  setPlaying(false)
                  setStepIdx(v => Math.max(0, v - 1))
                }}
                aria-label="Previous DFD step"
              >
                <ArrowLeft size={14} />
              </button>
              <button
                type="button"
                className="bc-ctrl-btn primary"
                onClick={() => {
                  if (stepIdx >= steps.length - 1) setStepIdx(0)
                  setPlaying(p => !p)
                }}
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
                <span>{playing ? 'Pause DFD' : stepIdx >= steps.length - 1 ? 'Replay DFD' : 'Animate Flow'}</span>
              </button>
              <button
                type="button"
                className="bc-ctrl-btn"
                disabled={stepIdx >= steps.length - 1}
                onClick={() => {
                  setPlaying(false)
                  setStepIdx(v => Math.min(steps.length - 1, v + 1))
                }}
                aria-label="Next DFD step"
              >
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="bc-ctrl-btn"
                onClick={() => {
                  setPlaying(false)
                  setStepIdx(0)
                }}
                aria-label="Reset DFD animation"
              >
                <RotateCcw size={14} />
              </button>
              <span className="fd-step-counter bc-tabular">
                Step {stepIdx + 1} / {steps.length}
              </span>
            </div>

            <div className="bc-step-rail" role="tablist" aria-label="DFD stages">
              {steps.map((s, idx) => (
                <button
                  key={s.nodeId}
                  type="button"
                  role="tab"
                  aria-selected={idx === stepIdx}
                  className={`bc-step-dot ${idx === stepIdx ? 'active' : idx < stepIdx ? 'visited' : ''}`}
                  onClick={() => {
                    setPlaying(false)
                    setStepIdx(idx)
                  }}
                >
                  <span className="bc-tabular">0{s.step}</span>
                  <span>{s.nodeId}</span>
                </button>
              ))}
            </div>

            <div className="fd-dfd-inspector" aria-live="polite">
              <h4>{currentStep.title}</h4>
              <div className="fd-dfd-triplet">
                <div>
                  <span>Data Entering</span>
                  <p>{currentStep.dataIn}</p>
                </div>
                <div>
                  <span>Internal Operation</span>
                  <p>{currentStep.transformation}</p>
                </div>
                <div>
                  <span>Data Exiting</span>
                  <p>{currentStep.dataOut}</p>
                </div>
              </div>
              <div className="bc-payload-box">
                <div className="bc-payload-label">Live Tensor / DFD State Snapshot</div>
                <pre>
                  <code>{JSON.stringify(currentStep.tensorOrPayload, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================
            TAB-SPECIFIC VIRTUAL SIMULATORS & DEEP ARCHITECTURAL CONTENT
        ================================================================== */}

        {/* TAB 1: DL & TRANSFORMER SIMULATOR + INTERACTIVE SELF-ATTENTION */}
        {activeTab === 'dl-transformer' && (
          <>
            <SelfAttentionVisualizer />

            <div className="fd-sim-block">
              <div className="bc-section-head">
                <div className="bc-section-title">
                  <Cpu size={17} />
                  <h4>Virtual Transformer Sizing &amp; KV-Cache Simulator</h4>
                </div>
                <span className="bc-section-sub">Compare classic Multi-Head Attention (MHA) vs. modern Grouped-Query Attention (GQA)</span>
              </div>

            <div className="bc-sim-controls">
              <div className="bc-control-card">
                <div className="bc-control-top">
                  <label htmlFor="fd-layers">Transformer Layers (N)</label>
                  <strong className="bc-control-value bc-tabular">{layers} layers</strong>
                </div>
                <input id="fd-layers" type="range" min={12} max={80} step={4} value={layers} onChange={e => setLayers(Number(e.target.value))} />
                <div className="bc-slider-ticks"><span>12 (Small)</span><span>80 (70B-class)</span></div>
              </div>
              <div className="bc-control-card">
                <div className="bc-control-top">
                  <label htmlFor="fd-dmodel">Hidden Dimension (d_model)</label>
                  <strong className="bc-control-value bc-tabular">{dModel}</strong>
                </div>
                <input id="fd-dmodel" type="range" min={1024} max={8192} step={1024} value={dModel} onChange={e => setDModel(Number(e.target.value))} />
                <div className="bc-slider-ticks"><span>1024</span><span>8192</span></div>
              </div>
              <div className="bc-control-card">
                <div className="bc-control-top">
                  <label htmlFor="fd-seq">Context Length</label>
                  <strong className="bc-control-value bc-tabular">{seqLen.toLocaleString()} tok</strong>
                </div>
                <input id="fd-seq" type="range" min={1024} max={32768} step={1024} value={seqLen} onChange={e => setSeqLen(Number(e.target.value))} />
                <div className="bc-control-top fd-subtoggle">
                  <label htmlFor="fd-gqa">Grouped-Query Attention (GQA)</label>
                  <button id="fd-gqa" type="button" role="switch" aria-checked={useGqa} className={`bc-toggle ${useGqa ? 'on' : 'off'}`} onClick={() => setUseGqa(v => !v)}>
                    <span className="bc-toggle-thumb" />
                    <span>{useGqa ? 'GQA (4× smaller KV)' : 'Classic MHA'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bc-kpi-grid">
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Estimated Parameters</span>
                <strong className="bc-kpi-val bc-tabular">{sim1.paramsBillions}B</strong>
                <small>~{sim1.weightGbFp16} GB in FP16 weights</small>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">KV Cache / Sequence</span>
                <strong className="bc-kpi-val bc-tabular">{sim1.kvMbPerSeq.toLocaleString()} MB</strong>
                <small>{useGqa ? '75% smaller via GQA head sharing' : 'Full MHA KV memory footprint'}</small>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Est. Decode Step Latency</span>
                <strong className="bc-kpi-val bc-tabular">{sim1.decodeLatencyMs} ms/tok</strong>
                <small>Memory-bandwidth bound per token</small>
              </div>
              <div className={`bc-kpi-card ${sim1.fits24Gb ? 'bc-health-optimal' : 'bc-health-tradeoff'}`}>
                <span className="bc-kpi-label">Single 24 GB GPU Fit</span>
                <strong className="bc-kpi-health-val">
                  {sim1.fits24Gb ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{sim1.fits24Gb ? 'Fits 1×24GB' : 'Needs Multi-GPU / INT4'}</span>
                </strong>
                <small>{sim1.fits24Gb ? 'Room left for active batch KV' : 'Quantize to 4-bit or shard across GPUs'}</small>
              </div>
            </div>
          </div>
          </>
        )}

        {/* TAB 2: CHATGPT / CLAUDE TRAINING & ALIGNMENT SIMULATOR */}
        {activeTab === 'chatgpt-claude-build' && (
          <div className="fd-sim-block">
            <div className="bc-section-head">
              <div className="bc-section-title">
                <ShieldCheck size={17} />
                <h4>ChatGPT vs. Claude Build Pipeline Virtual Simulator</h4>
              </div>
              <span className="bc-section-sub">Toggle post-training stages to see what breaks without SFT, Alignment, or Extended Thinking</span>
            </div>

            <div className="fd-compare-two">
              <article className="fd-info-card">
                <span className="bc-kicker">OpenAI ChatGPT Alignment Path</span>
                <h5>Pretrain → SFT → RLHF (PPO / DPO) → Reasoning RL</h5>
                <p>
                  Trains a Reward Model directly on human preference rankings of response pairs, then optimizes the policy model
                  via reinforcement learning while staying close to the SFT reference (KL penalty) plus verifiable-reward reasoning.
                </p>
              </article>
              <article className="fd-info-card">
                <span className="bc-kicker">Anthropic Claude Alignment Path</span>
                <h5>Pretrain → SFT → Constitutional AI (RLAIF) → Extended Thinking</h5>
                <p>
                  Encodes explicit written principles (a Constitution) so the model critiques and revises its own responses during
                  supervised learning, then scales preference modeling with AI feedback + human calibration for Helpful, Honest, Harmless behavior.
                </p>
              </article>
            </div>

            <div className="bc-sim-controls">
              <div className="bc-control-card">
                <div className="bc-control-top">
                  <label htmlFor="fd-sft">Stage 2: Instruction SFT</label>
                  <button id="fd-sft" type="button" role="switch" aria-checked={enableSft} className={`bc-toggle ${enableSft ? 'on' : 'off'}`} onClick={() => setEnableSft(v => !v)}>
                    <span className="bc-toggle-thumb" />
                    <span>{enableSft ? 'Enabled' : 'Base Only'}</span>
                  </button>
                </div>
                <p className="bc-control-help">Turns raw next-word autocomplete into a dialogue &amp; tool follower.</p>
              </div>
              <div className="bc-control-card">
                <div className="bc-control-top">
                  <label htmlFor="fd-align">Stage 3: RLHF / Constitutional AI</label>
                  <button id="fd-align" type="button" role="switch" aria-checked={enableAlignment} className={`bc-toggle ${enableAlignment ? 'on' : 'off'}`} onClick={() => setEnableAlignment(v => !v)}>
                    <span className="bc-toggle-thumb" />
                    <span>{enableAlignment ? 'Aligned' : 'Unaligned'}</span>
                  </button>
                </div>
                <p className="bc-control-help">Calibrates refusal boundaries, honesty, tone, and resistance to harmful prompts.</p>
              </div>
              <div className="bc-control-card">
                <div className="bc-control-top">
                  <label htmlFor="fd-think">Extended Thinking Budget</label>
                  <strong className="bc-control-value bc-tabular">{thinkingBudget} tok</strong>
                </div>
                <input id="fd-think" type="range" min={0} max={8192} step={512} value={thinkingBudget} onChange={e => setThinkingBudget(Number(e.target.value))} />
                <div className="bc-control-top fd-subtoggle">
                  <label htmlFor="fd-tverify">Runtime Tool Verification</label>
                  <button id="fd-tverify" type="button" role="switch" aria-checked={enableToolVerify} className={`bc-toggle ${enableToolVerify ? 'on' : 'off'}`} onClick={() => setEnableToolVerify(v => !v)}>
                    <span className="bc-toggle-thumb" />
                    <span>{enableToolVerify ? 'On' : 'Off'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bc-kpi-grid">
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Hard Reasoning Accuracy</span>
                <strong className="bc-kpi-val bc-tabular">{sim2.reasoningAccuracy}%</strong>
                <small>Boosted by SFT + Thinking tokens</small>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Safety &amp; Honesty Score</span>
                <strong className="bc-kpi-val bc-tabular">{sim2.alignSafety}%</strong>
                <small>{enableAlignment ? 'RLHF / Constitutional calibrated' : 'High unsafe output risk'}</small>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Total Response Latency</span>
                <strong className="bc-kpi-val bc-tabular">{sim2.latencyMs.toLocaleString()} ms</strong>
                <small>Thinking tokens add upfront wait</small>
              </div>
              <div className={`bc-kpi-card bc-health-${sim2.status}`}>
                <span className="bc-kpi-label">Est. Cost / Request</span>
                <strong className="bc-kpi-val bc-tabular">${sim2.costPerReq.toFixed(4)}</strong>
                <small>{sim2.status === 'optimal' ? 'Balanced quality & speed' : sim2.status === 'tradeoff' ? 'High thinking budget' : 'Missing critical build stage'}</small>
              </div>
            </div>
            <div className={`bc-sim-output bc-output-${sim2.status}`}>
              <div className="bc-sim-output-label">Simulated Assistant Behavior</div>
              <p>{sim2.output}</p>
            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE -> LLM -> vLLM EVOLUTION & SERVING SIMULATOR */}
        {activeTab === 'google-to-llm-to-vllm' && (
          <div className="fd-sim-block">
            <div className="bc-section-head">
              <div className="bc-section-title">
                <Zap size={17} />
                <h4>Architecture Transformation: Google (2017) → LLMs → vLLM</h4>
              </div>
              <span className="bc-section-sub">Three eras from research paper to 24× faster production GPU serving</span>
            </div>

            <div className="fd-era-grid">
              {evolutionEras.map(item => (
                <article key={item.era} className="fd-era-card">
                  <div className="bc-meta-line">
                    <span>{item.era}</span>
                    <span aria-hidden="true">·</span>
                    <span className="bc-tabular">{item.year}</span>
                  </div>
                  <h5>{item.title}</h5>
                  <dl className="fd-era-dl">
                    <div>
                      <dt>Core Breakthrough</dt>
                      <dd>{item.keyBreakthrough}</dd>
                    </div>
                    <div>
                      <dt>Architecture Shift</dt>
                      <dd>{item.architectureShift}</dd>
                    </div>
                    <div>
                      <dt>Solved</dt>
                      <dd>{item.bottleneckSolved}</dd>
                    </div>
                    <div>
                      <dt>Next Bottleneck</dt>
                      <dd>{item.remainingLimit}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="bc-section-head fd-subhead-gap">
              <div className="bc-section-title">
                <Sliders size={17} />
                <h4>Virtual Simulator: Naive Serving (Without vLLM) vs. vLLM PagedAttention</h4>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enableVllm}
                className={`bc-toggle ${enableVllm ? 'on' : 'off'}`}
                onClick={() => setEnableVllm(v => !v)}
              >
                <span className="bc-toggle-thumb" />
                <span>{enableVllm ? 'vLLM Engine ON (PagedAttention + Prefix Cache)' : 'vLLM OFF (Naive Static Serving)'}</span>
              </button>
            </div>

            <div className="bc-sim-controls">
              <div className="bc-control-card">
                <div className="bc-control-top">
                  <label htmlFor="fd-users">Concurrent Live Users</label>
                  <strong className="bc-control-value bc-tabular">{concurrentUsers} users</strong>
                </div>
                <input id="fd-users" type="range" min={4} max={80} step={4} value={concurrentUsers} onChange={e => setConcurrentUsers(Number(e.target.value))} />
                <div className="bc-slider-ticks"><span>4 users</span><span>80 users</span></div>
              </div>
              <div className="bc-control-card">
                <div className="bc-control-top">
                  <label htmlFor="fd-plen">Average Prompt Length</label>
                  <strong className="bc-control-value bc-tabular">{avgPromptLen} tok</strong>
                </div>
                <input id="fd-plen" type="range" min={512} max={8192} step={512} value={avgPromptLen} onChange={e => setAvgPromptLen(Number(e.target.value))} />
                <div className="bc-slider-ticks"><span>512 tok</span><span>8,192 tok</span></div>
              </div>
              <div className="bc-control-card">
                <div className="bc-control-top">
                  <label htmlFor="fd-prefix">Shared System/RAG Prefix</label>
                  <strong className="bc-control-value bc-tabular">{sharedPrefixPct}%</strong>
                </div>
                <input id="fd-prefix" type="range" min={0} max={90} step={5} value={sharedPrefixPct} onChange={e => setSharedPrefixPct(Number(e.target.value))} />
                <div className="bc-slider-ticks"><span>0% unique</span><span>90% shared</span></div>
              </div>
            </div>

            <div className="bc-kpi-grid">
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">KV-Cache VRAM Waste</span>
                <strong className="bc-kpi-val bc-tabular">{sim3.kvWastePct}%</strong>
                <small>{enableVllm ? 'Paged 16-token blocks (<4% waste)' : 'Contiguous pre-allocation waste'}</small>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">GPU Throughput</span>
                <strong className="bc-kpi-val bc-tabular">{sim3.throughputTokSec.toLocaleString()} tok/s</strong>
                <small>Max {sim3.maxUsersFit} active ({sim3.queued} queued)</small>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Time to First Token (TTFT)</span>
                <strong className="bc-kpi-val bc-tabular">{sim3.ttftMs.toLocaleString()} ms</strong>
                <small>{enableVllm ? 'Prefix cache skips redundant prefill' : 'Recomputes full prefix every time'}</small>
              </div>
              <div className={`bc-kpi-card bc-health-${sim3.status}`}>
                <span className="bc-kpi-label">Serving Cost / 1M Tokens</span>
                <strong className="bc-kpi-val bc-tabular">${sim3.costPer1M.toFixed(2)}</strong>
                <small>{enableVllm ? 'vLLM cuts GPU cost up to 80%+' : 'Toggle vLLM ON to compare'}</small>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HOW TO BECOME A MASTER CLAUDE ARCHITECT */}
        {activeTab === 'claude-architect-mastery' && (
          <div className="fd-sim-block">
            <div className="bc-section-head">
              <div className="bc-section-title">
                <Layers size={17} />
                <h4>The 6 Pillars of a Master Claude &amp; Frontier LLM Architect</h4>
              </div>
              <span className="bc-section-sub">What changes WITH each architectural discipline vs. WITHOUT it</span>
            </div>

            <div className="fd-pillar-grid">
              {claudeArchitectPillars.map(pillar => (
                <article key={pillar.number} className="fd-pillar-card">
                  <div className="fd-pillar-head">
                    <span className="bc-tabular">{pillar.number}</span>
                    <h5>{pillar.title}</h5>
                  </div>
                  <p className="fd-pillar-goal">{pillar.plainGoal}</p>
                  <div className="fd-pillar-compare">
                    <div className="fd-mini-without">
                      <span><XCircle size={13} /> Without It</span>
                      <p>{pillar.withoutPattern}</p>
                    </div>
                    <div className="fd-mini-with">
                      <span><CheckCircle2 size={13} /> With It</span>
                      <p>{pillar.withPattern}</p>
                    </div>
                  </div>
                  <div className="fd-pillar-artifacts">
                    {pillar.keyArtifacts.join(' · ')}
                  </div>
                </article>
              ))}
            </div>

            {/* Interactive Claude Architect Cost & Maturity Simulator */}
            <div className="bc-section-head fd-subhead-gap">
              <div className="bc-section-title">
                <Workflow size={17} />
                <h4>Master Claude Architect Virtual Simulator (Cost, Reliability &amp; Maturity)</h4>
              </div>
              <span className="bc-section-sub">Toggle each architectural pillar to measure real enterprise impact</span>
            </div>

            <div className="fd-arch-toggles">
              <button type="button" role="switch" aria-checked={archPromptCache} className={`bc-toggle ${archPromptCache ? 'on' : 'off'}`} onClick={() => setArchPromptCache(v => !v)}>
                <span className="bc-toggle-thumb" />
                <span>XML Prompt Caching</span>
              </button>
              <button type="button" role="switch" aria-checked={archModelRouting} className={`bc-toggle ${archModelRouting ? 'on' : 'off'}`} onClick={() => setArchModelRouting(v => !v)}>
                <span className="bc-toggle-thumb" />
                <span>Haiku / Sonnet / Opus Routing</span>
              </button>
              <button type="button" role="switch" aria-checked={archWorkflowsFirst} className={`bc-toggle ${archWorkflowsFirst ? 'on' : 'off'}`} onClick={() => setArchWorkflowsFirst(v => !v)}>
                <span className="bc-toggle-thumb" />
                <span>Workflows Before Open Agents</span>
              </button>
              <button type="button" role="switch" aria-checked={archCiEvals} className={`bc-toggle ${archCiEvals ? 'on' : 'off'}`} onClick={() => setArchCiEvals(v => !v)}>
                <span className="bc-toggle-thumb" />
                <span>CI Golden Eval Suite</span>
              </button>
              <button type="button" role="switch" aria-checked={archMcpSecurity} className={`bc-toggle ${archMcpSecurity ? 'on' : 'off'}`} onClick={() => setArchMcpSecurity(v => !v)}>
                <span className="bc-toggle-thumb" />
                <span>MCP Server-Side Policy Gate</span>
              </button>
              <div className="fd-inline-slider">
                <label htmlFor="fd-mreq">Monthly Volume: <strong className="bc-tabular">{monthlyRequestsK}k reqs</strong></label>
                <input id="fd-mreq" type="range" min={50} max={2000} step={50} value={monthlyRequestsK} onChange={e => setMonthlyRequestsK(Number(e.target.value))} />
              </div>
            </div>

            <div className="bc-kpi-grid">
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Architect Maturity</span>
                <strong className="bc-kpi-val bc-tabular">{sim4.maturityScore}/100</strong>
                <small>{sim4.level}</small>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Monthly LLM Spend</span>
                <strong className="bc-kpi-val bc-tabular">${sim4.optimizedMonthlyUsd.toLocaleString()}</strong>
                <small>Down from ${sim4.baselineMonthlyUsd.toLocaleString()} (−{sim4.savingsPct}%)</small>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Production Reliability</span>
                <strong className="bc-kpi-val bc-tabular">{sim4.reliabilityPct.toFixed(1)}%</strong>
                <small>Eval gates + bounded workflows</small>
              </div>
              <div className={`bc-kpi-card ${sim4.maturityScore >= 80 ? 'bc-health-optimal' : sim4.maturityScore >= 60 ? 'bc-health-tradeoff' : 'bc-health-breaking'}`}>
                <span className="bc-kpi-label">Enterprise Readiness</span>
                <strong className="bc-kpi-health-val">
                  {sim4.maturityScore >= 80 ? <CheckCircle2 size={16} /> : sim4.maturityScore >= 60 ? <AlertTriangle size={16} /> : <XCircle size={16} />}
                  <span>{sim4.maturityScore >= 80 ? 'Production Ready' : sim4.maturityScore >= 60 ? 'Needs Hardening' : 'Prototype Only'}</span>
                </strong>
                <small>{archMcpSecurity ? 'Zero-trust tool boundary active' : 'Warning: Unprotected tool path'}</small>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
