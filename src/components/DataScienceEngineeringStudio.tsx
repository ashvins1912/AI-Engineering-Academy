import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  StepForward,
  Terminal,
  Workflow,
  XCircle
} from 'lucide-react'
import { dsDeSerialModules, type DsDeSerialModule } from '../data/dsDeSerialTrackData'
import { runInVirtualSandbox, type SandboxRunResult } from '../utils/sandboxRunner'
import MermaidDiagram from './MermaidDiagram'
import TokenStreamTypewriter from './TokenStreamTypewriter'

type StepTab = 'visual' | 'simulator' | 'playground' | 'quiz'
type CodeView = 'sandbox' | 'blueprint'

const STORAGE_KEY = 'ai-academy.dsde-mastered.v1'

const readMastered = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid = new Set(dsDeSerialModules.map(m => m.id))
    return [...new Set(parsed.filter((v): v is string => typeof v === 'string' && valid.has(v)))]
  } catch {
    return []
  }
}

const defaultSimState = (mod: DsDeSerialModule): Record<string, number | boolean> =>
  Object.fromEntries(mod.simControls.map(c => [c.id, c.defaultValue]))

const statusMeta = (status: 'optimal' | 'tradeoff' | 'breaking') => {
  if (status === 'optimal') return { label: 'Optimal', cls: 'optimal' }
  if (status === 'tradeoff') return { label: 'Trade-Off', cls: 'tradeoff' }
  return { label: 'Risk / Breaking', cls: 'breaking' }
}

type Props = {
  onLaunchVirtualLab?: () => void
}

export default function DataScienceEngineeringStudio({ onLaunchVirtualLab }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [stepTab, setStepTab] = useState<StepTab>('visual')
  const [masteredIds, setMasteredIds] = useState<string[]>(readMastered)

  // DFD Animation State
  const [dfdStepIdx, setDfdStepIdx] = useState(0)
  const [isPlayingDfd, setIsPlayingDfd] = useState(false)

  // Per-module simulator parameter state
  const [simStateByMod, setSimStateByMod] = useState<Record<string, Record<string, number | boolean>>>(() =>
    Object.fromEntries(dsDeSerialModules.map(m => [m.id, defaultSimState(m)]))
  )

  // Per-module live sandbox code & execution results
  const [codeByMod, setCodeByMod] = useState<Record<string, string>>(() =>
    Object.fromEntries(dsDeSerialModules.map(m => [m.id, m.executableCode]))
  )
  const [codeView, setCodeView] = useState<CodeView>('sandbox')
  const [resultsByMod, setResultsByMod] = useState<Record<string, SandboxRunResult>>({})
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  // Per-question MCQ answers
  const [answers, setAnswers] = useState<Record<string, number>>({})

  const mod = dsDeSerialModules[activeIdx] ?? dsDeSerialModules[0]
  const activeSimValues = simStateByMod[mod.id] ?? defaultSimState(mod)
  const simResult = useMemo(() => mod.computeSim(activeSimValues), [mod, activeSimValues])
  const activeCode = codeByMod[mod.id] ?? mod.executableCode
  const activeRun = resultsByMod[mod.id] ?? null
  const isModified = activeCode !== mod.executableCode
  const isMastered = masteredIds.includes(mod.id)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(masteredIds))
    } catch {
      // Ignore storage quota issues
    }
  }, [masteredIds])

  // Reset DFD step & pause when changing chapters
  useEffect(() => {
    setDfdStepIdx(0)
    setIsPlayingDfd(false)
    setCodeView('sandbox')
  }, [mod.id])

  // DFD playback timer
  useEffect(() => {
    if (!isPlayingDfd) return
    const timer = window.setInterval(() => {
      setDfdStepIdx(prev => (prev + 1) % mod.dfdSteps.length)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [isPlayingDfd, mod.dfdSteps.length])

  const runLiveCode = useCallback(async (modId: string, code: string) => {
    setRunning(true)
    const res = await runInVirtualSandbox(code, {})
    setResultsByMod(prev => ({ ...prev, [modId]: res }))
    setRunning(false)
  }, [])

  // Auto-run code once when learner enters Step 3 (Live Code Playground)
  useEffect(() => {
    if (stepTab === 'playground' && !resultsByMod[mod.id]) {
      void runLiveCode(mod.id, activeCode)
    }
  }, [stepTab, mod.id, activeCode, resultsByMod, runLiveCode])

  const selectChapter = (idx: number) => {
    setActiveIdx(idx)
    setStepTab('visual')
  }

  const toggleMastered = (id: string) => {
    setMasteredIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const updateSimParam = (paramId: string, value: number | boolean) => {
    setSimStateByMod(prev => ({
      ...prev,
      [mod.id]: { ...(prev[mod.id] ?? defaultSimState(mod)), [paramId]: value }
    }))
  }

  const resetSim = () => {
    setSimStateByMod(prev => ({ ...prev, [mod.id]: defaultSimState(mod) }))
  }

  const handleCopy = async () => {
    const text = codeView === 'blueprint' ? mod.productionBlueprint : activeCode
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const currentDfdFrame = mod.dfdSteps[dfdStepIdx] ?? mod.dfdSteps[0]
  const passedAssertions = activeRun ? activeRun.assertions.filter(a => a.passed).length : 0
  const totalAssertions = activeRun ? activeRun.assertions.length : 0

  // SVG polyline geometry for optional dual-curve visualizer (A/B Power, Forecast, PSI Shift)
  const svgCurve = useMemo(() => {
    const pts = simResult.curvePoints
    if (!pts || pts.length < 2) return null
    const allY = pts.flatMap(p => (p.yB !== undefined ? [p.yA, p.yB] : [p.yA]))
    const minY = Math.min(...allY)
    const maxY = Math.max(...allY, minY + 0.001)
    const w = 480
    const h = 132
    const padX = 20
    const padY = 14
    const toPoint = (idx: number, val: number) => {
      const x = padX + (idx / (pts.length - 1)) * (w - padX * 2)
      const y = h - padY - ((val - minY) / (maxY - minY)) * (h - padY * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }
    const lineA = pts.map((p, i) => toPoint(i, p.yA)).join(' ')
    const lineB = pts[0].yB !== undefined ? pts.map((p, i) => toPoint(i, p.yB ?? 0)).join(' ') : null
    return { w, h, lineA, lineB }
  }, [simResult.curvePoints])

  const healthMeta = statusMeta(simResult.health)
  const masteredPct = Math.round((masteredIds.length / dsDeSerialModules.length) * 100)

  return (
    <section className="dsde-shell" aria-label="Senior Data Science and Data Engineering Serial Mastery Track">
      {/* Header & Serial Progress Summary */}
      <header className="dsde-header">
        <div>
          <div className="bc-meta-line">
            <span>Serial Study Track</span>
            <span aria-hidden="true">·</span>
            <span>Senior Data Science &amp; Data Engineering</span>
            <span aria-hidden="true">·</span>
            <span className="bc-tabular">
              {masteredIds.length} / {dsDeSerialModules.length} Chapters Mastered ({masteredPct}%)
            </span>
          </div>
          <h2>Senior Data Science &amp; Data Engineering Serial Mastery</h2>
          <p>
            Follow all 6 chapters in sequence: inspect each animated data-flow diagram, test real
            mathematical trade-offs in the virtual simulator, run editable live code in the sandbox,
            and verify mastery before advancing.
          </p>
        </div>

        <div className="dsde-header-actions">
          <div className="dsde-progress-box">
            <div className="dsde-progress-top">
              <span>Serial Track Progress</span>
              <strong className="bc-tabular">{masteredPct}%</strong>
            </div>
            <progress className="ux-progress" value={masteredIds.length} max={dsDeSerialModules.length} />
          </div>
          {onLaunchVirtualLab && (
            <button type="button" className="bc-btn-secondary" onClick={onLaunchVirtualLab}>
              <Terminal size={14} />
              <span>Full Virtual Lab IDE</span>
            </button>
          )}
        </div>
      </header>

      {/* Serial 6-Chapter Stepper Strip */}
      <nav className="dsde-serial-rail" aria-label="Serial chapters">
        {dsDeSerialModules.map((item, idx) => {
          const done = masteredIds.includes(item.id)
          const selected = idx === activeIdx
          return (
            <button
              key={item.id}
              type="button"
              className={`dsde-chapter-btn ${selected ? 'active' : ''} ${done ? 'done' : ''}`}
              aria-current={selected ? 'step' : undefined}
              onClick={() => selectChapter(idx)}
            >
              <div className="dsde-chapter-top">
                <span className="bc-tabular">Chapter {String(item.chapterNumber).padStart(2, '0')}</span>
                <span className="dsde-chapter-role">{item.role}</span>
              </div>
              <strong>{item.title}</strong>
              <div className="dsde-chapter-foot">
                <span className="bc-tabular">{item.estimatedMinutes} min</span>
                <span className="dsde-chapter-status">
                  {done ? (
                    <>
                      <CheckCircle2 size={13} /> Mastered
                    </>
                  ) : selected ? (
                    'Studying'
                  ) : (
                    'Next in sequence'
                  )}
                </span>
              </div>
            </button>
          )
        })}
      </nav>

      {/* Active Chapter Header + 4 Progressive Step Tabs */}
      <div className="dsde-chapter-stage">
        <div className="dsde-stage-head">
          <div>
            <div className="bc-meta-line">
              <span className="bc-tabular">Chapter {String(mod.chapterNumber).padStart(2, '0')} of {String(dsDeSerialModules.length).padStart(2, '0')}</span>
              <span aria-hidden="true">·</span>
              <span>{mod.role}</span>
              <span aria-hidden="true">·</span>
              <span>Prereq: {mod.prerequisites}</span>
            </div>
            <h3>{mod.title}</h3>
            <p>{mod.subtitle}</p>
          </div>
          <button
            type="button"
            className={isMastered ? 'bc-btn-primary' : 'bc-btn-secondary'}
            onClick={() => toggleMastered(mod.id)}
          >
            {isMastered ? <Check size={15} /> : <CheckCircle2 size={15} />}
            <span>{isMastered ? 'Chapter Mastered' : 'Mark Chapter Mastered'}</span>
          </button>
        </div>

        <div className="dsde-step-tabs" role="tablist" aria-label="Chapter study steps">
          {(
            [
              { id: 'visual', label: '01. Visual DFD & Intuition', icon: Workflow },
              { id: 'simulator', label: '02. Virtual Simulator', icon: Sliders },
              { id: 'playground', label: '03. Live Code Playground', icon: Code2 },
              { id: 'quiz', label: '04. Architect Mastery Check', icon: BookOpen }
            ] as const
          ).map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={stepTab === tab.id}
                className={`dsde-step-tab ${stepTab === tab.id ? 'active' : ''}`}
                onClick={() => setStepTab(tab.id)}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* ================================================================
            STEP 01: VISUALIZED LEARNING, ANIMATED DFD & WITH VS WITHOUT
        ================================================================= */}
        {stepTab === 'visual' && (
          <div className="dsde-panel-stack">
            <div className="dsde-two-col">
              <article className="dsde-card">
                <span className="dsde-kicker">Plain-English Mental Model</span>
                <h4>Why Senior Teams Rely on This</h4>
                <p>{mod.plainEnglish}</p>
                <div className="dsde-analogy-box">
                  <strong>Everyday Analogy</strong>
                  <p>{mod.realWorldAnalogy}</p>
                </div>
              </article>

              <article className="dsde-card">
                <span className="dsde-kicker">Core Engineering Concepts Covered</span>
                <h4>Chapter Syllabus Checklist</h4>
                <ul className="dsde-concept-list">
                  {mod.keyConcepts.map(c => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </article>
            </div>

            {/* Interactive Animated Mermaid Architecture DFD */}
            <section className="dsde-card">
              <div className="dsde-dfd-head">
                <div>
                  <span className="dsde-kicker">Synchronized Architecture Data-Flow Diagram</span>
                  <h4>Step Through Live Pipeline State</h4>
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
                      setDfdStepIdx(prev => (prev + 1) % mod.dfdSteps.length)
                    }}
                  >
                    <StepForward size={14} />
                    <span>Next Step</span>
                  </button>
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    onClick={() => {
                      setIsPlayingDfd(false)
                      setDfdStepIdx(0)
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              <div className="dsde-dfd-stage">
                <MermaidDiagram
                  syntax={mod.mermaidDfd}
                  diagramType="flowchart"
                  highlightNode={currentDfdFrame.nodeId}
                  nodeLabels={mod.dfdNodeLabels}
                />
              </div>

              <div className="dsde-timeline-bar" role="tablist" aria-label="DFD animation steps">
                {mod.dfdSteps.map((st, idx) => (
                  <button
                    key={st.step}
                    type="button"
                    role="tab"
                    aria-selected={dfdStepIdx === idx}
                    className={`dsde-timeline-btn ${dfdStepIdx === idx ? 'active' : ''}`}
                    onClick={() => {
                      setIsPlayingDfd(false)
                      setDfdStepIdx(idx)
                    }}
                  >
                    <span className="bc-tabular">Step 0{st.step}</span>
                    <strong>{st.title}</strong>
                  </button>
                ))}
              </div>

              <div className="dsde-payload-split">
                <div>
                  <span className="dsde-kicker">Active Node Explanation</span>
                  <h5>{currentDfdFrame.title}</h5>
                  <p>{currentDfdFrame.description}</p>
                </div>
                <div className="dsde-payload-json">
                  <span>Live State Payload</span>
                  <pre>{JSON.stringify(currentDfdFrame.payload, null, 2)}</pre>
                </div>
              </div>
            </section>

            {/* With vs. Without Best Practice */}
            <div className="dsde-two-col">
              <article className="dsde-compare-card good">
                <div className="dsde-compare-head">
                  <CheckCircle2 size={16} />
                  <strong>With Senior Engineering Practice</strong>
                </div>
                <p>{mod.withBestPractice}</p>
              </article>
              <article className="dsde-compare-card bad">
                <div className="dsde-compare-head">
                  <AlertTriangle size={16} />
                  <strong>Without It (Production Failure Mode)</strong>
                </div>
                <p>{mod.withoutBestPractice}</p>
              </article>
            </div>
          </div>
        )}

        {/* ================================================================
            STEP 02: INTERACTIVE VIRTUAL SIMULATOR WITH LIVE SVG VISUALS
        ================================================================= */}
        {stepTab === 'simulator' && (
          <div className="dsde-sim-layout">
            {/* Left: Control Deck */}
            <section className="dsde-card dsde-sim-controls">
              <div className="dsde-sim-ctrl-head">
                <div>
                  <span className="dsde-kicker">Interactive Parameter Deck</span>
                  <h4>{mod.simTitle}</h4>
                  <p>{mod.simSubtitle}</p>
                </div>
                <button type="button" className="bc-btn-secondary" onClick={resetSim}>
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              </div>

              <div className="dsde-control-list">
                {mod.simControls.map(ctrl => {
                  const val = activeSimValues[ctrl.id] ?? ctrl.defaultValue
                  if (ctrl.type === 'toggle') {
                    const checked = Boolean(val)
                    return (
                      <div className="dsde-toggle-row" key={ctrl.id}>
                        <span>{ctrl.label}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          className={`dsde-switch ${checked ? 'on' : ''}`}
                          onClick={() => updateSimParam(ctrl.id, !checked)}
                        >
                          {checked ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )
                  }
                  const numVal = typeof val === 'number' ? val : ctrl.defaultValue
                  return (
                    <label className="dsde-slider-row" key={ctrl.id}>
                      <div className="dsde-slider-top">
                        <span>{ctrl.label}</span>
                        <strong className="bc-tabular">
                          {numVal.toLocaleString()} {ctrl.unit}
                        </strong>
                      </div>
                      <input
                        type="range"
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={numVal}
                        onChange={e => updateSimParam(ctrl.id, Number(e.target.value))}
                      />
                      <div className="dsde-slider-bounds bc-tabular">
                        <span>{ctrl.min.toLocaleString()} {ctrl.unit}</span>
                        <span>{ctrl.max.toLocaleString()} {ctrl.unit}</span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </section>

            {/* Right: Visual Output Stage */}
            <section className="dsde-card dsde-sim-stage">
              <div className={`dsde-health-banner ${healthMeta.cls}`}>
                {simResult.health === 'optimal' ? (
                  <CheckCircle2 size={18} />
                ) : simResult.health === 'tradeoff' ? (
                  <AlertTriangle size={18} />
                ) : (
                  <XCircle size={18} />
                )}
                <div>
                  <span className="dsde-health-tag">System Verdict: {healthMeta.label}</span>
                  <strong>{simResult.headline}</strong>
                  <TokenStreamTypewriter
                    text={simResult.explanation}
                    streamKey={`dsde-verdict-${mod.id}-${simResult.health}-${simResult.headline}`}
                    label="Live System Analysis"
                    variant="prose"
                    tokenDelayMs={28}
                  />
                </div>
              </div>

              <div className="dsde-kpi-grid">
                {simResult.metrics.map(m => {
                  const meta = statusMeta(m.status)
                  return (
                    <div className={`dsde-kpi-card ${meta.cls}`} key={m.label}>
                      <span>{m.label}</span>
                      <strong className="bc-tabular">{m.value}</strong>
                      <small>{m.detail} · {meta.label}</small>
                    </div>
                  )
                })}
              </div>

              {/* Optional Live Computed SVG Curve (Distribution / Forecast / Drift) */}
              {svgCurve && (
                <div className="dsde-svg-box">
                  <div className="dsde-svg-head">
                    <span>{simResult.chartTitle}</span>
                    <div className="dsde-svg-legend">
                      <span className="leg-a">{simResult.curveLabelA ?? 'Series A'}</span>
                      {svgCurve.lineB && (
                        <span className="leg-b">{simResult.curveLabelB ?? 'Series B'}</span>
                      )}
                    </div>
                  </div>
                  <svg
                    className="dsde-curve-svg"
                    viewBox={`0 0 ${svgCurve.w} ${svgCurve.h}`}
                    role="img"
                    aria-label={simResult.chartTitle}
                  >
                    <line x1="20" y1="118" x2="460" y2="118" stroke="#22314f" strokeWidth="1" />
                    <line x1="20" y1="66" x2="460" y2="66" stroke="#18243c" strokeWidth="1" strokeDasharray="4 4" />
                    <polyline
                      fill="none"
                      stroke="#7b8cff"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      points={svgCurve.lineA}
                    />
                    {svgCurve.lineB && (
                      <polyline
                        fill="none"
                        stroke="#6ee2ba"
                        strokeWidth="2.5"
                        strokeDasharray="6 3"
                        strokeLinejoin="round"
                        points={svgCurve.lineB}
                      />
                    )}
                  </svg>
                </div>
              )}

              {/* Comparative Visual Bar Chart */}
              <div className="dsde-bars-box">
                <span className="dsde-kicker">{simResult.chartTitle}</span>
                <div className="dsde-bars-list">
                  {simResult.chartBars.map(bar => (
                    <div className={`dsde-bar-row tone-${bar.tone}`} key={bar.label}>
                      <span className="dsde-bar-label">{bar.label}</span>
                      <progress value={Math.max(2, Math.min(100, bar.value))} max={100} />
                      <strong className="bc-tabular">{bar.displayValue}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================================================================
            STEP 03: LIVE EXECUTABLE CODE PRACTICE PLAYGROUND (WEB WORKER)
        ================================================================= */}
        {stepTab === 'playground' && (
          <div className="dsde-panel-stack">
            <div className="dsde-challenge-banner">
              <div>
                <span className="dsde-kicker">{mod.sandboxTitle}</span>
                <p>{mod.sandboxChallenge}</p>
                <small>Architect Hint: {mod.sandboxHint}</small>
              </div>
              <div className="dsde-pg-actions">
                <button
                  type="button"
                  className="bc-btn-primary"
                  disabled={running}
                  onClick={() => void runLiveCode(mod.id, activeCode)}
                >
                  <Play size={14} />
                  <span>{running ? 'Running...' : 'Run Live Code'}</span>
                </button>
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => {
                    setCodeByMod(prev => ({ ...prev, [mod.id]: mod.executableCode }))
                    void runLiveCode(mod.id, mod.executableCode)
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
                <button type="button" className="bc-btn-secondary" onClick={() => void handleCopy()}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="dsde-ide-split">
              {/* Code Editor Pane */}
              <div className="dsde-editor-card">
                <div className="dsde-editor-bar">
                  <div className="dsde-editor-tabs" role="tablist" aria-label="Code runtime view">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={codeView === 'sandbox'}
                      className={codeView === 'sandbox' ? 'active' : ''}
                      onClick={() => setCodeView('sandbox')}
                    >
                      Live Sandbox (Editable JS · Ctrl+Enter)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={codeView === 'blueprint'}
                      className={codeView === 'blueprint' ? 'active' : ''}
                      onClick={() => setCodeView('blueprint')}
                    >
                      {mod.productionBlueprintLabel}
                    </button>
                  </div>
                  <span className="dsde-editor-meta bc-tabular">
                    {codeView === 'sandbox'
                      ? isModified
                        ? 'Edited live'
                        : 'Starter ready'
                      : 'Production reference'}
                  </span>
                </div>

                {codeView === 'sandbox' ? (
                  <textarea
                    className="dsde-code-textarea"
                    spellCheck={false}
                    value={activeCode}
                    aria-label="Live executable code editor"
                    onChange={e => setCodeByMod(prev => ({ ...prev, [mod.id]: e.target.value }))}
                    onKeyDown={e => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault()
                        void runLiveCode(mod.id, activeCode)
                      }
                    }}
                  />
                ) : (
                  <pre className="dsde-blueprint-pre">{mod.productionBlueprint}</pre>
                )}
              </div>

              {/* Live Worker Output Console */}
              <div className="dsde-console-card">
                <div className="dsde-console-bar">
                  <span className="dsde-console-title">
                    <Terminal size={14} /> Isolated Sandbox Output
                  </span>
                  {activeRun && (
                    <span className="bc-tabular dsde-console-meta">
                      {activeRun.durationMs}ms · {passedAssertions}/{totalAssertions} assertions passed
                    </span>
                  )}
                </div>

                {!activeRun ? (
                  <div className="dsde-console-empty">Click Run Live Code to execute in the sandbox.</div>
                ) : (
                  <div className="dsde-console-body">
                    {activeRun.errorMessage && (
                      <div className="dsde-runtime-error">
                        <XCircle size={15} />
                        <span>{activeRun.errorMessage}</span>
                      </div>
                    )}

                    {activeRun.metrics.length > 0 && (
                      <div className="dsde-run-metrics">
                        {activeRun.metrics.map(m => {
                          const meta = statusMeta(m.status ?? 'optimal')
                          return (
                            <div className={`dsde-run-metric ${meta.cls}`} key={m.label}>
                              <span>{m.label}</span>
                              <strong className="bc-tabular">{m.value}</strong>
                              <small>{m.unit ?? ''}</small>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {activeRun.assertions.length > 0 && (
                      <div className="dsde-assertions">
                        {activeRun.assertions.map((a, idx) => (
                          <div className={`dsde-assert-row ${a.passed ? 'pass' : 'fail'}`} key={idx}>
                            {a.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            <span>
                              <strong>{a.passed ? 'PASS' : 'FAIL'}:</strong> {a.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeRun.logs.length > 0 && (
                      <div className="dsde-logs">
                        <TokenStreamTypewriter
                          text={activeRun.logs.map(entry => entry.text).join('\n')}
                          streamKey={`dsde-log-${mod.id}-${activeRun.durationMs}-${activeRun.logs.length}`}
                          label="Live Sandbox Output"
                          variant="code"
                          tokenDelayMs={20}
                        />
                      </div>
                    )}

                    {activeRun.artifacts.map((art, idx) => (
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

        {/* ================================================================
            STEP 04: ARCHITECT MASTERY QUIZ & SERIAL COMPLETION
        ================================================================= */}
        {stepTab === 'quiz' && (
          <div className="dsde-panel-stack">
            <div className="dsde-quiz-grid">
              {mod.mcqs.map((q, qIdx) => {
                const picked = answers[q.id]
                const answered = picked !== undefined
                const isCorrect = picked === q.correctIndex
                return (
                  <article className="dsde-card dsde-quiz-card" key={q.id}>
                    <span className="dsde-kicker">Troubleshooting Check 0{qIdx + 1}</span>
                    <h4>{q.question}</h4>
                    <div className="dsde-mcq-options">
                      {q.options.map((opt, optIdx) => {
                        const chosen = picked === optIdx
                        const stateCls = !answered
                          ? ''
                          : optIdx === q.correctIndex
                          ? 'correct'
                          : chosen
                          ? 'wrong'
                          : ''
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={`dsde-mcq-opt ${chosen ? 'chosen' : ''} ${stateCls}`}
                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                          >
                            <span className="dsde-mcq-letter">{String.fromCharCode(65 + optIdx)}</span>
                            <span>{opt}</span>
                          </button>
                        )
                      })}
                    </div>
                    {answered && (
                      <div className={`dsde-mcq-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
                        <strong>{isCorrect ? 'Correct Diagnosis' : 'Review This Production Rule'}</strong>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {/* Serial Study Bottom Navigation Footer */}
        <footer className="dsde-serial-footer">
          <button
            type="button"
            className="bc-btn-secondary"
            disabled={activeIdx === 0}
            onClick={() => selectChapter(Math.max(0, activeIdx - 1))}
          >
            <ArrowLeft size={14} />
            <span>
              {activeIdx > 0
                ? `Prev: Ch 0${dsDeSerialModules[activeIdx - 1].chapterNumber}`
                : 'Start of Serial Track'}
            </span>
          </button>

          <div className="dsde-serial-footer-right">
            {stepTab !== 'quiz' && (
              <button
                type="button"
                className="bc-btn-secondary"
                onClick={() => {
                  const order: StepTab[] = ['visual', 'simulator', 'playground', 'quiz']
                  const nextStep = order[order.indexOf(stepTab) + 1]
                  if (nextStep) setStepTab(nextStep)
                }}
              >
                <span>
                  {stepTab === 'visual'
                    ? 'Next Step: Virtual Simulator'
                    : stepTab === 'simulator'
                    ? 'Next Step: Live Code Playground'
                    : 'Next Step: Mastery Check'}
                </span>
                <ArrowRight size={14} />
              </button>
            )}

            {activeIdx < dsDeSerialModules.length - 1 ? (
              <button
                type="button"
                className="bc-btn-primary"
                onClick={() => {
                  if (!isMastered) toggleMastered(mod.id)
                  selectChapter(activeIdx + 1)
                }}
              >
                <span>
                  Complete &amp; Next: Ch 0{dsDeSerialModules[activeIdx + 1].chapterNumber}
                </span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="bc-btn-primary"
                onClick={() => {
                  if (!isMastered) toggleMastered(mod.id)
                }}
              >
                <Check size={15} />
                <span>{isMastered ? 'Serial Track Completed' : 'Finish Serial Track'}</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </section>
  )
}
