import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Database,
  FileCode2,
  Play,
  RotateCcw,
  Sliders,
  Terminal,
  Workflow,
  XCircle
} from 'lucide-react'
import { virtualLabSpecs, type VirtualLabSpec } from '../data/virtualLabSpecs'
import { runInVirtualSandbox, type SandboxRunResult } from '../utils/sandboxRunner'
import MermaidDiagram from './MermaidDiagram'
import AllSimulatorsWall from './AllSimulatorsWall'
import RagSimulatorPlayground from './RagSimulatorPlayground'

type WorkspaceMode = 'runtime' | 'rag-sim' | 'simulators'
type CodeTab = 'sandbox' | 'python' | 'architecture'

type Props = {
  onOpenFrontier?: () => void
  onOpenProduction?: () => void
  onOpenCurriculumStage?: (stageId: string) => void
}

function defaultEnvFor(lab: VirtualLabSpec): Record<string, string | number | boolean> {
  return Object.fromEntries(lab.envControls.map(ctrl => [ctrl.key, ctrl.defaultValue]))
}

export default function VirtualLabWorkspace({
  onOpenFrontier,
  onOpenProduction,
  onOpenCurriculumStage
}: Props) {
  const [mode, setMode] = useState<WorkspaceMode>('runtime')
  const [selectedLabId, setSelectedLabId] = useState<string>(virtualLabSpecs[0].id)
  const [codeTab, setCodeTab] = useState<CodeTab>('sandbox')
  const [showDfd, setShowDfd] = useState(false)
  const [copied, setCopied] = useState(false)

  // Per-lab editable code & env state so learners keep their edits when switching labs
  const [codeByLab, setCodeByLab] = useState<Record<string, string>>(() =>
    Object.fromEntries(virtualLabSpecs.map(l => [l.id, l.executableCode]))
  )
  const [envByLab, setEnvByLab] = useState<Record<string, Record<string, string | number | boolean>>>(() =>
    Object.fromEntries(virtualLabSpecs.map(l => [l.id, defaultEnvFor(l)]))
  )
  const [resultsByLab, setResultsByLab] = useState<Record<string, SandboxRunResult>>({})
  const [running, setRunning] = useState(false)

  const lab = useMemo(
    () => virtualLabSpecs.find(l => l.id === selectedLabId) ?? virtualLabSpecs[0],
    [selectedLabId]
  )

  const activeCode = codeByLab[lab.id] ?? lab.executableCode
  const activeEnv = envByLab[lab.id] ?? defaultEnvFor(lab)
  const activeResult = resultsByLab[lab.id] ?? null

  const executeLab = useCallback(
    async (labId: string, codeToRun: string, envToRun: Record<string, string | number | boolean>) => {
      setRunning(true)
      const res = await runInVirtualSandbox(codeToRun, envToRun)
      setResultsByLab(prev => ({ ...prev, [labId]: res }))
      setRunning(false)
    },
    []
  )

  // Auto-run once on initial lab load so real computed output is immediately visible
  useEffect(() => {
    if (!resultsByLab[lab.id]) {
      void executeLab(lab.id, activeCode, activeEnv)
    }
  }, [lab.id, activeCode, activeEnv, resultsByLab, executeLab])

  const updateEnv = (key: string, value: string | number | boolean) => {
    const nextEnv = { ...activeEnv, [key]: value }
    setEnvByLab(prev => ({ ...prev, [lab.id]: nextEnv }))
    void executeLab(lab.id, activeCode, nextEnv)
  }

  const handleReset = () => {
    const freshEnv = defaultEnvFor(lab)
    setCodeByLab(prev => ({ ...prev, [lab.id]: lab.executableCode }))
    setEnvByLab(prev => ({ ...prev, [lab.id]: freshEnv }))
    void executeLab(lab.id, lab.executableCode, freshEnv)
  }

  const handleCopyCode = async () => {
    const text = codeTab === 'python' ? lab.pythonBlueprint : activeCode
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const lineCount = activeCode.split('\n').length
  const isCodeModified = activeCode !== lab.executableCode
  const passedCount = activeResult ? activeResult.assertions.filter(a => a.passed).length : 0
  const totalAssertions = activeResult ? activeResult.assertions.length : 0

  // Extract optional live training loss curve from artifacts (e.g. Lab 07 Mini-LLM training!)
  const liveLossCurve = useMemo(() => {
    if (!activeResult) return null
    for (const art of activeResult.artifacts) {
      if (art.data && typeof art.data === 'object' && 'loss_curve' in (art.data as Record<string, unknown>)) {
        const raw = (art.data as { loss_curve?: unknown }).loss_curve
        if (Array.isArray(raw) && raw.length >= 2) {
          return raw.filter(
            (pt): pt is { epoch: number; loss: number } =>
              Boolean(pt) && typeof pt === 'object' && typeof (pt as { epoch?: unknown }).epoch === 'number' && typeof (pt as { loss?: unknown }).loss === 'number'
          )
        }
      }
    }
    return null
  }, [activeResult])

  return (
    <section className="vlab-shell" id="virtual-lab-workspace" aria-label="Architect Virtual Lab, Live Runtime and All Simulators">
      {/* Unified Header with Clean Mode Switcher */}
      <header className="vlab-header">
        <div>
          <div className="bc-meta-line">
            <span>Architect Virtual Lab &amp; Runtime</span>
            <span aria-hidden="true">·</span>
            <span>Isolated Web Worker Sandbox</span>
            <span aria-hidden="true">·</span>
            <span>{virtualLabSpecs.length} Runnable Deep Labs</span>
            <span aria-hidden="true">·</span>
            <span>20 Interactive Simulators</span>
          </div>
          <h2>Virtual Lab, Live Code Execution &amp; All Simulators Control Room</h2>
          <p>
            Read deep architect-grade implementations, edit code or inject real production faults in the virtual environment,
            press Run Code (or Ctrl/Cmd + Enter) to execute real computations in an isolated worker, or play all 20 simulators side-by-side.
          </p>
        </div>

        <div className="bc-segmented vlab-mode-switch" role="tablist" aria-label="Virtual Lab workspace mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'runtime'}
            className={mode === 'runtime' ? 'active' : ''}
            onClick={() => setMode('runtime')}
          >
            <Terminal size={14} />
            <span>Virtual Lab &amp; Run Env ({virtualLabSpecs.length} Labs)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'rag-sim'}
            className={mode === 'rag-sim' ? 'active' : ''}
            onClick={() => setMode('rag-sim')}
          >
            <Database size={14} />
            <span>RAG Simulator (Live)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'simulators'}
            className={mode === 'simulators' ? 'active' : ''}
            onClick={() => setMode('simulators')}
          >
            <Sliders size={14} />
            <span>All Simulators Wall (20)</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          MODE 1: VIRTUAL LAB & LIVE SANDBOX RUNTIME ENVIRONMENT
      ===================================================================== */}
      {mode === 'runtime' && (
        <div className="vlab-ide-layout">
          {/* Left Rail: 6 Deep Architect Labs */}
          <aside className="vlab-sidebar" aria-label="Runnable architect labs">
            <div className="vlab-side-title">Deep Architect Labs</div>
            <div className="vlab-lab-list">
              {virtualLabSpecs.map(item => {
                const res = resultsByLab[item.id]
                const active = item.id === lab.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`vlab-lab-btn ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      setSelectedLabId(item.id)
                      setShowDfd(false)
                    }}
                  >
                    <div className="vlab-lab-btn-top">
                      <span className="bc-tabular">{item.number}</span>
                      {res && (
                        <span className={`vlab-run-status ${res.ok ? 'pass' : 'fail'}`}>
                          {res.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          <span>{res.ok ? 'Pass' : 'Fail'}</span>
                        </span>
                      )}
                    </div>
                    <strong>{item.title}</strong>
                    <small>{item.stageTag}</small>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Right Main Architect IDE + Virtual Environment + Live Output */}
          <div className="vlab-main">
            {/* Lab Banner & Virtual Env Specs */}
            <div className="vlab-lab-banner">
              <div>
                <div className="bc-meta-line">
                  <span>Lab {lab.number}</span>
                  <span aria-hidden="true">·</span>
                  <span>{lab.runtimeProfile}</span>
                  <span aria-hidden="true">·</span>
                  <span>{lab.packages.join(' · ')}</span>
                </div>
                <h3>{lab.title}</h3>
                <p>{lab.summary}</p>
              </div>
              <div className="vlab-run-actions">
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => setShowDfd(v => !v)}
                >
                  <Workflow size={14} />
                  <span>{showDfd ? 'Hide Lab DFD' : 'Inspect Lab DFD'}</span>
                </button>
                <button type="button" className="bc-btn-secondary" onClick={handleReset}>
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  className="bc-btn-primary vlab-play-btn"
                  disabled={running}
                  onClick={() => void executeLab(lab.id, activeCode, activeEnv)}
                >
                  <Play size={14} />
                  <span>{running ? 'Running...' : 'Run Code'}</span>
                </button>
              </div>
            </div>

            {showDfd && (
              <div className="vlab-dfd-drawer">
                <MermaidDiagram syntax={lab.mermaidDfd} diagramType="flowchart" nodeLabels={{}} />
              </div>
            )}

            {/* Live Virtual Environment Configuration & Fault Injection Bar */}
            <div className="vlab-env-panel" aria-label="Virtual runtime environment configuration">
              <div className="vlab-env-head">
                <strong>Virtual Runtime Environment (.env &amp; Fault Injection)</strong>
                <span>Changes auto-execute in the isolated Web Worker sandbox</span>
              </div>
              <div className="vlab-env-grid">
                {lab.envControls.map(ctrl => {
                  const val = activeEnv[ctrl.key] ?? ctrl.defaultValue
                  if (ctrl.type === 'select') {
                    return (
                      <label key={ctrl.key} className="vlab-env-control">
                        <span>{ctrl.label}</span>
                        <select
                          value={String(val)}
                          onChange={e => updateEnv(ctrl.key, e.target.value)}
                        >
                          {ctrl.options.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )
                  }
                  if (ctrl.type === 'toggle') {
                    const checked = Boolean(val)
                    return (
                      <div key={ctrl.key} className="vlab-env-control">
                        <span>{ctrl.label}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          className={`bc-toggle ${checked ? 'on' : 'off'}`}
                          onClick={() => updateEnv(ctrl.key, !checked)}
                        >
                          <span className="bc-toggle-thumb" />
                          <span>{checked ? 'Enabled' : 'Disabled'}</span>
                        </button>
                      </div>
                    )
                  }
                  const num = typeof val === 'number' ? val : Number(ctrl.defaultValue)
                  return (
                    <div key={ctrl.key} className="vlab-env-control">
                      <div className="vlab-env-slider-top">
                        <label htmlFor={`env-${lab.id}-${ctrl.key}`}>{ctrl.label}</label>
                        <strong className="bc-tabular">
                          {ctrl.step < 1 ? num.toFixed(2) : num} {ctrl.unit ?? ''}
                        </strong>
                      </div>
                      <input
                        id={`env-${lab.id}-${ctrl.key}`}
                        type="range"
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={num}
                        onChange={e => updateEnv(ctrl.key, Number(e.target.value))}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Split IDE: Editable Deep Architect Code (Left) + Live Computed Output (Right) */}
            <div className="vlab-split-ide">
              {/* Code Pane */}
              <div className="vlab-pane vlab-code-pane">
                <div className="vlab-pane-bar">
                  <div className="vlab-code-tabs" role="tablist" aria-label="Lab code views">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={codeTab === 'sandbox'}
                      className={codeTab === 'sandbox' ? 'active' : ''}
                      onClick={() => setCodeTab('sandbox')}
                    >
                      <Code2 size={14} />
                      <span>Executable Sandbox (.js)</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={codeTab === 'python'}
                      className={codeTab === 'python' ? 'active' : ''}
                      onClick={() => setCodeTab('python')}
                    >
                      <FileCode2 size={14} />
                      <span>Python Blueprint (.py)</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={codeTab === 'architecture'}
                      className={codeTab === 'architecture' ? 'active' : ''}
                      onClick={() => setCodeTab('architecture')}
                    >
                      <BookOpen size={14} />
                      <span>Architect Brief</span>
                    </button>
                  </div>

                  {codeTab !== 'architecture' && (
                    <button type="button" className="bc-btn-ghost" onClick={handleCopyCode}>
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                {codeTab === 'sandbox' && (
                  <div className="vlab-editor-wrap">
                    <div className="vlab-editor-meta">
                      <span>
                        Live Sandbox {isCodeModified ? '· Modified (Custom Edits Active)' : '· Press Ctrl/Cmd+Enter to Run'}
                      </span>
                      <span className="bc-tabular">{lineCount} lines</span>
                    </div>
                    <textarea
                      className="vlab-code-textarea"
                      spellCheck={false}
                      aria-label="Editable executable lab code"
                      value={activeCode}
                      onKeyDown={e => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault()
                          void executeLab(lab.id, activeCode, activeEnv)
                        }
                      }}
                      onChange={e =>
                        setCodeByLab(prev => ({ ...prev, [lab.id]: e.target.value }))
                      }
                    />
                  </div>
                )}

                {codeTab === 'python' && (
                  <div className="vlab-python-view">
                    <div className="vlab-editor-meta">
                      <span>Production Python Architecture Reference (copy-ready for PyTorch / vLLM / FastAPI / Anthropic SDK)</span>
                    </div>
                    <pre className="bc-code-pre vlab-py-pre">
                      <code>{lab.pythonBlueprint}</code>
                    </pre>
                  </div>
                )}

                {codeTab === 'architecture' && (
                  <div className="vlab-arch-brief">
                    <div>
                      <h4>Architect Objective</h4>
                      <p>{lab.architectGoal}</p>
                    </div>
                    <div>
                      <h4>Guided Experiments to Try Right Now</h4>
                      <ol>
                        {lab.whatToExperiment.map(step => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <h4>Runtime Environment Contract</h4>
                      <p>
                        Your code executes inside an isolated Browser Web Worker with a 2,500ms timeout guard, zero host DOM access,
                        and frozen <code>ENV</code> parameters—mirroring a real sandboxed execution container.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Output Console, Metrics & Assertions Pane */}
              <div className="vlab-pane vlab-output-pane" aria-live="polite">
                <div className="vlab-pane-bar">
                  <div className="vlab-output-status">
                    {activeResult ? (
                      activeResult.ok ? (
                        <span className="vlab-verdict pass">
                          <CheckCircle2 size={15} />
                          <span>All Invariants Passed</span>
                        </span>
                      ) : (
                        <span className="vlab-verdict fail">
                          <XCircle size={15} />
                          <span>
                            {activeResult.timedOut
                              ? 'Execution Timed Out'
                              : activeResult.errorMessage
                                ? 'Runtime Error'
                                : 'Architect Assertion Failed'}
                          </span>
                        </span>
                      )
                    ) : (
                      <span className="vlab-verdict">Initializing sandbox...</span>
                    )}
                  </div>
                  {activeResult && (
                    <div className="vlab-run-telemetry bc-tabular">
                      <span>{activeResult.durationMs.toFixed(1)} ms</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {passedCount}/{totalAssertions} assertions
                      </span>
                    </div>
                  )}
                </div>

                {/* Emitted KPI Metrics */}
                {activeResult && activeResult.metrics.length > 0 && (
                  <div className="vlab-out-metrics">
                    {activeResult.metrics.map(m => (
                      <div
                        key={m.label}
                        className={`vlab-out-metric ${m.status ? `bc-health-${m.status}` : ''}`}
                      >
                        <span>{m.label}</span>
                        <strong className="bc-tabular">{m.value}</strong>
                        {m.unit && <small>{m.unit}</small>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Computed SVG Loss Descent Chart (when emitted by training lab) */}
                {liveLossCurve && liveLossCurve.length >= 2 && (() => {
                  const maxLoss = Math.max(...liveLossCurve.map(p => p.loss), 0.5)
                  const maxEpoch = Math.max(...liveLossCurve.map(p => p.epoch), 1)
                  const points = liveLossCurve
                    .map(p => {
                      const x = 24 + (p.epoch / maxEpoch) * 292
                      const y = 94 - (p.loss / maxLoss) * 76
                      return `${x.toFixed(1)},${y.toFixed(1)}`
                    })
                    .join(' ')
                  return (
                    <div className="vlab-loss-chart-box">
                      <div className="vlab-sub-label">Live Training Cross-Entropy Loss Curve (Untrained → Trained)</div>
                      <svg viewBox="0 0 340 110" className="vlab-loss-svg" role="img" aria-label="Cross-entropy loss curve across epochs">
                        <line x1="24" y1="94" x2="316" y2="94" stroke="#2a3a5c" strokeWidth="1" />
                        <line x1="24" y1="18" x2="24" y2="94" stroke="#2a3a5c" strokeWidth="1" />
                        <polyline fill="none" stroke="#7d8fff" strokeWidth="2.5" points={points} />
                        {liveLossCurve.map(p => {
                          const cx = 24 + (p.epoch / maxEpoch) * 292
                          const cy = 94 - (p.loss / maxLoss) * 76
                          return <circle key={p.epoch} cx={cx} cy={cy} r="3.5" fill="#6ee2ba" />
                        })}
                      </svg>
                    </div>
                  )
                })()}

                {/* Architect Assertion Suite */}
                {activeResult && activeResult.assertions.length > 0 && (
                  <div className="vlab-assertions">
                    <div className="vlab-sub-label">Architect Invariant Verification</div>
                    {activeResult.assertions.map((a, idx) => (
                      <div key={idx} className={`vlab-assert-row ${a.passed ? 'pass' : 'fail'}`}>
                        {a.passed ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        <span>{a.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Live Captured Terminal Stdout / Stderr */}
                <div className="vlab-console-box">
                  <div className="vlab-sub-label">Live Stdout Console</div>
                  <div className="vlab-console-lines">
                    {activeResult && activeResult.logs.length > 0 ? (
                      activeResult.logs.map((line, i) => (
                        <div key={i} className={`vlab-log-line ${line.level}`}>
                          <span className="vlab-log-ts bc-tabular">+{line.atMs.toFixed(1)}ms</span>
                          <code>{line.text}</code>
                        </div>
                      ))
                    ) : (
                      <div className="vlab-log-line log">
                        <code>Press Run Code to execute this lab in the isolated Web Worker runtime.</code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Structured JSON Artifacts */}
                {activeResult && activeResult.artifacts.length > 0 && (
                  <div className="vlab-artifacts">
                    {activeResult.artifacts.map(art => (
                      <details key={art.title} className="vlab-artifact-card" open>
                        <summary>{art.title} (Live Computed JSON)</summary>
                        <pre>
                          <code>{JSON.stringify(art.data, null, 2)}</code>
                        </pre>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODE 2: INTERACTIVE RAG SIMULATOR (THRESHOLD, TOP-K, RERANKING)
      ===================================================================== */}
      {mode === 'rag-sim' && <RagSimulatorPlayground />}

      {/* ====================================================================
          MODE 3: ALL SIMULATORS LIVE WALL (ALL 20 SIMULATORS VISIBLE)
      ===================================================================== */}
      {mode === 'simulators' && (
        <AllSimulatorsWall
          onOpenFrontier={onOpenFrontier}
          onOpenProduction={onOpenProduction}
          onOpenCurriculumStage={onOpenCurriculumStage}
        />
      )}
    </section>
  )
}
