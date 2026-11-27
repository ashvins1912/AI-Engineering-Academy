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
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  StepForward,
  Terminal,
  Workflow,
  X,
  XCircle
} from 'lucide-react'
import { mlRoadmapTracksPart1 } from '../data/mlRoadmap2026Part1'
import { mlRoadmapTracksPart2 } from '../data/mlRoadmap2026Part2'
import type { RoadmapPhase, RoadmapTrack } from '../data/mlRoadmap2026Types'
import { runInVirtualSandbox, type SandboxRunResult } from '../utils/sandboxRunner'
import MermaidDiagram from './MermaidDiagram'
import TokenStreamTypewriter from './TokenStreamTypewriter'

const ALL_TRACKS: RoadmapTrack[] = [...mlRoadmapTracksPart1, ...mlRoadmapTracksPart2]
const ALL_TOPIC_IDS = new Set(ALL_TRACKS.flatMap(t => t.topics.map(tp => tp.id)))
const TOTAL_TOPICS = ALL_TOPIC_IDS.size
const STORAGE_KEY = 'ai-academy.ml2026-topics.v1'

type PhaseFilter = 'all' | RoadmapPhase
type TrackTab = 'topics' | 'dfd' | 'simulator' | 'playground'
type CodeView = 'sandbox' | 'python'

const PHASE_FILTERS: { id: PhaseFilter; label: string }[] = [
  { id: 'all', label: `All (${ALL_TRACKS.length})` },
  { id: 'foundations', label: 'Foundations' },
  { id: 'classical-ml', label: 'Classical ML' },
  { id: 'deep-vision-nlp', label: 'DL / CV / NLP' },
  { id: 'genai-rl', label: 'GenAI & RL' },
  { id: 'mlops-projects', label: 'MLOps & Projects' }
]

const readMasteredTopics = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && ALL_TOPIC_IDS.has(id)))]
  } catch {
    return []
  }
}

const defaultSimValues = (track: RoadmapTrack): Record<string, number | boolean> =>
  Object.fromEntries(track.simControls.map(c => [c.id, c.defaultValue]))

const statusLabel = (status: 'optimal' | 'tradeoff' | 'breaking') => {
  if (status === 'optimal') return 'Optimal'
  if (status === 'tradeoff') return 'Trade-Off'
  return 'Risk / Breaking'
}

type Props = {
  onLaunchVirtualLab?: () => void
}

export default function MLRoadmap2026Studio({ onLaunchVirtualLab }: Props) {
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTrackId, setActiveTrackId] = useState(ALL_TRACKS[0].id)
  const [activeTab, setActiveTab] = useState<TrackTab>('topics')
  const [selectedTopicId, setSelectedTopicId] = useState(ALL_TRACKS[0].topics[0].id)
  const [masteredTopics, setMasteredTopics] = useState<string[]>(readMasteredTopics)
  const [copiedTopicSnippet, setCopiedTopicSnippet] = useState(false)

  // DFD Animation state
  const [dfdStepIdx, setDfdStepIdx] = useState(0)
  const [isPlayingDfd, setIsPlayingDfd] = useState(false)

  // Per-track virtual simulator state
  const [simStateByTrack, setSimStateByTrack] = useState<Record<string, Record<string, number | boolean>>>(() =>
    Object.fromEntries(ALL_TRACKS.map(t => [t.id, defaultSimValues(t)]))
  )

  // Per-track live sandbox state
  const [codeByTrack, setCodeByTrack] = useState<Record<string, string>>(() =>
    Object.fromEntries(ALL_TRACKS.map(t => [t.id, t.executableCode]))
  )
  const [codeView, setCodeView] = useState<CodeView>('sandbox')
  const [runResultsByTrack, setRunResultsByTrack] = useState<Record<string, SandboxRunResult>>({})
  const [isRunningCode, setIsRunningCode] = useState(false)
  const [copiedPlayCode, setCopiedPlayCode] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(masteredTopics))
    } catch {
      // Ignore storage quota issues
    }
  }, [masteredTopics])

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return ALL_TRACKS.filter(track => {
      if (phaseFilter !== 'all' && track.phase !== phaseFilter) return false
      if (!q) return true
      if (`${track.title} ${track.summary} ${track.phaseLabel}`.toLowerCase().includes(q)) return true
      return track.topics.some(tp =>
        `${tp.title} ${tp.explanation} ${tp.technicalDetail}`.toLowerCase().includes(q)
      )
    })
  }, [phaseFilter, searchQuery])

  const track = useMemo(
    () => filteredTracks.find(t => t.id === activeTrackId) ?? filteredTracks[0] ?? ALL_TRACKS[0],
    [filteredTracks, activeTrackId]
  )

  const matchingTopicsInTrack = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return track.topics
    const matched = track.topics.filter(tp =>
      `${tp.title} ${tp.explanation} ${tp.technicalDetail}`.toLowerCase().includes(q)
    )
    return matched.length > 0 ? matched : track.topics
  }, [track, searchQuery])

  const activeTopic = useMemo(
    () => matchingTopicsInTrack.find(tp => tp.id === selectedTopicId) ?? matchingTopicsInTrack[0] ?? track.topics[0],
    [matchingTopicsInTrack, selectedTopicId, track]
  )

  const activeTopicIndex = track.topics.findIndex(tp => tp.id === activeTopic.id)
  const globalTrackIndex = ALL_TRACKS.findIndex(t => t.id === track.id)

  // Reset DFD animation & ensure valid selected topic on track change
  useEffect(() => {
    setDfdStepIdx(0)
    setIsPlayingDfd(false)
    setCodeView('sandbox')
    setCopiedTopicSnippet(false)
    setCopiedPlayCode(false)
    if (!track.topics.some(tp => tp.id === selectedTopicId)) {
      setSelectedTopicId(track.topics[0].id)
    }
  }, [track, selectedTopicId])

  // DFD playback loop
  useEffect(() => {
    if (!isPlayingDfd) return
    const timer = window.setInterval(() => {
      setDfdStepIdx(prev => (prev + 1) % track.dfdSteps.length)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [isPlayingDfd, track.dfdSteps.length])

  const activeSimValues = simStateByTrack[track.id] ?? defaultSimValues(track)
  const simOutput = useMemo(() => track.runSim(activeSimValues), [track, activeSimValues])

  const activeCode = codeByTrack[track.id] ?? track.executableCode
  const activeRunResult = runResultsByTrack[track.id] ?? null
  const isCodeModified = activeCode !== track.executableCode

  const executeSandbox = useCallback(async (trackId: string, code: string) => {
    setIsRunningCode(true)
    const res = await runInVirtualSandbox(code, {})
    setRunResultsByTrack(prev => ({ ...prev, [trackId]: res }))
    setIsRunningCode(false)
  }, [])

  // Auto-run sandbox once when entering Live Code Playground tab
  useEffect(() => {
    if (activeTab === 'playground' && !runResultsByTrack[track.id] && !isRunningCode) {
      void executeSandbox(track.id, activeCode)
    }
  }, [activeTab, track.id, activeCode, runResultsByTrack, isRunningCode, executeSandbox])

  const toggleTopicMastered = (topicId: string) => {
    setMasteredTopics(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    )
  }

  const trackDoneCount = track.topics.filter(tp => masteredTopics.includes(tp.id)).length
  const allTrackTopicsDone = trackDoneCount === track.topics.length

  const toggleWholeTrackMastered = () => {
    const ids = track.topics.map(tp => tp.id)
    setMasteredTopics(prev => {
      if (allTrackTopicsDone) {
        return prev.filter(id => !ids.includes(id))
      }
      return [...new Set([...prev, ...ids])]
    })
  }

  const updateSimControl = (controlId: string, value: number | boolean) => {
    setSimStateByTrack(prev => ({
      ...prev,
      [track.id]: {
        ...(prev[track.id] ?? defaultSimValues(track)),
        [controlId]: value
      }
    }))
  }

  const resetSim = () => {
    setSimStateByTrack(prev => ({ ...prev, [track.id]: defaultSimValues(track) }))
  }

  const copyText = async (text: string, which: 'topic' | 'play') => {
    try {
      await navigator.clipboard.writeText(text)
      if (which === 'topic') {
        setCopiedTopicSnippet(true)
        window.setTimeout(() => setCopiedTopicSnippet(false), 1800)
      } else {
        setCopiedPlayCode(true)
        window.setTimeout(() => setCopiedPlayCode(false), 1800)
      }
    } catch {
      // Clipboard unavailable in restricted context
    }
  }

  const activeDfdStep = track.dfdSteps[dfdStepIdx] ?? track.dfdSteps[0]
  const masteryPct = Math.round((masteredTopics.length / TOTAL_TOPICS) * 100)

  return (
    <section className="dsde-shell ml26-shell" aria-label="Machine Learning Roadmap 2026 Complete Studio">
      {/* Top Studio Header & Completeness Audit Bar */}
      <header className="dsde-header">
        <div>
          <div className="bc-meta-line">
            <span>Machine Learning Roadmap 2026</span>
            <span aria-hidden="true">·</span>
            <span className="bc-tabular">{ALL_TRACKS.length} Tracks</span>
            <span aria-hidden="true">·</span>
            <span className="bc-tabular">{TOTAL_TOPICS} Audited Topics</span>
            <span aria-hidden="true">·</span>
            <span>Animated DFDs, Simulators &amp; Live Sandboxes</span>
          </div>
          <h2>Complete Machine Learning Roadmap 2026 Studio</h2>
          <p>
            Every single topic from Python Programming and Math through Deep Learning, CV, NLP,
            Generative AI, Reinforcement Learning, MLOps, Cloud Deployment, and 14 Real-World
            Projects—audited for 100% completeness with interactive DFDs, parameter simulators, and
            live runnable code.
          </p>
        </div>

        <div className="dsde-header-actions">
          <div className="dsde-progress-box ml26-progress-box">
            <div className="dsde-progress-top">
              <span>Roadmap Mastery</span>
              <strong className="bc-tabular">
                {masteredTopics.length}/{TOTAL_TOPICS} ({masteryPct}%)
              </strong>
            </div>
            <progress className="ux-progress" value={masteredTopics.length} max={TOTAL_TOPICS} />
          </div>
          {onLaunchVirtualLab && (
            <button type="button" className="bc-btn-secondary" onClick={onLaunchVirtualLab}>
              <Terminal size={14} />
              <span>Full Virtual Lab</span>
            </button>
          )}
        </div>
      </header>

      {/* Master-Detail Body */}
      <div className="ml26-body">
        {/* LEFT RAIL: Search, Phase Filter & 16-Track Navigator */}
        <aside className="ml26-rail" aria-label="16 Machine Learning tracks">
          <label className="ml26-search">
            <Search size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search all ${TOTAL_TOPICS} topics (e.g. LoRA, PPO, XGBoost)...`}
              aria-label="Search Machine Learning Roadmap topics"
            />
            {searchQuery && (
              <button
                type="button"
                className="ml26-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <div className="ml26-phase-row" role="tablist" aria-label="Filter tracks by phase">
            {PHASE_FILTERS.map(pf => (
              <button
                key={pf.id}
                type="button"
                role="tab"
                aria-selected={phaseFilter === pf.id}
                className={`ml26-phase-btn ${phaseFilter === pf.id ? 'active' : ''}`}
                onClick={() => setPhaseFilter(pf.id)}
              >
                {pf.label}
              </button>
            ))}
          </div>

          <div className="ml26-track-list" role="navigation" aria-label="Roadmap tracks">
            {filteredTracks.map(item => {
              const done = item.topics.filter(tp => masteredTopics.includes(tp.id)).length
              const isSelected = item.id === track.id
              const isComplete = done === item.topics.length
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`ml26-track-item ${isSelected ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                  aria-current={isSelected ? 'true' : undefined}
                  onClick={() => {
                    setActiveTrackId(item.id)
                    setSelectedTopicId(item.topics[0].id)
                  }}
                >
                  <span className="ml26-track-num bc-tabular">
                    {String(item.number).padStart(2, '0')}
                  </span>
                  <span className="ml26-track-copy">
                    <strong>{item.title}</strong>
                    <small className="bc-tabular">
                      {item.phaseLabel} · {done}/{item.topics.length} topics
                    </small>
                  </span>
                  {isComplete && <CheckCircle2 size={15} className="ml26-done-icon" />}
                </button>
              )
            })}

            {filteredTracks.length === 0 && (
              <div className="ml26-empty">
                <p>No tracks matched "{searchQuery}".</p>
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => {
                    setSearchQuery('')
                    setPhaseFilter('all')
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT STAGE: Active Track Deep-Dive */}
        <div className="ml26-stage">
          {/* Active Track Header */}
          <div className="dsde-stage-head">
            <div>
              <div className="bc-meta-line">
                <span className="bc-tabular">Track {String(track.number).padStart(2, '0')} of {ALL_TRACKS.length}</span>
                <span aria-hidden="true">·</span>
                <span>{track.phaseLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="bc-tabular">{trackDoneCount}/{track.topics.length} topics mastered</span>
              </div>
              <h3>{track.title}</h3>
              <p>{track.summary}</p>
            </div>

            <button
              type="button"
              className={allTrackTopicsDone ? 'bc-btn-secondary' : 'bc-btn-primary'}
              onClick={toggleWholeTrackMastered}
            >
              {allTrackTopicsDone ? <Check size={15} /> : <CheckCircle2 size={15} />}
              <span>{allTrackTopicsDone ? 'Track Mastered' : `Mark All ${track.topics.length} Mastered`}</span>
            </button>
          </div>

          {/* Senior Technical Auditor Callout */}
          <div className="ml26-audit-note">
            <ShieldCheck size={17} />
            <div>
              <strong>Senior Architect Audit Note</strong>
              <p>{track.architectAuditNote}</p>
            </div>
          </div>

          {/* 4-Tab Learning Mode Switcher */}
          <div className="dsde-step-tabs" role="tablist" aria-label="Track workspace modes">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'topics'}
              className={`dsde-step-tab ${activeTab === 'topics' ? 'active' : ''}`}
              onClick={() => setActiveTab('topics')}
            >
              <BookOpen size={15} />
              <span>01. Complete Topics ({track.topics.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'dfd'}
              className={`dsde-step-tab ${activeTab === 'dfd' ? 'active' : ''}`}
              onClick={() => setActiveTab('dfd')}
            >
              <Workflow size={15} />
              <span>02. Animated Visual DFD</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'simulator'}
              className={`dsde-step-tab ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulator')}
            >
              <Sliders size={15} />
              <span>03. Virtual Simulator</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'playground'}
              className={`dsde-step-tab ${activeTab === 'playground' ? 'active' : ''}`}
              onClick={() => setActiveTab('playground')}
            >
              <Code2 size={15} />
              <span>04. Live Code Playground</span>
            </button>
          </div>

          {/* ==============================================================
              TAB 1: COMPLETE TOPICS EXPLORER (100% COVERAGE)
          =============================================================== */}
          {activeTab === 'topics' && (
            <div className="ml26-topics-layout">
              {/* Selectable Topic List */}
              <div className="ml26-topic-index" role="listbox" aria-label={`${track.title} topics`}>
                {matchingTopicsInTrack.map((tp, idx) => {
                  const isSel = tp.id === activeTopic.id
                  const isDone = masteredTopics.includes(tp.id)
                  return (
                    <button
                      key={tp.id}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      className={`ml26-topic-btn ${isSel ? 'active' : ''} ${isDone ? 'done' : ''}`}
                      onClick={() => {
                        setSelectedTopicId(tp.id)
                        setCopiedTopicSnippet(false)
                      }}
                    >
                      <span className="ml26-topic-idx bc-tabular">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="ml26-topic-title">{tp.title}</span>
                      {isDone && <Check size={14} className="ml26-topic-check" />}
                    </button>
                  )
                })}
              </div>

              {/* Selected Topic Deep-Dive Card */}
              <article className="ml26-topic-detail">
                <header className="ml26-topic-detail-head">
                  <div>
                    <span className="dsde-kicker bc-tabular">
                      TRACK {String(track.number).padStart(2, '0')} · TOPIC {String(activeTopicIndex + 1).padStart(2, '0')} OF {track.topics.length}
                    </span>
                    <h4>{activeTopic.title}</h4>
                  </div>
                  <button
                    type="button"
                    className={masteredTopics.includes(activeTopic.id) ? 'bc-btn-secondary' : 'bc-btn-primary'}
                    onClick={() => toggleTopicMastered(activeTopic.id)}
                  >
                    {masteredTopics.includes(activeTopic.id) ? <Check size={14} /> : <CheckCircle2 size={14} />}
                    <span>{masteredTopics.includes(activeTopic.id) ? 'Mastered' : 'Mark Mastered'}</span>
                  </button>
                </header>

                <div className="ml26-detail-block">
                  <h5>Clear Explanation &amp; Mental Model</h5>
                  <p>{activeTopic.explanation}</p>
                </div>

                <div className="dsde-analogy-box">
                  <strong className="ml26-inline-icon">
                    <Lightbulb size={14} /> Everyday Analogy
                  </strong>
                  <p>{activeTopic.analogy}</p>
                </div>

                <div className="ml26-detail-grid">
                  <div className="ml26-subcard">
                    <span className="dsde-kicker">UNDER THE HOOD · MATH &amp; ENGINEERING</span>
                    <p>{activeTopic.technicalDetail}</p>
                  </div>
                  <div className="ml26-subcard pitfall">
                    <span className="ml26-pitfall-kicker">
                      <ShieldAlert size={13} /> PRODUCTION PITFALL &amp; AUDIT CHECK
                    </span>
                    <p>{activeTopic.productionPitfall}</p>
                  </div>
                </div>

                <div className="ml26-snippet-box">
                  <div className="ml26-snippet-head">
                    <span className="dsde-kicker">PRODUCTION PYTHON REFERENCE</span>
                    <button
                      type="button"
                      className="bc-btn-secondary"
                      onClick={() => void copyText(activeTopic.pythonSnippet, 'topic')}
                    >
                      {copiedTopicSnippet ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedTopicSnippet ? 'Copied' : 'Copy Snippet'}</span>
                    </button>
                  </div>
                  <pre>
                    <code>{activeTopic.pythonSnippet}</code>
                  </pre>
                </div>

                <footer className="ml26-topic-pager">
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    disabled={activeTopicIndex <= 0}
                    onClick={() => setSelectedTopicId(track.topics[activeTopicIndex - 1].id)}
                  >
                    <ArrowLeft size={14} />
                    <span>Previous Topic</span>
                  </button>
                  <span className="bc-tabular ml26-pager-meta">
                    {activeTopicIndex + 1} / {track.topics.length} in {track.title}
                  </span>
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    disabled={activeTopicIndex >= track.topics.length - 1}
                    onClick={() => setSelectedTopicId(track.topics[activeTopicIndex + 1].id)}
                  >
                    <span>Next Topic</span>
                    <ArrowRight size={14} />
                  </button>
                </footer>
              </article>
            </div>
          )}

          {/* ==============================================================
              TAB 2: ANIMATED VISUAL DATA FLOW DIAGRAM (MERMAID)
          =============================================================== */}
          {activeTab === 'dfd' && (
            <div className="dsde-panel-stack">
              <div className="dsde-card">
                <div className="dsde-dfd-head">
                  <div>
                    <span className="dsde-kicker">INTERACTIVE ANIMATED DATA FLOW DIAGRAM</span>
                    <h4>End-to-End Architecture Flow: {track.title}</h4>
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
                        setDfdStepIdx(prev => (prev + 1) % track.dfdSteps.length)
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
                    syntax={track.mermaidDfd}
                    diagramType="flowchart"
                    highlightNode={activeDfdStep.nodeId}
                    nodeLabels={track.dfdNodeLabels}
                  />
                </div>

                <div className="dsde-timeline-bar" role="tablist" aria-label="DFD animation steps">
                  {track.dfdSteps.map((step, idx) => (
                    <button
                      key={step.step}
                      type="button"
                      role="tab"
                      aria-selected={dfdStepIdx === idx}
                      className={`dsde-timeline-btn ${dfdStepIdx === idx ? 'active' : ''}`}
                      onClick={() => {
                        setIsPlayingDfd(false)
                        setDfdStepIdx(idx)
                      }}
                    >
                      <span className="bc-tabular">Step 0{step.step}</span>
                      <strong>{step.title}</strong>
                    </button>
                  ))}
                </div>

                <div className="dsde-payload-split">
                  <div>
                    <span className="dsde-kicker bc-tabular">
                      ACTIVE NODE · {track.dfdNodeLabels[activeDfdStep.nodeId] ?? activeDfdStep.nodeId}
                    </span>
                    <h5>{activeDfdStep.title}</h5>
                    <p>{activeDfdStep.description}</p>
                  </div>
                  <div className="dsde-payload-json">
                    <span>LIVE RUNTIME STATE PAYLOAD</span>
                    <pre>{JSON.stringify(activeDfdStep.payload, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 3: INTERACTIVE VIRTUAL SIMULATOR
          =============================================================== */}
          {activeTab === 'simulator' && (
            <div className="dsde-sim-layout">
              <div className="dsde-card">
                <div className="dsde-sim-ctrl-head">
                  <div>
                    <span className="dsde-kicker">VIRTUAL SYSTEM CONTROLS</span>
                    <h4>{track.simTitle}</h4>
                    <p>{track.simSubtitle}</p>
                  </div>
                  <button type="button" className="bc-btn-secondary" onClick={resetSim}>
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="dsde-control-list">
                  {track.simControls.map(ctrl => {
                    if (ctrl.type === 'slider') {
                      const val =
                        typeof activeSimValues[ctrl.id] === 'number'
                          ? (activeSimValues[ctrl.id] as number)
                          : ctrl.defaultValue
                      return (
                        <label key={ctrl.id} className="dsde-slider-row">
                          <div className="dsde-slider-top">
                            <span>{ctrl.label}</span>
                            <strong className="bc-tabular">
                              {val} {ctrl.unit}
                            </strong>
                          </div>
                          <input
                            type="range"
                            min={ctrl.min}
                            max={ctrl.max}
                            step={ctrl.step}
                            value={val}
                            onChange={e => updateSimControl(ctrl.id, Number(e.target.value))}
                          />
                          <div className="dsde-slider-bounds bc-tabular">
                            <span>
                              {ctrl.min} {ctrl.unit}
                            </span>
                            <span>
                              {ctrl.max} {ctrl.unit}
                            </span>
                          </div>
                        </label>
                      )
                    }

                    const checked =
                      typeof activeSimValues[ctrl.id] === 'boolean'
                        ? (activeSimValues[ctrl.id] as boolean)
                        : ctrl.defaultValue
                    return (
                      <div key={ctrl.id} className="dsde-toggle-row">
                        <span>{ctrl.label}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          className={`dsde-switch ${checked ? 'on' : ''}`}
                          onClick={() => updateSimControl(ctrl.id, !checked)}
                        >
                          {checked ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="dsde-card">
                <div className={`dsde-health-banner ${simOutput.health}`}>
                  {simOutput.health === 'optimal' && <CheckCircle2 size={20} />}
                  {simOutput.health === 'tradeoff' && <AlertTriangle size={20} />}
                  {simOutput.health === 'breaking' && <XCircle size={20} />}
                  <div>
                    <span className="dsde-health-tag">
                      SYSTEM VERDICT · {statusLabel(simOutput.health).toUpperCase()}
                    </span>
                    <strong>{simOutput.headline}</strong>
                    <TokenStreamTypewriter
                      text={simOutput.explanation}
                      streamKey={`ml26-verdict-${simOutput.health}-${simOutput.headline}`}
                      label="Synthesized System Analysis"
                      variant="prose"
                      tokenDelayMs={28}
                    />
                  </div>
                </div>

                <div className="dsde-kpi-grid">
                  {simOutput.kpis.map(kpi => (
                    <div key={kpi.label} className={`dsde-kpi-card ${kpi.status}`}>
                      <span>{kpi.label}</span>
                      <strong className="bc-tabular">{kpi.value}</strong>
                      <small>{kpi.sub}</small>
                    </div>
                  ))}
                </div>

                <div className="dsde-bars-box">
                  <span className="dsde-kicker">LIVE METRIC TELEMETRY BARS</span>
                  <div className="dsde-bars-list">
                    {simOutput.bars.map(bar => (
                      <div key={bar.label} className="dsde-bar-row">
                        <span className="dsde-bar-label">{bar.label}</span>
                        <progress
                          className={`ml26-bar-meter tone-${bar.tone}`}
                          value={Math.max(0, Math.min(100, bar.pct))}
                          max={100}
                        />
                        <strong className="bc-tabular">{bar.display}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 4: LIVE EXECUTABLE CODE PLAYGROUND (WEB WORKER SANDBOX)
          =============================================================== */}
          {activeTab === 'playground' && (
            <div className="ml26-play-grid">
              <div className="dsde-card">
                <div className="ml26-play-head">
                  <div>
                    <span className="dsde-kicker">LIVE EXECUTABLE WORKER SANDBOX</span>
                    <h4>{track.playgroundTitle}</h4>
                    <p>{track.playgroundTask}</p>
                  </div>
                  <div className="bc-segmented" role="tablist" aria-label="Code language view">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={codeView === 'sandbox'}
                      className={codeView === 'sandbox' ? 'active' : ''}
                      onClick={() => setCodeView('sandbox')}
                    >
                      Live Sandbox (JS)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={codeView === 'python'}
                      className={codeView === 'python' ? 'active' : ''}
                      onClick={() => setCodeView('python')}
                    >
                      Python Production Blueprint
                    </button>
                  </div>
                </div>

                <div className="ml26-play-toolbar">
                  {codeView === 'sandbox' && (
                    <>
                      <button
                        type="button"
                        className="bc-btn-primary"
                        disabled={isRunningCode}
                        onClick={() => void executeSandbox(track.id, activeCode)}
                      >
                        <Play size={14} />
                        <span>{isRunningCode ? 'Running...' : 'Run Code (Ctrl+Enter)'}</span>
                      </button>
                      <button
                        type="button"
                        className="bc-btn-secondary"
                        disabled={!isCodeModified}
                        onClick={() =>
                          setCodeByTrack(prev => ({ ...prev, [track.id]: track.executableCode }))
                        }
                      >
                        <RotateCcw size={14} />
                        <span>Reset Starter</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="bc-btn-secondary"
                    onClick={() =>
                      void copyText(
                        codeView === 'sandbox' ? activeCode : track.pythonReference,
                        'play'
                      )
                    }
                  >
                    {copiedPlayCode ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPlayCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                {codeView === 'sandbox' ? (
                  <textarea
                    className="ml26-code-editor"
                    value={activeCode}
                    spellCheck={false}
                    aria-label="Editable sandbox code"
                    onChange={e =>
                      setCodeByTrack(prev => ({ ...prev, [track.id]: e.target.value }))
                    }
                    onKeyDown={e => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault()
                        void executeSandbox(track.id, activeCode)
                      }
                    }}
                  />
                ) : (
                  <pre className="ml26-python-view">
                    <code>{track.pythonReference}</code>
                  </pre>
                )}
              </div>

              <div className="dsde-card">
                <div className="ml26-out-head">
                  <div>
                    <span className="dsde-kicker">SANDBOX EXECUTION OUTPUT</span>
                    <h4>Live Metrics, Assertions &amp; Stdout</h4>
                  </div>
                  {activeRunResult && (
                    <span className="bc-tabular ml26-runtime-ms">
                      {activeRunResult.durationMs} ms
                    </span>
                  )}
                </div>

                {activeRunResult?.errorMessage && (
                  <div className="dsde-health-banner breaking">
                    <XCircle size={18} />
                    <div>
                      <span className="dsde-health-tag">RUNTIME ERROR</span>
                      <strong>Sandbox Execution Failed</strong>
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
                    <span className="dsde-kicker">VERIFICATION ASSERTIONS</span>
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
                  {activeRunResult && activeRunResult.logs.length > 0 ? (
                    <TokenStreamTypewriter
                      text={activeRunResult.logs.map(l => l.text).join('\n')}
                      streamKey={`ml26-log-${activeRunResult.durationMs}-${activeRunResult.logs.length}`}
                      label="CONSOLE LOGS · LIVE STREAM"
                      variant="code"
                      tokenDelayMs={22}
                    />
                  ) : (
                    <>
                      <span className="dsde-kicker">CONSOLE LOGS</span>
                      <pre>
                        {isRunningCode
                          ? 'Executing in isolated Web Worker...'
                          : 'Click "Run Code" to execute this track sandbox.'}
                      </pre>
                    </>
                  )}
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

          {/* Serial Track Prev / Next Footer */}
          <footer className="ml26-stage-footer">
            <button
              type="button"
              className="bc-btn-secondary"
              disabled={globalTrackIndex <= 0}
              onClick={() => {
                const prev = ALL_TRACKS[globalTrackIndex - 1]
                if (prev) {
                  setPhaseFilter('all')
                  setSearchQuery('')
                  setActiveTrackId(prev.id)
                  setSelectedTopicId(prev.topics[0].id)
                }
              }}
            >
              <ArrowLeft size={15} />
              <span>
                {globalTrackIndex > 0
                  ? `Prev: ${String(ALL_TRACKS[globalTrackIndex - 1].number).padStart(2, '0')}. ${ALL_TRACKS[globalTrackIndex - 1].title}`
                  : 'First Track'}
              </span>
            </button>

            <span className="bc-tabular ml26-pager-meta">
              Track {String(track.number).padStart(2, '0')} / {ALL_TRACKS.length}
            </span>

            <button
              type="button"
              className="bc-btn-primary"
              disabled={globalTrackIndex >= ALL_TRACKS.length - 1}
              onClick={() => {
                const next = ALL_TRACKS[globalTrackIndex + 1]
                if (next) {
                  setPhaseFilter('all')
                  setSearchQuery('')
                  setActiveTrackId(next.id)
                  setSelectedTopicId(next.topics[0].id)
                }
              }}
            >
              <span>
                {globalTrackIndex < ALL_TRACKS.length - 1
                  ? `Next: ${String(ALL_TRACKS[globalTrackIndex + 1].number).padStart(2, '0')}. ${ALL_TRACKS[globalTrackIndex + 1].title}`
                  : 'All 16 Tracks Complete'}
              </span>
              <ArrowRight size={15} />
            </button>
          </footer>
        </div>
      </div>
    </section>
  )
}
