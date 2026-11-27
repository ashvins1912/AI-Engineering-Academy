import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  GitBranch,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
  StepForward,
  Terminal,
  Workflow,
  XCircle
} from 'lucide-react'
import {
  harnessCaseStudies,
  harnessDfdMermaid,
  harnessDfdNodeLabels,
  harnessDfdSteps,
  harnessEvolutionRows,
  harnessPillars,
  harnessPlaygroundExecutableCode
} from '../data/harnessEngineeringData'
import { runInVirtualSandbox, type SandboxRunResult } from '../utils/sandboxRunner'
import MermaidDiagram from './MermaidDiagram'
import HarnessDfdEditor from './HarnessDfdEditor'

type HarnessTab = 'overview' | 'editor' | 'dfd' | 'cases' | 'simulator' | 'playground'

type Props = {
  onLaunchVirtualLab?: () => void
}

export default function HarnessEngineeringStudio({ onLaunchVirtualLab }: Props) {
  const [tab, setTab] = useState<HarnessTab>('overview')

  // Tab 2: DFD Animation state
  const [dfdIdx, setDfdIdx] = useState(0)
  const [isPlayingDfd, setIsPlayingDfd] = useState(false)

  // Tab 3: Case Study selector
  const [caseIdx, setCaseIdx] = useState(0)
  const [copiedCase, setCopiedCase] = useState(false)

  // Tab 4: Architect Virtual Simulator state
  const [baseStepAcc, setBaseStepAcc] = useState(88) // % per-step accuracy of raw LLM
  const [horizonTurns, setHorizonTurns] = useState(12) // task steps
  const [compactThreshold, setCompactThreshold] = useState(70) // % context window before compaction
  const [useVerifier, setUseVerifier] = useState(true)
  const [useDoomLoopGuard, setUseDoomLoopGuard] = useState(true)
  const [usePolicySandbox, setUsePolicySandbox] = useState(true)

  // Tab 5: Live Executable Harness Playground
  const [sandboxCode, setSandboxCode] = useState(harnessPlaygroundExecutableCode)
  const [runResult, setRunResult] = useState<SandboxRunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  useEffect(() => {
    if (!isPlayingDfd) return
    const timer = window.setInterval(() => {
      setDfdIdx(prev => (prev + 1) % harnessDfdSteps.length)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [isPlayingDfd])

  const executeHarnessSandbox = useCallback(async (code: string) => {
    setRunning(true)
    const res = await runInVirtualSandbox(code, {})
    setRunResult(res)
    setRunning(false)
  }, [])

  useEffect(() => {
    if (tab === 'playground' && !runResult) {
      void executeHarnessSandbox(sandboxCode)
    }
  }, [tab, runResult, sandboxCode, executeHarnessSandbox])

  // Real mathematical multi-turn compounding & harness recovery simulator
  const sim = useMemo(() => {
    const pRaw = baseStepAcc / 100
    // Context rot penalty rises sharply if compaction threshold > 75% on long horizons
    const rotSeverity = Math.max(0, (compactThreshold - 70) / 30) * Math.min(1, horizonTurns / 12)
    const rawRotPenaltyPerTurn = 0.012 * (horizonTurns / 10)
    const harnessRotPenaltyPerTurn = 0.002 + rotSeverity * 0.011

    // Effective per-turn survival probability:
    // Verifier backpressure lets the agent catch and self-correct ~72% of single-step mistakes!
    const verifierRecovery = useVerifier ? 0.72 : 0.0
    const doomGuardBoost = useDoomLoopGuard ? 0.025 : 0.0
    const pHarnessStep = Math.min(
      0.992,
      Math.max(0.5, pRaw + (1 - pRaw) * verifierRecovery + doomGuardBoost - harnessRotPenaltyPerTurn)
    )
    const pRawStep = Math.max(0.45, pRaw - rawRotPenaltyPerTurn)

    const rawPassAt1 = Math.pow(pRawStep, horizonTurns)
    const harnessPassAt1 = Math.pow(pHarnessStep, horizonTurns)
    const rawPassPow3 = Math.pow(rawPassAt1, 3)
    const harnessPassPow3 = Math.pow(harnessPassAt1, 3)

    // Expected cost per solved task = runCost / max(0.05, pass@1)
    const baseRunCost = 0.04 * horizonTurns * (compactThreshold <= 75 ? 0.72 : 1.18) * (useDoomLoopGuard ? 0.85 : 1.35)
    const rawRunCost = 0.04 * horizonTurns * 1.45
    const costPerSolvedHarness = Number((baseRunCost / Math.max(0.08, harnessPassAt1)).toFixed(2))
    const costPerSolvedRaw = Number((rawRunCost / Math.max(0.05, rawPassAt1)).toFixed(2))

    const blastRadiusRisk = usePolicySandbox ? 'Contained (Sandbox + Policy Gate)' : 'CRITICAL (Host Access Exposed)'

    const health: 'optimal' | 'tradeoff' | 'breaking' =
      !usePolicySandbox || harnessPassAt1 < 0.45
        ? 'breaking'
        : !useVerifier || harnessPassPow3 < 0.45 || compactThreshold > 85
        ? 'tradeoff'
        : 'optimal'

    // Build turn-by-turn reliability curve (Turns 1..horizonTurns)
    const curvePts = Array.from({ length: horizonTurns }, (_, i) => {
      const t = i + 1
      return {
        turn: t,
        rawPct: Math.round(Math.pow(pRawStep, t) * 100),
        harnessPct: Math.round(Math.pow(pHarnessStep, t) * 100)
      }
    })

    const w = 480
    const h = 136
    const padX = 24
    const padY = 14
    const toPt = (idx: number, pct: number) => {
      const x = padX + (idx / Math.max(1, curvePts.length - 1)) * (w - padX * 2)
      const y = h - padY - (pct / 100) * (h - padY * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }

    return {
      health,
      rawPassAt1Pct: Number((rawPassAt1 * 100).toFixed(1)),
      harnessPassAt1Pct: Number((harnessPassAt1 * 100).toFixed(1)),
      liftPts: Number(((harnessPassAt1 - rawPassAt1) * 100).toFixed(1)),
      rawPassPow3Pct: Number((rawPassPow3 * 100).toFixed(1)),
      harnessPassPow3Pct: Number((harnessPassPow3 * 100).toFixed(1)),
      costPerSolvedHarness,
      costPerSolvedRaw,
      blastRadiusRisk,
      rotPct: Math.round(rotSeverity * 100),
      svgW: w,
      svgH: h,
      rawLine: curvePts.map((p, i) => toPt(i, p.rawPct)).join(' '),
      harnessLine: curvePts.map((p, i) => toPt(i, p.harnessPct)).join(' ')
    }
  }, [baseStepAcc, horizonTurns, compactThreshold, useVerifier, useDoomLoopGuard, usePolicySandbox])

  const activeDfdFrame = harnessDfdSteps[dfdIdx] ?? harnessDfdSteps[0]
  const activeCase = harnessCaseStudies[caseIdx] ?? harnessCaseStudies[0]
  const passedAssertions = runResult ? runResult.assertions.filter(a => a.passed).length : 0
  const totalAssertions = runResult ? runResult.assertions.length : 0

  const copyText = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      setter(true)
      window.setTimeout(() => setter(false), 1800)
    } catch {
      setter(false)
    }
  }

  return (
    <section className="dsde-shell" aria-label="Harness Engineering Architecture Studio">
      {/* Studio Header */}
      <header className="dsde-header">
        <div>
          <div className="bc-meta-line">
            <span>Frontier Agent Systems</span>
            <span aria-hidden="true">·</span>
            <span>Harness Engineering Deep Dive</span>
            <span aria-hidden="true">·</span>
            <span>DFD, Case Studies, Virtual Simulator &amp; Live Runtime</span>
          </div>
          <h2>Harness Engineering: Architecture, Case Studies &amp; Live Simulator</h2>
          <p>
            The LLM is the probabilistic engine; the <strong>Harness</strong> is the deterministic
            chassis—context compaction, isolated sandbox, pre-tool policy hooks, compiler/test
            backpressure, doom-loop guards, and pass^k evals—that turns raw models into reliable
            production engineers.
          </p>
        </div>
        {onLaunchVirtualLab && (
          <button type="button" className="bc-btn-secondary" onClick={onLaunchVirtualLab}>
            <Terminal size={14} />
            <span>Open Full Virtual Lab</span>
          </button>
        )}
      </header>

      <div className="dsde-chapter-stage">
        {/* 6 Clean Navigation Tabs */}
        <div className="dsde-step-tabs" role="tablist" aria-label="Harness Engineering modules">
          {(
            [
              { id: 'overview', label: '01. Concept & 5 Pillars', icon: Layers3 },
              { id: 'editor', label: '02. Interactive DFD Editor', icon: GitBranch },
              { id: 'dfd', label: '03. Animated Reference DFD', icon: Workflow },
              { id: 'cases', label: '04. Case Studies (3)', icon: ShieldCheck },
              { id: 'simulator', label: '05. Architect Simulator', icon: Sliders },
              { id: 'playground', label: '06. Live Harness Runtime', icon: Code2 }
            ] as const
          ).map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`dsde-step-tab ${tab === item.id ? 'active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* ================================================================
            TAB 02: INTERACTIVE DRAG-AND-DROP DFD EDITOR & VALIDATOR
        ================================================================= */}
        {tab === 'editor' && <HarnessDfdEditor />}

        {/* ================================================================
            TAB 01: CONCEPT, ANALOGY, EVOLUTION & 5 PILLARS
        ================================================================= */}
        {tab === 'overview' && (
          <div className="dsde-panel-stack">
            <div className="dsde-two-col">
              <article className="dsde-card">
                <span className="dsde-kicker">Core Definition</span>
                <h4>What Is Harness Engineering?</h4>
                <p>
                  Harness Engineering is the systems discipline of building the deterministic
                  execution environment around a probabilistic LLM. Because a 90%-accurate model
                  running 15 unchecked steps drops to <strong>0.90¹⁵ = 20.6%</strong> reliability,
                  you cannot fix long-horizon agents by wording prompts louder—you must engineer the
                  harness around the model.
                </p>
                <div className="dsde-analogy-box">
                  <strong>Formula 1 Analogy</strong>
                  <p>
                    A frontier LLM is a 1,000-horsepower F1 engine. Without a chassis, brakes,
                    traction control, pit-wall telemetry, and safety barriers (the Harness), pressing
                    the gas launches it straight into the wall on turn two.
                  </p>
                </div>
              </article>

              <article className="dsde-card">
                <span className="dsde-kicker">Why It Dominates 2025–2026 AI Engineering</span>
                <h4>The Evolution: Prompt → Context → Harness</h4>
                <div className="he-evo-list">
                  {harnessEvolutionRows.map(row => (
                    <div className="he-evo-item" key={row.era}>
                      <strong>{row.era}</strong>
                      <p>{row.focus}</p>
                      <small>
                        <span>Strength:</span> {row.strength} · <span>Limit:</span> {row.ceiling}
                      </small>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <section className="dsde-card">
              <span className="dsde-kicker">Architect Blueprint</span>
              <h4>The 5 Core Pillars of a Production Agent Harness</h4>
              <div className="he-pillar-grid">
                {harnessPillars.map(p => (
                  <article className="he-pillar-card" key={p.id}>
                    <div className="he-pillar-top">
                      <span className="bc-tabular">{p.number}</span>
                      <small>{p.role}</small>
                    </div>
                    <h5>{p.title}</h5>
                    <p>{p.plainEnglish}</p>
                    <ul>
                      {p.concreteMechanisms.map(m => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                    <div className="he-pillar-without">
                      <strong>Without it:</strong> {p.withoutIt}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ================================================================
            TAB 02: SYNCHRONIZED ANIMATED ARCHITECTURE DFD
        ================================================================= */}
        {tab === 'dfd' && (
          <div className="dsde-panel-stack">
            <section className="dsde-card">
              <div className="dsde-dfd-head">
                <div>
                  <span className="dsde-kicker">End-to-End Deterministic Runtime Flow</span>
                  <h4>How a Task Moves Through All 7 Harness Layers</h4>
                </div>
                <div className="dsde-dfd-controls">
                  <button
                    type="button"
                    className="bc-btn-primary"
                    onClick={() => setIsPlayingDfd(p => !p)}
                  >
                    {isPlayingDfd ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isPlayingDfd ? 'Pause Flow' : 'Animate Flow'}</span>
                  </button>
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    onClick={() => {
                      setIsPlayingDfd(false)
                      setDfdIdx(prev => (prev + 1) % harnessDfdSteps.length)
                    }}
                  >
                    <StepForward size={14} />
                    <span>Step Forward</span>
                  </button>
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    onClick={() => {
                      setIsPlayingDfd(false)
                      setDfdIdx(0)
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              <div className="dsde-dfd-stage">
                <MermaidDiagram
                  syntax={harnessDfdMermaid}
                  diagramType="flowchart"
                  highlightNode={activeDfdFrame.nodeId}
                  nodeLabels={harnessDfdNodeLabels}
                />
              </div>

              <div className="he-dfd-steps" role="tablist" aria-label="Harness DFD steps">
                {harnessDfdSteps.map((st, idx) => (
                  <button
                    key={st.step}
                    type="button"
                    role="tab"
                    aria-selected={dfdIdx === idx}
                    className={`dsde-timeline-btn ${dfdIdx === idx ? 'active' : ''}`}
                    onClick={() => {
                      setIsPlayingDfd(false)
                      setDfdIdx(idx)
                    }}
                  >
                    <span className="bc-tabular">0{st.step} · {st.layer}</span>
                    <strong>{st.title}</strong>
                  </button>
                ))}
              </div>

              <div className="dsde-payload-split">
                <div>
                  <span className="dsde-kicker">Active Layer: {activeDfdFrame.layer}</span>
                  <h5>{activeDfdFrame.title}</h5>
                  <p>{activeDfdFrame.description}</p>
                </div>
                <div className="dsde-payload-json">
                  <span>Live Harness Telemetry Payload</span>
                  <pre>{JSON.stringify(activeDfdFrame.payload, null, 2)}</pre>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================
            TAB 03: 3 REAL-WORLD CASE STUDIES & IMPLEMENTATION BLUEPRINTS
        ================================================================= */}
        {tab === 'cases' && (
          <div className="dsde-panel-stack">
            <div className="he-case-selector" role="tablist" aria-label="Harness case studies">
              {harnessCaseStudies.map((cs, idx) => (
                <button
                  key={cs.id}
                  type="button"
                  role="tab"
                  aria-selected={caseIdx === idx}
                  className={`dsde-timeline-btn ${caseIdx === idx ? 'active' : ''}`}
                  onClick={() => setCaseIdx(idx)}
                >
                  <span>{cs.tag}</span>
                  <strong>{cs.title}</strong>
                </button>
              ))}
            </div>

            <div className="dsde-two-col">
              <article className="dsde-card">
                <span className="dsde-kicker">{activeCase.tag}</span>
                <h4>{activeCase.title}</h4>
                <p>
                  <strong>Context:</strong> {activeCase.organizationContext}
                </p>
                <p>
                  <strong>Failure Mode Without Harness:</strong> {activeCase.problem}
                </p>
                <h5>Engineered Harness Architecture</h5>
                <ul className="dsde-concept-list">
                  {activeCase.harnessArchitecture.map(step => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <div className="dsde-analogy-box">
                  <strong>Principal Architect Takeaway</strong>
                  <p>{activeCase.keyTakeaway}</p>
                </div>
              </article>

              <article className="dsde-card">
                <span className="dsde-kicker">Measured Production Impact (Same Model Weights)</span>
                <h4>Before vs. After Harness Engineering</h4>
                <div className="he-before-after">
                  <div className="dsde-compare-card bad">
                    <div className="dsde-compare-head">
                      <AlertTriangle size={15} />
                      <strong>Before (Naive Loop)</strong>
                    </div>
                    <div className="he-metric-stack">
                      {activeCase.beforeMetrics.map(m => (
                        <div className="he-metric-row" key={m.label}>
                          <span>{m.label}</span>
                          <strong className="bc-tabular">{m.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="dsde-compare-card good">
                    <div className="dsde-compare-head">
                      <CheckCircle2 size={15} />
                      <strong>After (Engineered Harness)</strong>
                    </div>
                    <div className="he-metric-stack">
                      {activeCase.afterMetrics.map(m => (
                        <div className="he-metric-row" key={m.label}>
                          <span>{m.label}</span>
                          <strong className="bc-tabular">{m.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dsde-editor-card">
                  <div className="dsde-editor-bar">
                    <span className="dsde-console-title">{activeCase.implementationLang}</span>
                    <button
                      type="button"
                      className="bc-btn-secondary"
                      onClick={() => void copyText(activeCase.implementationCode, setCopiedCase)}
                    >
                      {copiedCase ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedCase ? 'Copied' : 'Copy Blueprint'}</span>
                    </button>
                  </div>
                  <pre className="he-case-pre">{activeCase.implementationCode}</pre>
                </div>
              </article>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 04: ARCHITECT VIRTUAL SIMULATOR (COMPOUNDING ERROR & PASS^K)
        ================================================================= */}
        {tab === 'simulator' && (
          <div className="dsde-sim-layout">
            <section className="dsde-card dsde-sim-controls">
              <div className="dsde-sim-ctrl-head">
                <div>
                  <span className="dsde-kicker">Virtual Harness Physics</span>
                  <h4>Agent Reliability &amp; Pass^k Simulator</h4>
                  <p>
                    Watch how single-step errors compound exponentially over long task horizons—and
                    how deterministic verifiers, compaction, and policy hooks rescue reliability.
                  </p>
                </div>
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => {
                    setBaseStepAcc(88)
                    setHorizonTurns(12)
                    setCompactThreshold(70)
                    setUseVerifier(true)
                    setUseDoomLoopGuard(true)
                    setUsePolicySandbox(true)
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              </div>

              <div className="dsde-control-list">
                <label className="dsde-slider-row">
                  <div className="dsde-slider-top">
                    <span>Base LLM Single-Step Accuracy</span>
                    <strong className="bc-tabular">{baseStepAcc}%</strong>
                  </div>
                  <input
                    type="range"
                    min={65}
                    max={97}
                    step={1}
                    value={baseStepAcc}
                    onChange={e => setBaseStepAcc(Number(e.target.value))}
                  />
                  <div className="dsde-slider-bounds bc-tabular">
                    <span>65% (Small model)</span>
                    <span>97% (Frontier)</span>
                  </div>
                </label>

                <label className="dsde-slider-row">
                  <div className="dsde-slider-top">
                    <span>Task Horizon Depth (Tool Turns)</span>
                    <strong className="bc-tabular">{horizonTurns} turns</strong>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={25}
                    step={1}
                    value={horizonTurns}
                    onChange={e => setHorizonTurns(Number(e.target.value))}
                  />
                  <div className="dsde-slider-bounds bc-tabular">
                    <span>3 turns (Short)</span>
                    <span>25 turns (Long-horizon)</span>
                  </div>
                </label>

                <label className="dsde-slider-row">
                  <div className="dsde-slider-top">
                    <span>Context Compaction Trigger</span>
                    <strong className="bc-tabular">{compactThreshold}% window</strong>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    value={compactThreshold}
                    onChange={e => setCompactThreshold(Number(e.target.value))}
                  />
                  <div className="dsde-slider-bounds bc-tabular">
                    <span>50% (Aggressive)</span>
                    <span>100% (No compaction / Rot)</span>
                  </div>
                </label>

                <div className="dsde-toggle-row">
                  <span>Deterministic Verifier Backpressure (Tests / Lint)</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useVerifier}
                    className={`dsde-switch ${useVerifier ? 'on' : ''}`}
                    onClick={() => setUseVerifier(v => !v)}
                  >
                    {useVerifier ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="dsde-toggle-row">
                  <span>Doom-Loop &amp; Budget Circuit Breaker</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useDoomLoopGuard}
                    className={`dsde-switch ${useDoomLoopGuard ? 'on' : ''}`}
                    onClick={() => setUseDoomLoopGuard(v => !v)}
                  >
                    {useDoomLoopGuard ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="dsde-toggle-row">
                  <span>Isolated Sandbox + Pre-Tool Policy Hook</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={usePolicySandbox}
                    className={`dsde-switch ${usePolicySandbox ? 'on' : ''}`}
                    onClick={() => setUsePolicySandbox(v => !v)}
                  >
                    {usePolicySandbox ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </section>

            <section className="dsde-card dsde-sim-stage">
              <div className={`dsde-health-banner ${sim.health}`}>
                {sim.health === 'optimal' ? (
                  <CheckCircle2 size={18} />
                ) : sim.health === 'tradeoff' ? (
                  <AlertTriangle size={18} />
                ) : (
                  <XCircle size={18} />
                )}
                <div>
                  <span className="dsde-health-tag">
                    Architect Verdict:{' '}
                    {sim.health === 'optimal'
                      ? 'Production-Ready Harness'
                      : sim.health === 'tradeoff'
                      ? 'Reliability Trade-Off'
                      : 'Unsafe or Fragile Runtime'}
                  </span>
                  <strong>
                    Harness lifts {horizonTurns}-turn pass@1 from {sim.rawPassAt1Pct}% to{' '}
                    {sim.harnessPassAt1Pct}% (+{sim.liftPts} pts on identical LLM weights)
                  </strong>
                  <p>
                    Over {horizonTurns} chained steps, an unharnessed {baseStepAcc}% model decays to{' '}
                    {sim.rawPassAt1Pct}% pass@1 ({sim.rawPassPow3Pct}% pass^3). Verifier backpressure
                    + timely compaction cuts cost per solved task from ${sim.costPerSolvedRaw} to $
                    {sim.costPerSolvedHarness}.
                  </p>
                </div>
              </div>

              <div className="dsde-kpi-grid">
                <div className={`dsde-kpi-card ${sim.harnessPassAt1Pct >= 65 ? 'optimal' : sim.harnessPassAt1Pct >= 45 ? 'tradeoff' : 'breaking'}`}>
                  <span>Harness pass@1</span>
                  <strong className="bc-tabular">{sim.harnessPassAt1Pct}%</strong>
                  <small>vs {sim.rawPassAt1Pct}% unharnessed</small>
                </div>
                <div className={`dsde-kpi-card ${sim.harnessPassPow3Pct >= 45 ? 'optimal' : sim.harnessPassPow3Pct >= 25 ? 'tradeoff' : 'breaking'}`}>
                  <span>3-Run Consistency (pass^3)</span>
                  <strong className="bc-tabular">{sim.harnessPassPow3Pct}%</strong>
                  <small>vs {sim.rawPassPow3Pct}% raw</small>
                </div>
                <div className={`dsde-kpi-card ${sim.costPerSolvedHarness <= sim.costPerSolvedRaw ? 'optimal' : 'tradeoff'}`}>
                  <span>Cost / Solved Task</span>
                  <strong className="bc-tabular">${sim.costPerSolvedHarness}</strong>
                  <small>vs ${sim.costPerSolvedRaw} raw</small>
                </div>
                <div className={`dsde-kpi-card ${usePolicySandbox ? 'optimal' : 'breaking'}`}>
                  <span>Blast-Radius Safety</span>
                  <strong>{usePolicySandbox ? 'Isolated' : 'Exposed'}</strong>
                  <small>{sim.blastRadiusRisk}</small>
                </div>
              </div>

              {/* Live SVG Multi-Turn Decay Curve */}
              <div className="dsde-svg-box">
                <div className="dsde-svg-head">
                  <span>Multi-Turn Reliability Decay Curve (Turn 1 → Turn {horizonTurns})</span>
                  <div className="dsde-svg-legend">
                    <span className="leg-b">Engineered Harness ({sim.harnessPassAt1Pct}%)</span>
                    <span className="leg-a">Raw Unharnessed LLM ({sim.rawPassAt1Pct}%)</span>
                  </div>
                </div>
                <svg
                  className="dsde-curve-svg"
                  viewBox={`0 0 ${sim.svgW} ${sim.svgH}`}
                  role="img"
                  aria-label="Multi-turn agent reliability comparison curve"
                >
                  <line x1="24" y1="122" x2="456" y2="122" stroke="#22314f" strokeWidth="1" />
                  <line x1="24" y1="68" x2="456" y2="68" stroke="#18243c" strokeWidth="1" strokeDasharray="4 4" />
                  <polyline
                    fill="none"
                    stroke="#7b8cff"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                    strokeLinejoin="round"
                    points={sim.rawLine}
                  />
                  <polyline
                    fill="none"
                    stroke="#6ee2ba"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                    points={sim.harnessLine}
                  />
                </svg>
              </div>

              <div className="dsde-bars-box">
                <span className="dsde-kicker">Direct Architecture Comparison</span>
                <div className="dsde-bars-list">
                  <div className="dsde-bar-row tone-positive">
                    <span className="dsde-bar-label">Engineered Harness pass@1</span>
                    <progress value={sim.harnessPassAt1Pct} max={100} />
                    <strong className="bc-tabular">{sim.harnessPassAt1Pct}%</strong>
                  </div>
                  <div className="dsde-bar-row tone-warning">
                    <span className="dsde-bar-label">Unharnessed LLM pass@1</span>
                    <progress value={sim.rawPassAt1Pct} max={100} />
                    <strong className="bc-tabular">{sim.rawPassAt1Pct}%</strong>
                  </div>
                  <div className="dsde-bar-row tone-primary">
                    <span className="dsde-bar-label">Engineered Harness pass^3</span>
                    <progress value={sim.harnessPassPow3Pct} max={100} />
                    <strong className="bc-tabular">{sim.harnessPassPow3Pct}%</strong>
                  </div>
                  <div className={`dsde-bar-row ${sim.rotPct > 40 ? 'tone-danger' : 'tone-positive'}`}>
                    <span className="dsde-bar-label">Context Rot Risk</span>
                    <progress value={Math.max(4, sim.rotPct)} max={100} />
                    <strong className="bc-tabular">{sim.rotPct}%</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================
            TAB 05: LIVE EXECUTABLE AGENT HARNESS SANDBOX (WEB WORKER)
        ================================================================= */}
        {tab === 'playground' && (
          <div className="dsde-panel-stack">
            <div className="dsde-challenge-banner">
              <div>
                <span className="dsde-kicker">Real Isolated Web Worker Sandbox</span>
                <p>
                  Edit and run a complete deterministic Agent Harness right here. Try flipping{' '}
                  <code>ENABLE_POLICY_HOOK = false</code> or <code>ENABLE_VERIFIER = false</code> to
                  watch real security &amp; verification assertions fail immediately.
                </p>
                <small>Shortcut: Press Ctrl + Enter (or Cmd + Enter) inside the editor to execute live.</small>
              </div>
              <div className="dsde-pg-actions">
                <button
                  type="button"
                  className="bc-btn-primary"
                  disabled={running}
                  onClick={() => void executeHarnessSandbox(sandboxCode)}
                >
                  <Play size={14} />
                  <span>{running ? 'Running...' : 'Run Live Harness'}</span>
                </button>
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => {
                    setSandboxCode(harnessPlaygroundExecutableCode)
                    void executeHarnessSandbox(harnessPlaygroundExecutableCode)
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => void copyText(sandboxCode, setCopiedCode)}
                >
                  {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="dsde-ide-split">
              <div className="dsde-editor-card">
                <div className="dsde-editor-bar">
                  <span className="dsde-console-title">harness_runtime.js (Editable Live)</span>
                  <span className="dsde-editor-meta">
                    {sandboxCode !== harnessPlaygroundExecutableCode ? 'Custom edits active' : 'Starter ready'}
                  </span>
                </div>
                <textarea
                  className="dsde-code-textarea"
                  spellCheck={false}
                  value={sandboxCode}
                  aria-label="Live Agent Harness code editor"
                  onChange={e => setSandboxCode(e.target.value)}
                  onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      void executeHarnessSandbox(sandboxCode)
                    }
                  }}
                />
              </div>

              <div className="dsde-console-card">
                <div className="dsde-console-bar">
                  <span className="dsde-console-title">
                    <Terminal size={14} /> Harness Execution Trace
                  </span>
                  {runResult && (
                    <span className="bc-tabular dsde-console-meta">
                      {runResult.durationMs}ms · {passedAssertions}/{totalAssertions} assertions passed
                    </span>
                  )}
                </div>

                {!runResult ? (
                  <div className="dsde-console-empty">Click Run Live Harness to execute in the sandbox.</div>
                ) : (
                  <div className="dsde-console-body">
                    {runResult.errorMessage && (
                      <div className="dsde-runtime-error">
                        <XCircle size={15} />
                        <span>{runResult.errorMessage}</span>
                      </div>
                    )}

                    {runResult.metrics.length > 0 && (
                      <div className="dsde-run-metrics">
                        {runResult.metrics.map(m => (
                          <div className={`dsde-run-metric ${m.status ?? 'optimal'}`} key={m.label}>
                            <span>{m.label}</span>
                            <strong className="bc-tabular">{m.value}</strong>
                            <small>{m.unit ?? ''}</small>
                          </div>
                        ))}
                      </div>
                    )}

                    {runResult.assertions.length > 0 && (
                      <div className="dsde-assertions">
                        {runResult.assertions.map((a, idx) => (
                          <div className={`dsde-assert-row ${a.passed ? 'pass' : 'fail'}`} key={idx}>
                            {a.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            <span>
                              <strong>{a.passed ? 'PASS' : 'FAIL'}:</strong> {a.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {runResult.logs.length > 0 && (
                      <div className="dsde-logs">
                        {runResult.logs.map((entry, idx) => (
                          <div className={`dsde-log-line ${entry.level}`} key={idx}>
                            <code>{entry.text}</code>
                          </div>
                        ))}
                      </div>
                    )}

                    {runResult.artifacts.map((art, idx) => (
                      <details className="vlab-artifact-card" key={idx} open={idx === 0}>
                        <summary>{art.title} (JSON Artifact)</summary>
                        <pre>{JSON.stringify(art.data, null, 2)}</pre>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
