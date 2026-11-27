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
  FileCode2,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  StepForward,
  Terminal,
  Workflow,
  XCircle
} from 'lucide-react'
import {
  aiSystemModules,
  ARCHITECT_PRESETS,
  runUnifiedArchitectSim,
  type AiSystemModuleId,
  type ArchitectPresetId,
  type ModelTier,
  type RagMode,
  type UnifiedSimConfig
} from '../data/buildAiSystemsData'
import { runInVirtualSandbox, type SandboxRunResult } from '../utils/sandboxRunner'
import MermaidDiagram from './MermaidDiagram'
import RequestLifecycleDfd from './RequestLifecycleDfd'

type StudioTab = 'guide' | 'dfd' | 'code' | 'simulator'
type CodePaneMode = 'blueprint' | 'sandbox'

const PRESET_FOR_MODULE: Record<AiSystemModuleId, ArchitectPresetId> = {
  'build-chatgpt': 'chatgpt',
  'build-claude': 'claude',
  'build-copilot': 'copilot',
  'transformer-deep-dive': 'claude',
  'unified-model-rag-mcp-acp': 'enterprise-mesh'
}

type Props = {
  onLaunchVirtualLab?: () => void
}

export default function BuildAiSystemsStudio({ onLaunchVirtualLab }: Props) {
  const [activeModIdx, setActiveModIdx] = useState(0)
  const [activeTab, setActiveTab] = useState<StudioTab>('guide')

  // DFD animation state
  const [dfdStepIdx, setDfdStepIdx] = useState(0)
  const [playingDfd, setPlayingDfd] = useState(false)

  // Code blueprint & live sandbox state
  const [codePane, setCodePane] = useState<CodePaneMode>('blueprint')
  const [selectedFileId, setSelectedFileId] = useState(aiSystemModules[0].codeFiles[0].id)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sandboxCodeByMod, setSandboxCodeByMod] = useState<Record<string, string>>(() =>
    Object.fromEntries(aiSystemModules.map(m => [m.id, m.executableJs]))
  )
  const [runResultByMod, setRunResultByMod] = useState<Record<string, SandboxRunResult>>({})
  const [runningSandbox, setRunningSandbox] = useState(false)

  // Unified Architect Virtual Playground Simulator state
  const [simConfig, setSimConfig] = useState<UnifiedSimConfig>(ARCHITECT_PRESETS.chatgpt.config)
  const [pulseHopIdx, setPulseHopIdx] = useState(0)
  const [animatingPipeline, setAnimatingPipeline] = useState(true)

  const mod = aiSystemModules[activeModIdx] ?? aiSystemModules[0]
  const activeFile = mod.codeFiles.find(f => f.id === selectedFileId) ?? mod.codeFiles[0]
  const activeDfdStep = mod.dfdSteps[dfdStepIdx] ?? mod.dfdSteps[0]
  const activeSandboxCode = sandboxCodeByMod[mod.id] ?? mod.executableJs
  const activeRunResult = runResultByMod[mod.id] ?? null
  const isCodeEdited = activeSandboxCode !== mod.executableJs

  const simResult = useMemo(() => runUnifiedArchitectSim(simConfig), [simConfig])

  // Sync file selection, DFD reset, and default simulator preset when module switches
  useEffect(() => {
    setDfdStepIdx(0)
    setPlayingDfd(false)
    setSelectedFileId(mod.codeFiles[0].id)
    setSimConfig(ARCHITECT_PRESETS[PRESET_FOR_MODULE[mod.id]].config)
  }, [mod])

  // DFD auto-animation timer
  useEffect(() => {
    if (!playingDfd) return
    const timer = window.setInterval(() => {
      setDfdStepIdx(prev => (prev + 1) % mod.dfdSteps.length)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [playingDfd, mod.dfdSteps.length])

  // Live Pipeline Packet Pulse animation inside Simulator tab
  useEffect(() => {
    if (activeTab !== 'simulator' || !animatingPipeline) return
    const activeIndices = simResult.activePipelineNodes
      .map((n, idx) => (n.active ? idx : -1))
      .filter(i => i >= 0)
    if (activeIndices.length === 0) return
    const timer = window.setInterval(() => {
      setPulseHopIdx(prev => {
        const pos = activeIndices.indexOf(prev)
        return activeIndices[(pos + 1) % activeIndices.length]
      })
    }, 1150)
    return () => window.clearInterval(timer)
  }, [activeTab, animatingPipeline, simResult.activePipelineNodes])

  const executeSandbox = useCallback(async (modId: string, code: string) => {
    setRunningSandbox(true)
    const res = await runInVirtualSandbox(code, {})
    setRunResultByMod(prev => ({ ...prev, [modId]: res }))
    setRunningSandbox(false)
  }, [])

  // Auto-run sandbox once when user opens Live Sandbox mode
  useEffect(() => {
    if (activeTab === 'code' && codePane === 'sandbox' && !runResultByMod[mod.id] && !runningSandbox) {
      void executeSandbox(mod.id, activeSandboxCode)
    }
  }, [activeTab, codePane, mod.id, activeSandboxCode, runResultByMod, runningSandbox, executeSandbox])

  const copySnippet = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 1800)
    } catch {
      // Clipboard blocked
    }
  }

  return (
    <section className="dsde-shell bais-shell" aria-label="Build ChatGPT, Claude, Copilot and Unified AI Data Flow Studio">
      {/* Studio Header */}
      <header className="dsde-header">
        <div>
          <div className="bc-meta-line">
            <span>Complete Systems Architecture &amp; Code</span>
            <span aria-hidden="true">·</span>
            <span>Simple English</span>
            <span aria-hidden="true">·</span>
            <span>Animated DFDs</span>
            <span aria-hidden="true">·</span>
            <span>Model · RAG · MCP · ACP Simulator</span>
          </div>
          <h2>Build ChatGPT, Claude &amp; Copilot + Unified AI Data Flow Studio</h2>
          <p>
            Learn in plain English how ChatGPT, Claude, GitHub Copilot, and Transformers work under
            the hood—with animated data-flow diagrams, complete copy-ready Python &amp; TypeScript
            implementations, live runnable sandboxes, and an interactive Model + RAG + MCP + ACP
            virtual architect playground.
          </p>
        </div>

        <div className="dsde-header-actions">
          <button
            type="button"
            className="bc-btn-primary"
            onClick={() => setActiveTab('simulator')}
          >
            <Sliders size={14} />
            <span>Open Virtual Architect Playground</span>
          </button>
          {onLaunchVirtualLab && (
            <button type="button" className="bc-btn-secondary" onClick={onLaunchVirtualLab}>
              <Terminal size={14} />
              <span>Full Virtual Lab</span>
            </button>
          )}
        </div>
      </header>

      {/* 5-Blueprint Serial Selector Rail */}
      <nav className="bais-mod-rail" aria-label="AI system blueprints">
        {aiSystemModules.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className={`bais-mod-btn ${idx === activeModIdx ? 'active' : ''}`}
            aria-current={idx === activeModIdx ? 'true' : undefined}
            onClick={() => setActiveModIdx(idx)}
          >
            <div className="dsde-chapter-top">
              <span className="bc-tabular">0{item.number}</span>
              <span className="dsde-chapter-role">{item.badge}</span>
            </div>
            <strong>{item.title.split('(')[0].trim()}</strong>
          </button>
        ))}
      </nav>

      {/* Active Blueprint Stage */}
      <div className="dsde-chapter-stage">
        <div className="dsde-stage-head">
          <div>
            <div className="bc-meta-line">
              <span className="bc-tabular">Blueprint 0{mod.number} / 0{aiSystemModules.length}</span>
              <span aria-hidden="true">·</span>
              <span>{mod.badge}</span>
            </div>
            <h3>{mod.title}</h3>
            <p>{mod.subtitle}</p>
          </div>
        </div>

        {/* 4 Focused Learning Tabs */}
        <div className="dsde-step-tabs" role="tablist" aria-label="Blueprint view modes">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'guide'}
            className={`dsde-step-tab ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            <BookOpen size={15} />
            <span>01. Simple English Guide ({mod.concepts.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dfd'}
            className={`dsde-step-tab ${activeTab === 'dfd' ? 'active' : ''}`}
            onClick={() => setActiveTab('dfd')}
          >
            <Workflow size={15} />
            <span>02. Animated Data Flow (DFD)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'code'}
            className={`dsde-step-tab ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            <Code2 size={15} />
            <span>03. Complete Code &amp; Live Sandbox</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'simulator'}
            className={`dsde-step-tab ${activeTab === 'simulator' ? 'active' : ''}`}
            onClick={() => setActiveTab('simulator')}
          >
            <Sliders size={15} />
            <span>04. Architect Virtual Playground</span>
          </button>
        </div>

        {/* ================================================================
            TAB 1: SIMPLE ENGLISH GUIDE & ANALOGIES
        ================================================================= */}
        {activeTab === 'guide' && (
          <div className="dsde-panel-stack">
            <div className="dsde-card">
              <span className="dsde-kicker">IN PLAIN, SIMPLE ENGLISH</span>
              <h4>How It Actually Works</h4>
              <p>{mod.simpleSummary}</p>
              <div className="dsde-analogy-box">
                <strong className="ml26-inline-icon">
                  <Lightbulb size={14} /> Everyday Analogy
                </strong>
                <p>{mod.analogy}</p>
              </div>
            </div>

            <div className="bais-concept-grid">
              {mod.concepts.map(c => (
                <article key={c.id} className="dsde-card bais-concept-card">
                  <h4>{c.title}</h4>
                  <p>{c.simpleEnglish}</p>
                  <div className="dsde-analogy-box">
                    <strong>Analogy</strong>
                    <p>{c.analogy}</p>
                  </div>
                  <div className="bais-io-box">
                    <span>DATA FLOW (IN → OUT)</span>
                    <code>{c.dataFlowInOut}</code>
                  </div>
                  <p className="bais-why-note">
                    <strong>Why it matters:</strong> {c.whyItMatters}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 2: ANIMATED MERMAID DFD & END-TO-END REQUEST LIFECYCLE
        ================================================================= */}
        {activeTab === 'dfd' && (
          <div className="dsde-panel-stack">
            <RequestLifecycleDfd modeLabel={mod.title.split('(')[0].trim()} />

            <div className="dsde-card">
              <div className="dsde-dfd-head">
                <div>
                  <span className="dsde-kicker">ANIMATED ARCHITECTURE DATA FLOW DIAGRAM</span>
                  <h4>Watch Data Travel Hop-by-Hop: {mod.title.split('(')[0].trim()}</h4>
                </div>
                <div className="dsde-dfd-controls">
                  <button
                    type="button"
                    className="bc-btn-primary"
                    onClick={() => setPlayingDfd(p => !p)}
                  >
                    {playingDfd ? <Pause size={14} /> : <Play size={14} />}
                    <span>{playingDfd ? 'Pause Animation' : 'Animate Data Flow'}</span>
                  </button>
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    onClick={() => {
                      setPlayingDfd(false)
                      setDfdStepIdx(prev => (prev + 1) % mod.dfdSteps.length)
                    }}
                  >
                    <StepForward size={14} />
                    <span>Next Hop</span>
                  </button>
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    onClick={() => {
                      setPlayingDfd(false)
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
                  highlightNode={activeDfdStep.nodeId}
                  nodeLabels={mod.dfdNodeLabels}
                />
              </div>

              <div className="bais-dfd-steps" role="tablist" aria-label="Animated data flow steps">
                {mod.dfdSteps.map((st, idx) => (
                  <button
                    key={st.step}
                    type="button"
                    role="tab"
                    aria-selected={dfdStepIdx === idx}
                    className={`dsde-timeline-btn ${dfdStepIdx === idx ? 'active' : ''}`}
                    onClick={() => {
                      setPlayingDfd(false)
                      setDfdStepIdx(idx)
                    }}
                  >
                    <span className="bc-tabular">
                      Hop 0{st.step} · ~{st.latencyMs}ms
                    </span>
                    <strong>{st.title}</strong>
                  </button>
                ))}
              </div>

              <div className="dsde-payload-split">
                <div>
                  <span className="dsde-kicker bc-tabular">
                    ACTIVE HOP · {mod.dfdNodeLabels[activeDfdStep.nodeId] ?? activeDfdStep.nodeId} (~{activeDfdStep.latencyMs}ms)
                  </span>
                  <h5>{activeDfdStep.title}</h5>
                  <p>{activeDfdStep.simpleExplanation}</p>
                </div>
                <div className="dsde-payload-json">
                  <span>DATA PACKET CROSSING THIS BOUNDARY</span>
                  <pre>{JSON.stringify(activeDfdStep.payload, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 3: COMPLETE PRODUCTION CODE + LIVE EXECUTABLE SANDBOX
        ================================================================= */}
        {activeTab === 'code' && (
          <div className="dsde-panel-stack">
            <div className="bais-code-mode-bar">
              <div className="bc-segmented" role="tablist" aria-label="Code explorer mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={codePane === 'blueprint'}
                  className={codePane === 'blueprint' ? 'active' : ''}
                  onClick={() => setCodePane('blueprint')}
                >
                  Complete Production Code ({mod.codeFiles.length} {mod.codeFiles.length === 1 ? 'File' : 'Files'})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={codePane === 'sandbox'}
                  className={codePane === 'sandbox' ? 'active' : ''}
                  onClick={() => setCodePane('sandbox')}
                >
                  Live Executable Worker Sandbox
                </button>
              </div>
            </div>

            {codePane === 'blueprint' ? (
              <div className="dsde-card">
                <div className="bais-file-bar">
                  <div className="bais-file-tabs" role="tablist" aria-label="Source files">
                    {mod.codeFiles.map(file => (
                      <button
                        key={file.id}
                        type="button"
                        role="tab"
                        aria-selected={activeFile.id === file.id}
                        className={`bais-file-tab ${activeFile.id === file.id ? 'active' : ''}`}
                        onClick={() => setSelectedFileId(file.id)}
                      >
                        <FileCode2 size={14} />
                        <span>{file.filename}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    onClick={() => void copySnippet(activeFile.id, activeFile.code)}
                  >
                    {copiedId === activeFile.id ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedId === activeFile.id ? 'Copied File' : 'Copy Full File'}</span>
                  </button>
                </div>

                <div className="bais-file-role">
                  <span className="dsde-kicker">{activeFile.language.toUpperCase()}</span>
                  <p>{activeFile.role}</p>
                </div>

                <pre className="bais-full-code">
                  <code>{activeFile.code}</code>
                </pre>
              </div>
            ) : (
              <div className="ml26-play-grid">
                <div className="dsde-card">
                  <div>
                    <span className="dsde-kicker">EDIT &amp; RUN LIVE IN ISOLATED WEB WORKER</span>
                    <h4>{mod.sandboxTitle}</h4>
                    <p>{mod.sandboxTask}</p>
                  </div>

                  <div className="ml26-play-toolbar">
                    <button
                      type="button"
                      className="bc-btn-primary"
                      disabled={runningSandbox}
                      onClick={() => void executeSandbox(mod.id, activeSandboxCode)}
                    >
                      <Play size={14} />
                      <span>{runningSandbox ? 'Running...' : 'Run Code (Ctrl+Enter)'}</span>
                    </button>
                    <button
                      type="button"
                      className="bc-btn-secondary"
                      disabled={!isCodeEdited}
                      onClick={() =>
                        setSandboxCodeByMod(prev => ({ ...prev, [mod.id]: mod.executableJs }))
                      }
                    >
                      <RotateCcw size={14} />
                      <span>Reset Starter</span>
                    </button>
                    <button
                      type="button"
                      className="bc-btn-secondary"
                      onClick={() => void copySnippet(`sb-${mod.id}`, activeSandboxCode)}
                    >
                      {copiedId === `sb-${mod.id}` ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedId === `sb-${mod.id}` ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <textarea
                    className="ml26-code-editor"
                    value={activeSandboxCode}
                    spellCheck={false}
                    aria-label="Editable AI architecture sandbox code"
                    onChange={e =>
                      setSandboxCodeByMod(prev => ({ ...prev, [mod.id]: e.target.value }))
                    }
                    onKeyDown={e => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault()
                        void executeSandbox(mod.id, activeSandboxCode)
                      }
                    }}
                  />
                </div>

                <div className="dsde-card">
                  <div className="ml26-out-head">
                    <div>
                      <span className="dsde-kicker">LIVE EXECUTION OUTPUT</span>
                      <h4>Metrics, Assertions &amp; Trace</h4>
                    </div>
                    {activeRunResult && (
                      <span className="bc-tabular ml26-runtime-ms">{activeRunResult.durationMs} ms</span>
                    )}
                  </div>

                  {activeRunResult?.errorMessage && (
                    <div className="dsde-health-banner breaking">
                      <XCircle size={18} />
                      <div>
                        <span className="dsde-health-tag">RUNTIME ERROR</span>
                        <strong>Sandbox Error</strong>
                        <p>{activeRunResult.errorMessage}</p>
                      </div>
                    </div>
                  )}

                  {activeRunResult && activeRunResult.metrics.length > 0 && (
                    <div className="ml26-run-metrics">
                      {activeRunResult.metrics.map(m => (
                        <div key={m.label} className={`dsde-kpi-card ${m.status ?? 'optimal'}`}>
                          <span>{m.label}</span>
                          <strong className="bc-tabular">{m.value}</strong>
                          <small>{m.unit ?? ''}</small>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeRunResult && activeRunResult.assertions.length > 0 && (
                    <div className="ml26-assertions">
                      <span className="dsde-kicker">VERIFIED ASSERTIONS</span>
                      <ul>
                        {activeRunResult.assertions.map((a, idx) => (
                          <li key={`${a.label}-${idx}`} className={a.passed ? 'pass' : 'fail'}>
                            {a.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            <span>{a.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="ml26-console-box">
                    <span className="dsde-kicker">CONSOLE LOGS</span>
                    <pre>
                      {activeRunResult && activeRunResult.logs.length > 0
                        ? activeRunResult.logs.map(l => l.text).join('\n')
                        : runningSandbox
                          ? 'Running in Web Worker...'
                          : 'Click "Run Code" to inspect live output.'}
                    </pre>
                  </div>

                  {activeRunResult && activeRunResult.artifacts.length > 0 && (
                    <div className="ml26-artifacts">
                      {activeRunResult.artifacts.map((art, idx) => (
                        <div key={`${art.title}-${idx}`} className="dsde-payload-json">
                          <span>ARTIFACT · {art.title.toUpperCase()}</span>
                          <pre>{JSON.stringify(art.data, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 4: UNIFIED AI ARCHITECT VIRTUAL PLAYGROUND SIMULATOR
        ================================================================= */}
        {activeTab === 'simulator' && (
          <div className="dsde-panel-stack">
            {/* Live Animated Pipeline Flow Bar */}
            <div className="dsde-card">
              <div className="dsde-dfd-head">
                <div>
                  <span className="dsde-kicker">LIVE ANIMATED AI ARCHITECTURE DATA FLOW</span>
                  <h4>Unified Stack: Gateway → RAG → MCP → ACP / A2A → Transformer (vLLM)</h4>
                </div>
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => setAnimatingPipeline(p => !p)}
                >
                  {animatingPipeline ? <Pause size={14} /> : <Play size={14} />}
                  <span>{animatingPipeline ? 'Pause Packet Pulse' : 'Animate Packet Pulse'}</span>
                </button>
              </div>

              <div className="bais-live-pipe" aria-label="Live enabled pipeline nodes">
                {simResult.activePipelineNodes.map((node, idx) => (
                  <div
                    key={node.id}
                    className={`bais-pipe-node ${node.active ? 'enabled' : 'bypassed'} ${
                      node.active && pulseHopIdx === idx ? 'pulsing' : ''
                    }`}
                  >
                    <div className="bais-pipe-top">
                      <strong>{node.label}</strong>
                      <span className="bc-tabular">{node.active ? `${node.ms}ms` : 'OFF'}</span>
                    </div>
                    <small>{node.role}</small>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulator Controls + Live Telemetry */}
            <div className="dsde-sim-layout">
              <div className="dsde-card">
                <div className="dsde-sim-ctrl-head">
                  <div>
                    <span className="dsde-kicker">ARCHITECT PRESETS &amp; KNOBS</span>
                    <h4>Configure Your AI Stack</h4>
                  </div>
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    onClick={() => setSimConfig(ARCHITECT_PRESETS.chatgpt.config)}
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Preset Buttons */}
                <div className="bais-preset-grid">
                  {(Object.keys(ARCHITECT_PRESETS) as ArchitectPresetId[]).map(pid => (
                    <button
                      key={pid}
                      type="button"
                      className={`bais-preset-btn ${simConfig.preset === pid ? 'active' : ''}`}
                      onClick={() => setSimConfig(ARCHITECT_PRESETS[pid].config)}
                    >
                      <strong>{ARCHITECT_PRESETS[pid].label}</strong>
                      <small>{ARCHITECT_PRESETS[pid].desc}</small>
                    </button>
                  ))}
                </div>

                <div className="dsde-control-list">
                  {/* Model Tier */}
                  <div className="bais-choice-row">
                    <span>Transformer Model Tier</span>
                    <div className="bais-choice-btns">
                      {(
                        [
                          { id: 'fast-8b', label: 'Fast 8B' },
                          { id: 'balanced-70b', label: 'Balanced 70B' },
                          { id: 'frontier-reasoner', label: 'Frontier' }
                        ] as { id: ModelTier; label: string }[]
                      ).map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          className={simConfig.modelTier === opt.id ? 'active' : ''}
                          onClick={() => setSimConfig(c => ({ ...c, modelTier: opt.id }))}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* RAG Mode */}
                  <div className="bais-choice-row">
                    <span>RAG Knowledge Layer</span>
                    <div className="bais-choice-btns">
                      {(
                        [
                          { id: 'off', label: 'Off' },
                          { id: 'dense', label: 'Vector Only' },
                          { id: 'hybrid-rerank', label: 'Hybrid + Rerank' }
                        ] as { id: RagMode; label: string }[]
                      ).map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          className={simConfig.ragMode === opt.id ? 'active' : ''}
                          onClick={() => setSimConfig(c => ({ ...c, ragMode: opt.id }))}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* MCP Tools Slider */}
                  <label className="dsde-slider-row">
                    <div className="dsde-slider-top">
                      <span>MCP Tool Server Calls</span>
                      <strong className="bc-tabular">{simConfig.mcpToolsCount} tools</strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={1}
                      value={simConfig.mcpToolsCount}
                      onChange={e =>
                        setSimConfig(c => ({ ...c, mcpToolsCount: Number(e.target.value) }))
                      }
                    />
                    <div className="dsde-slider-bounds bc-tabular">
                      <span>0 tools</span>
                      <span>8 tools</span>
                    </div>
                  </label>

                  {/* ACP Multi-Agent Hops */}
                  <label className="dsde-slider-row">
                    <div className="dsde-slider-top">
                      <span>ACP / A2A Specialist Agents</span>
                      <strong className="bc-tabular">{simConfig.acpAgentHops} agent(s)</strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={simConfig.acpAgentHops}
                      onChange={e =>
                        setSimConfig(c => ({ ...c, acpAgentHops: Number(e.target.value) }))
                      }
                    />
                    <div className="dsde-slider-bounds bc-tabular">
                      <span>1 (Single)</span>
                      <span>5 (Mesh)</span>
                    </div>
                  </label>

                  {/* Prompt Context Length */}
                  <label className="dsde-slider-row">
                    <div className="dsde-slider-top">
                      <span>Prompt + History Tokens</span>
                      <strong className="bc-tabular">
                        {simConfig.promptTokens.toLocaleString()} tok
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={32000}
                      step={500}
                      value={simConfig.promptTokens}
                      onChange={e =>
                        setSimConfig(c => ({ ...c, promptTokens: Number(e.target.value) }))
                      }
                    />
                    <div className="dsde-slider-bounds bc-tabular">
                      <span>500 tok</span>
                      <span>32,000 tok</span>
                    </div>
                  </label>

                  {/* Extended Thinking Tokens */}
                  <label className="dsde-slider-row">
                    <div className="dsde-slider-top">
                      <span>Extended Thinking Budget</span>
                      <strong className="bc-tabular">
                        {simConfig.thinkingTokens.toLocaleString()} tok
                      </strong>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={4096}
                      step={256}
                      value={simConfig.thinkingTokens}
                      onChange={e =>
                        setSimConfig(c => ({ ...c, thinkingTokens: Number(e.target.value) }))
                      }
                    />
                    <div className="dsde-slider-bounds bc-tabular">
                      <span>0 (Instant)</span>
                      <span>4,096 tok</span>
                    </div>
                  </label>

                  {/* Toggles */}
                  <div className="dsde-toggle-row">
                    <span>vLLM PagedAttention + KV Prefix Cache</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={simConfig.enableVllmCache}
                      className={`dsde-switch ${simConfig.enableVllmCache ? 'on' : ''}`}
                      onClick={() =>
                        setSimConfig(c => ({ ...c, enableVllmCache: !c.enableVllmCache }))
                      }
                    >
                      {simConfig.enableVllmCache ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="dsde-toggle-row">
                    <span>Strict MCP JSON Schema + Verifier Gate</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={simConfig.mcpStrictSchema}
                      className={`dsde-switch ${simConfig.mcpStrictSchema ? 'on' : ''}`}
                      onClick={() =>
                        setSimConfig(c => ({ ...c, mcpStrictSchema: !c.mcpStrictSchema }))
                      }
                    >
                      {simConfig.mcpStrictSchema ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Telemetry Panel */}
              <div className="dsde-card">
                <div className={`dsde-health-banner ${simResult.health}`}>
                  {simResult.health === 'optimal' && <CheckCircle2 size={20} />}
                  {simResult.health === 'tradeoff' && <AlertTriangle size={20} />}
                  {simResult.health === 'breaking' && <XCircle size={20} />}
                  <div>
                    <span className="dsde-health-tag">
                      ARCHITECT VERDICT · {simResult.health.toUpperCase()}
                    </span>
                    <strong>{simResult.verdictTitle}</strong>
                    <p>{simResult.verdictDetail}</p>
                  </div>
                </div>

                <div className="bais-kpi-six">
                  <div className={`dsde-kpi-card ${simResult.ttftMs <= 450 ? 'optimal' : simResult.ttftMs <= 900 ? 'tradeoff' : 'breaking'}`}>
                    <span>TTFT Latency</span>
                    <strong className="bc-tabular">{simResult.ttftMs} ms</strong>
                    <small>Time to first token</small>
                  </div>
                  <div className={`dsde-kpi-card ${simResult.e2eMs <= 4500 ? 'optimal' : simResult.e2eMs <= 7500 ? 'tradeoff' : 'breaking'}`}>
                    <span>End-to-End Time</span>
                    <strong className="bc-tabular">{(simResult.e2eMs / 1000).toFixed(2)} s</strong>
                    <small>Full response done</small>
                  </div>
                  <div className={`dsde-kpi-card ${simResult.groundedAccuracyPct >= 88 ? 'optimal' : 'tradeoff'}`}>
                    <span>Grounded Accuracy</span>
                    <strong className="bc-tabular">{simResult.groundedAccuracyPct}%</strong>
                    <small>Evidence faithfulness</small>
                  </div>
                  <div className={`dsde-kpi-card ${simResult.reliabilityPct >= 85 ? 'optimal' : simResult.reliabilityPct >= 75 ? 'tradeoff' : 'breaking'}`}>
                    <span>Pass^k Reliability</span>
                    <strong className="bc-tabular">{simResult.reliabilityPct}%</strong>
                    <small>Across all tool/agent hops</small>
                  </div>
                  <div className="dsde-kpi-card optimal">
                    <span>Context Packed</span>
                    <strong className="bc-tabular">{simResult.contextTokensUsed.toLocaleString()}</strong>
                    <small>Prompt + RAG + MCP</small>
                  </div>
                  <div className={`dsde-kpi-card ${simResult.costPer1kUsd <= 12 ? 'optimal' : simResult.costPer1kUsd <= 24 ? 'tradeoff' : 'breaking'}`}>
                    <span>Unit Cost / 1k Req</span>
                    <strong className="bc-tabular">${simResult.costPer1kUsd}</strong>
                    <small>{simConfig.enableVllmCache ? 'With KV cache savings' : 'Unoptimized full prefill'}</small>
                  </div>
                </div>

                <div className="dsde-bars-box">
                  <span className="dsde-kicker">END-TO-END LATENCY WATERFALL</span>
                  <div className="dsde-bars-list">
                    {simResult.latencyBreakdown.map(row => (
                      <div key={row.label} className="dsde-bar-row">
                        <span className="dsde-bar-label">{row.label}</span>
                        <progress
                          className={`ml26-bar-meter tone-${row.tone}`}
                          value={row.pct}
                          max={100}
                        />
                        <strong className="bc-tabular">{row.ms} ms</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blueprint Prev/Next Serial Footer */}
        <footer className="ml26-stage-footer">
          <button
            type="button"
            className="bc-btn-secondary"
            disabled={activeModIdx <= 0}
            onClick={() => setActiveModIdx(i => Math.max(0, i - 1))}
          >
            <ArrowLeft size={15} />
            <span>
              {activeModIdx > 0
                ? `Prev: 0${aiSystemModules[activeModIdx - 1].number}. ${aiSystemModules[activeModIdx - 1].title.split('(')[0].trim()}`
                : 'First Blueprint'}
            </span>
          </button>

          <span className="bc-tabular ml26-pager-meta">
            Blueprint 0{mod.number} / 0{aiSystemModules.length}
          </span>

          <button
            type="button"
            className="bc-btn-primary"
            disabled={activeModIdx >= aiSystemModules.length - 1}
            onClick={() => setActiveModIdx(i => Math.min(aiSystemModules.length - 1, i + 1))}
          >
            <span>
              {activeModIdx < aiSystemModules.length - 1
                ? `Next: 0${aiSystemModules[activeModIdx + 1].number}. ${aiSystemModules[activeModIdx + 1].title.split('(')[0].trim()}`
                : 'All 5 Blueprints Complete'}
            </span>
            <ArrowRight size={15} />
          </button>
        </footer>
      </div>
    </section>
  )
}
