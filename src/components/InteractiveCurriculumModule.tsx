import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sliders,
  Terminal,
  Workflow,
  X,
  XCircle
} from 'lucide-react'
import {
  beginnerStages,
  beginnerTopics,
  evaluateTopicSimulation,
  getDefaultSimulatorValues,
  type BeginnerCurriculumTopic
} from '../data/beginnerCurriculum'
import { interactiveTopicOutcomes } from '../data/withWithoutBestPractices'
import TokenStreamTypewriter from './TokenStreamTypewriter'
import MermaidDiagram from './MermaidDiagram'

const STORAGE_KEY = 'ai-academy.beginner-curriculum.mastered.v1'

function readMasteredIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid = new Set(beginnerTopics.map(t => t.id))
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && valid.has(id)))]
  } catch {
    return []
  }
}

export default function InteractiveCurriculumModule() {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(beginnerTopics[0].id)
  const [searchQuery, setSearchQuery] = useState('')
  const [masteredIds, setMasteredIds] = useState<string[]>(readMasteredIds)

  // Animation timeline state
  const [frameIndex, setFrameIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [diagramTab, setDiagramTab] = useState<'visual' | 'mermaid'>('visual')
  const [showTimelineJson, setShowTimelineJson] = useState(false)

  // Simulator state
  const [simValues, setSimValues] = useState<Record<string, number | boolean>>(() =>
    getDefaultSimulatorValues(beginnerTopics[0])
  )
  const [showFormulas, setShowFormulas] = useState(true)
  const [compareFocus, setCompareFocus] = useState<'both' | 'without' | 'with'>('both')
  const [focusedSection, setFocusedSection] = useState<'all' | 'analogy' | 'dfd' | 'simulator' | 'impact' | 'practice'>('all')

  // Practice & Quiz state
  const [codeDraft, setCodeDraft] = useState(beginnerTopics[0].handsOnPractice.codingChallenge.starterCode)
  const [codeFeedback, setCodeFeedback] = useState<{ passed: boolean; message: string } | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [quizChecked, setQuizChecked] = useState<Record<string, boolean>>({})

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const topic: BeginnerCurriculumTopic = useMemo(
    () => beginnerTopics.find(t => t.id === selectedTopicId) ?? beginnerTopics[0],
    [selectedTopicId]
  )

  const topicIndex = beginnerTopics.findIndex(t => t.id === topic.id)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(masteredIds))
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }, [masteredIds])

  // Reset per-topic interactive states cleanly on topic change
  useEffect(() => {
    setFrameIndex(0)
    setIsPlaying(false)
    setDiagramTab('visual')
    setShowTimelineJson(false)
    setSimValues(getDefaultSimulatorValues(topic))
    setCodeDraft(topic.handsOnPractice.codingChallenge.starterCode)
    setCodeFeedback(null)
    setShowHint(false)
    setShowSolution(false)
    setQuizAnswers({})
    setQuizChecked({})
  }, [topic])

  // Timeline auto-playback
  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setTimeout(() => {
      setFrameIndex(prev => {
        if (prev >= topic.animationTimeline.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 2400 / speed)
    return () => window.clearTimeout(timer)
  }, [isPlaying, frameIndex, speed, topic.animationTimeline.length])

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return beginnerTopics
    return beginnerTopics.filter(t =>
      `${t.title} ${t.stageTitle} ${t.tagline} ${t.simpleEnglish.analogyTitle}`
        .toLowerCase()
        .includes(q)
    )
  }, [searchQuery])

  const activeFrame = topic.animationTimeline[frameIndex] ?? topic.animationTimeline[0]
  const simResult = useMemo(
    () => evaluateTopicSimulation(topic.id, simValues),
    [topic.id, simValues]
  )
  const outcomeProfile = interactiveTopicOutcomes[topic.id] ?? interactiveTopicOutcomes['py-data-pipelines']

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(curr => (curr === key ? null : curr)), 1800)
    } catch {
      setCopiedKey(null)
    }
  }

  const handleExportJson = () => {
    const payload = {
      curriculum: 'AI Engineering Beginner-to-Production Interactive Module',
      topic_count: beginnerTopics.length,
      stages: beginnerStages,
      topics: beginnerTopics.map(t => ({
        id: t.id,
        stage: t.stageTitle,
        topic_number: t.topicNumber,
        title: t.title,
        simple_english_and_analogy: t.simpleEnglish,
        architecture_flow_mermaid: t.architectureFlow.mermaidSyntax,
        step_by_step_animation_timeline: t.animationTimeline,
        interactive_simulator_config: t.simulatorConfig,
        with_vs_without_and_best_practices: interactiveTopicOutcomes[t.id],
        hands_on_practice_and_quiz: t.handsOnPractice
      }))
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ai-engineering-interactive-curriculum.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleCheckCode = () => {
    const challenge = topic.handsOnPractice.codingChallenge
    const normalized = codeDraft.replace(/\s+/g, ' ').trim()
    const missing = challenge.requiredTokens.filter(token => !normalized.includes(token))
    if (missing.length === 0) {
      setCodeFeedback({
        passed: true,
        message: `All checks passed! Expected output ${challenge.expectedOutput} confirmed. ${challenge.verificationNote}`
      })
    } else {
      setCodeFeedback({
        passed: false,
        message: `Almost there — make sure your implementation includes: ${missing.join(', ')}. Review the hint if you need a nudge.`
      })
    }
  }

  const handleCheckQuiz = (qId: string) => {
    const nextChecked = { ...quizChecked, [qId]: true }
    setQuizChecked(nextChecked)

    const allCorrect = topic.handsOnPractice.troubleshootingQuiz.every(
      q => nextChecked[q.id] && quizAnswers[q.id] === q.correctIndex
    )
    if (allCorrect && !masteredIds.includes(topic.id)) {
      setMasteredIds(prev => [...prev, topic.id])
    }
  }

  const toggleMastered = () => {
    setMasteredIds(prev =>
      prev.includes(topic.id) ? prev.filter(id => id !== topic.id) : [...prev, topic.id]
    )
  }

  const isMastered = masteredIds.includes(topic.id)
  const masteryPct = Math.round((masteredIds.length / beginnerTopics.length) * 100)

  return (
    <section className="bc-shell" id="interactive-curriculum" aria-label="Interactive Beginner-to-Production AI Curriculum">
      {/* Module Header */}
      <div className="bc-header">
        <div className="bc-header-copy">
          <div className="bc-meta-line">
            <span>Guided Visual Studio</span>
            <span aria-hidden="true">·</span>
            <span>6 Core Stages</span>
            <span aria-hidden="true">·</span>
            <span>{beginnerTopics.length} Interactive Topics</span>
            <span aria-hidden="true">·</span>
            <span className="bc-tabular">{masteredIds.length} / {beginnerTopics.length} mastered ({masteryPct}%)</span>
          </div>
          <h2>Interactive AI Engineering Studio: Foundations to Production</h2>
          <p>
            Every topic follows a structured 6-part learning loop: plain-English analogy, live animated Mermaid DFD,
            virtual simulator, With-vs-Without outcomes, best practices, and hands-on verification.
          </p>
        </div>
        <div className="bc-header-actions">
          <button
            type="button"
            className="bc-btn-secondary"
            onClick={() =>
              handleCopy(
                'topic-json',
                JSON.stringify(
                  {
                    id: topic.id,
                    title: topic.title,
                    simple_english: topic.simpleEnglish,
                    architecture_flow_mermaid: topic.architectureFlow.mermaidSyntax,
                    animation_timeline: topic.animationTimeline,
                    simulator_config: topic.simulatorConfig,
                    with_vs_without_and_best_practices: outcomeProfile,
                    hands_on_practice: topic.handsOnPractice
                  },
                  null,
                  2
                )
              )
            }
          >
            {copiedKey === 'topic-json' ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedKey === 'topic-json' ? 'Copied Topic JSON' : 'Copy Topic JSON'}</span>
          </button>
          <button type="button" className="bc-btn-primary" onClick={handleExportJson}>
            <Download size={14} />
            <span>Export Full JSON</span>
          </button>
        </div>
      </div>

      {/* Two-Zone Layout: Navigator Rail + Interactive 5-Section Workspace */}
      <div className="bc-layout">
        {/* Left Navigation Rail */}
        <aside className="bc-sidebar" aria-label="Curriculum topics navigation">
          <div className="bc-search-wrap">
            <Search size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter topics or analogies..."
              aria-label="Filter curriculum topics"
            />
            {searchQuery && (
              <button
                type="button"
                className="bc-icon-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear topic filter"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="bc-stage-groups">
            {beginnerStages.map(stage => {
              const stageTopics = filteredTopics.filter(t => t.stageId === stage.id)
              if (stageTopics.length === 0) return null
              return (
                <div key={stage.id} className="bc-stage-group">
                  <div className="bc-stage-label">
                    <span className="bc-tabular">{String(stage.stageNumber).padStart(2, '0')}.</span>
                    <span>{stage.title}</span>
                  </div>
                  <div className="bc-topic-list">
                    {stageTopics.map(item => {
                      const active = item.id === topic.id
                      const done = masteredIds.includes(item.id)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`bc-topic-btn ${active ? 'active' : ''}`}
                          onClick={() => setSelectedTopicId(item.id)}
                          aria-current={active ? 'page' : undefined}
                        >
                          <span className="bc-topic-num bc-tabular">{item.topicNumber}</span>
                          <span className="bc-topic-name">{item.title}</span>
                          {done && <CheckCircle2 size={14} className="bc-topic-done-icon" aria-label="Mastered" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {filteredTopics.length === 0 && (
              <p className="bc-empty-filter">No topics match "{searchQuery}".</p>
            )}
          </div>
        </aside>

        {/* Right Main 5-Section Workspace */}
        <div className="bc-workspace">
          {/* Topic Banner */}
          <header className="bc-topic-header">
            <div>
              <div className="bc-meta-line">
                <span>Stage {String(topic.stageNumber).padStart(2, '0')}</span>
                <span aria-hidden="true">·</span>
                <span>{topic.stageTitle}</span>
                <span aria-hidden="true">·</span>
                <span>Topic {topic.topicNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{topic.estimatedMinutes} min read & lab</span>
              </div>
              <h3>{topic.title}</h3>
              <p>{topic.tagline}</p>
            </div>
            <div className="bc-topic-nav-btns">
              <button
                type="button"
                className="bc-btn-secondary"
                disabled={topicIndex <= 0}
                onClick={() => setSelectedTopicId(beginnerTopics[topicIndex - 1].id)}
              >
                <ArrowLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                type="button"
                className="bc-btn-secondary"
                disabled={topicIndex >= beginnerTopics.length - 1}
                onClick={() => setSelectedTopicId(beginnerTopics[topicIndex + 1].id)}
              >
                <span>Next</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </header>

          {/* Progressive Disclosure Step Switcher */}
          <div className="bc-section-jumps" role="tablist" aria-label="Topic learning steps">
            {[
              { id: 'all', label: 'All Sections' },
              { id: 'analogy', label: '01. Analogy & Code' },
              { id: 'dfd', label: '02–03. DFD & Timeline' },
              { id: 'simulator', label: '04. Simulator' },
              { id: 'impact', label: '05. With vs. Without' },
              { id: 'practice', label: '06. Practice & Quiz' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={focusedSection === tab.id}
                className={`bc-step-tab ${focusedSection === tab.id ? 'active' : ''}`}
                onClick={() => setFocusedSection(tab.id as typeof focusedSection)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ===============================================================
              SECTION 1: SIMPLE ENGLISH & EVERYDAY ANALOGY
          ================================================================ */}
          {(focusedSection === 'all' || focusedSection === 'analogy') && (
          <section className="bc-section" id="bc-sec-1">
            <div className="bc-section-head">
              <div className="bc-section-title">
                <BookOpen size={17} />
                <h4>01. Simple English & Everyday Analogy</h4>
              </div>
              <span className="bc-section-sub">Plain language · No heavy jargon</span>
            </div>

            <p className="bc-plain-prose">{topic.simpleEnglish.plainExplanation}</p>

            <div className="bc-analogy-panel">
              <div className="bc-analogy-intro">
                <span className="bc-kicker">Everyday Analogy</span>
                <h5>{topic.simpleEnglish.analogyTitle}</h5>
                <p>{topic.simpleEnglish.analogyStory}</p>
              </div>

              <div className="bc-mapping-table-wrap">
                <table className="bc-mapping-table">
                  <thead>
                    <tr>
                      <th>Real-World Piece</th>
                      <th>AI Engineering Equivalent</th>
                      <th>Why It Matters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topic.simpleEnglish.analogyMappings.map(row => (
                      <tr key={row.aiConcept}>
                        <td>{row.realWorld}</td>
                        <td><strong>{row.aiConcept}</strong></td>
                        <td>{row.whyItMatters}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bc-code-panel">
              <div className="bc-code-bar">
                <span className="bc-code-title">
                  <Code2 size={14} />
                  <span>{topic.simpleEnglish.codeTitle}</span>
                </span>
                <button
                  type="button"
                  className="bc-btn-ghost"
                  onClick={() => handleCopy('snippet', topic.simpleEnglish.codeSnippet)}
                >
                  {copiedKey === 'snippet' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="bc-code-pre">
                <code>{topic.simpleEnglish.codeSnippet}</code>
              </pre>
            </div>
            {focusedSection === 'analogy' && (
              <div className="bc-step-continue">
                <button type="button" className="bc-btn-primary" onClick={() => setFocusedSection('dfd')}>
                  <span>Next: Architecture DFD &amp; Animation</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </section>
          )}

          {/* ===============================================================
              SECTION 2 & 3: ARCHITECTURE FLOW (MERMAID) + ANIMATION TIMELINE
          ================================================================ */}
          {(focusedSection === 'all' || focusedSection === 'dfd') && (
          <section className="bc-section" id="bc-sec-2">
            <div className="bc-section-head">
              <div className="bc-section-title">
                <Workflow size={17} />
                <h4>02. Architecture Flow & 03. Step-by-Step Animation Timeline</h4>
              </div>
              <div className="bc-segmented">
                <button
                  type="button"
                  className={diagramTab === 'visual' ? 'active' : ''}
                  onClick={() => setDiagramTab('visual')}
                >
                  Live Diagram
                </button>
                <button
                  type="button"
                  className={diagramTab === 'mermaid' ? 'active' : ''}
                  onClick={() => setDiagramTab('mermaid')}
                >
                  Mermaid Syntax
                </button>
              </div>
            </div>

            <p className="bc-caption">{topic.architectureFlow.flowCaption}</p>

            <div className="bc-flow-timeline-grid">
              {/* Left Stage: Mermaid Visual or Raw Syntax */}
              <div className="bc-stage-canvas">
                {diagramTab === 'visual' ? (
                  <MermaidDiagram
                    syntax={topic.architectureFlow.mermaidSyntax}
                    diagramType={topic.architectureFlow.diagramType}
                    highlightNode={activeFrame.highlight_node}
                    nodeLabels={topic.architectureFlow.nodeLabels}
                  />
                ) : (
                  <div className="bc-code-panel bc-code-flush">
                    <div className="bc-code-bar">
                      <span className="bc-code-title">
                        <span>Valid Mermaid.js ({topic.architectureFlow.diagramType})</span>
                      </span>
                      <button
                        type="button"
                        className="bc-btn-ghost"
                        onClick={() => handleCopy('mermaid', topic.architectureFlow.mermaidSyntax)}
                      >
                        {copiedKey === 'mermaid' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedKey === 'mermaid' ? 'Copied' : 'Copy Mermaid'}</span>
                      </button>
                    </div>
                    <pre className="bc-code-pre">
                      <code>{topic.architectureFlow.mermaidSyntax}</code>
                    </pre>
                  </div>
                )}
              </div>

              {/* Right Control & Payload Inspector Deck */}
              <div className="bc-timeline-deck">
                <div className="bc-timeline-controls">
                  <button
                    type="button"
                    className="bc-ctrl-btn"
                    disabled={frameIndex === 0}
                    onClick={() => {
                      setIsPlaying(false)
                      setFrameIndex(v => Math.max(0, v - 1))
                    }}
                    aria-label="Previous animation step"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    type="button"
                    className="bc-ctrl-btn primary"
                    onClick={() => {
                      if (frameIndex >= topic.animationTimeline.length - 1) setFrameIndex(0)
                      setIsPlaying(p => !p)
                    }}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>
                      {isPlaying
                        ? 'Pause'
                        : frameIndex >= topic.animationTimeline.length - 1
                          ? 'Replay'
                          : 'Play Steps'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="bc-ctrl-btn"
                    disabled={frameIndex >= topic.animationTimeline.length - 1}
                    onClick={() => {
                      setIsPlaying(false)
                      setFrameIndex(v => Math.min(topic.animationTimeline.length - 1, v + 1))
                    }}
                    aria-label="Next animation step"
                  >
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="bc-ctrl-btn"
                    onClick={() => {
                      setIsPlaying(false)
                      setFrameIndex(0)
                    }}
                    aria-label="Reset animation"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <select
                    className="bc-speed-select"
                    value={speed}
                    onChange={e => setSpeed(Number(e.target.value))}
                    aria-label="Animation playback speed"
                  >
                    <option value={0.75}>0.75×</option>
                    <option value={1}>1×</option>
                    <option value={1.5}>1.5×</option>
                  </select>
                </div>

                {/* Step Selector Rail */}
                <div className="bc-step-rail" role="tablist" aria-label="Animation frames">
                  {topic.animationTimeline.map((frame, idx) => (
                    <button
                      key={frame.step_number}
                      type="button"
                      role="tab"
                      aria-selected={idx === frameIndex}
                      className={`bc-step-dot ${idx === frameIndex ? 'active' : idx < frameIndex ? 'visited' : ''}`}
                      onClick={() => {
                        setIsPlaying(false)
                        setFrameIndex(idx)
                      }}
                    >
                      <span className="bc-tabular">0{frame.step_number}</span>
                      <span>{frame.highlight_node}</span>
                    </button>
                  ))}
                </div>

                {/* Current Frame Explanation + Live Payload */}
                <div className="bc-frame-inspector" aria-live="polite">
                  <div className="bc-frame-meta">
                    <span className="bc-tabular">
                      Frame {activeFrame.step_number} of {topic.animationTimeline.length}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Node: <code>{activeFrame.highlight_node}</code>
                    </span>
                  </div>
                  <p className="bc-frame-desc">{activeFrame.visual_state_description}</p>
                  <div className="bc-payload-box">
                    <div className="bc-payload-label">sample_data_payload</div>
                    <pre>
                      <code>{JSON.stringify(activeFrame.sample_data_payload, null, 2)}</code>
                    </pre>
                  </div>
                </div>

                <div className="bc-timeline-footer">
                  <button
                    type="button"
                    className="bc-btn-ghost"
                    onClick={() => setShowTimelineJson(v => !v)}
                  >
                    {showTimelineJson ? 'Hide Timeline JSON Spec' : 'Inspect Timeline JSON Spec'}
                  </button>
                  <button
                    type="button"
                    className="bc-btn-ghost"
                    onClick={() =>
                      handleCopy('timeline-json', JSON.stringify(topic.animationTimeline, null, 2))
                    }
                  >
                    {copiedKey === 'timeline-json' ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedKey === 'timeline-json' ? 'Copied JSON' : 'Copy JSON'}</span>
                  </button>
                </div>
              </div>
            </div>

            {showTimelineJson && (
              <div className="bc-code-panel bc-spec-drawer">
                <div className="bc-code-bar">
                  <span className="bc-code-title">Step-by-Step Animation Timeline JSON Spec</span>
                </div>
                <pre className="bc-code-pre">
                  <code>{JSON.stringify(topic.animationTimeline, null, 2)}</code>
                </pre>
              </div>
            )}
            {focusedSection === 'dfd' && (
              <div className="bc-step-continue">
                <button type="button" className="bc-btn-primary" onClick={() => setFocusedSection('simulator')}>
                  <span>Next: Interactive Virtual Simulator</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </section>
          )}

          {/* ===============================================================
              SECTION 4: INTERACTIVE SIMULATOR & PLAYGROUND
          ================================================================ */}
          {(focusedSection === 'all' || focusedSection === 'simulator') && (
          <section className="bc-section" id="bc-sec-4">
            <div className="bc-section-head">
              <div className="bc-section-title">
                <Sliders size={17} />
                <h4>04. Interactive Simulator & Playground</h4>
              </div>
              <button
                type="button"
                className="bc-btn-ghost"
                onClick={() => setSimValues(getDefaultSimulatorValues(topic))}
              >
                <RotateCcw size={13} />
                <span>Reset Defaults</span>
              </button>
            </div>

            <p className="bc-caption">{topic.simulatorConfig.summary}</p>

            {/* Controls Row */}
            <div className="bc-sim-controls">
              {topic.simulatorConfig.controls.map(ctrl => {
                const value = simValues[ctrl.id] ?? ctrl.defaultValue
                if (ctrl.type === 'toggle') {
                  const checked = Boolean(value)
                  return (
                    <div key={ctrl.id} className="bc-control-card">
                      <div className="bc-control-top">
                        <label htmlFor={`sim-${topic.id}-${ctrl.id}`}>{ctrl.label}</label>
                        <button
                          id={`sim-${topic.id}-${ctrl.id}`}
                          type="button"
                          role="switch"
                          aria-checked={checked}
                          className={`bc-toggle ${checked ? 'on' : 'off'}`}
                          onClick={() =>
                            setSimValues(prev => ({ ...prev, [ctrl.id]: !checked }))
                          }
                        >
                          <span className="bc-toggle-thumb" />
                          <span>{checked ? 'Enabled' : 'Disabled'}</span>
                        </button>
                      </div>
                      <p className="bc-control-help">{ctrl.helperText}</p>
                    </div>
                  )
                }

                const numericVal = typeof value === 'number' ? value : Number(ctrl.defaultValue)
                return (
                  <div key={ctrl.id} className="bc-control-card">
                    <div className="bc-control-top">
                      <label htmlFor={`sim-${topic.id}-${ctrl.id}`}>{ctrl.label}</label>
                      <strong className="bc-control-value bc-tabular">
                        {ctrl.step && ctrl.step < 1 ? numericVal.toFixed(2) : numericVal}{' '}
                        <span>{ctrl.unit ?? ''}</span>
                      </strong>
                    </div>
                    <input
                      id={`sim-${topic.id}-${ctrl.id}`}
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={ctrl.step}
                      value={numericVal}
                      onChange={e =>
                        setSimValues(prev => ({ ...prev, [ctrl.id]: Number(e.target.value) }))
                      }
                    />
                    <div className="bc-slider-ticks">
                      <span>{ctrl.minLabel ?? ctrl.min}</span>
                      <span>{ctrl.maxLabel ?? ctrl.max}</span>
                    </div>
                    <p className="bc-control-help">{ctrl.helperText}</p>
                  </div>
                )
              })}
            </div>

            {/* 4-Metric KPI Strip (tabular-nums + dual-coded semantic status) */}
            <div className="bc-kpi-grid" aria-live="polite">
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Simulated Accuracy</span>
                <strong className="bc-kpi-val bc-tabular">{simResult.accuracyScore.toFixed(1)}%</strong>
                <div className="bc-kpi-bar">
                  <span style={{ width: `${Math.min(100, Math.max(0, simResult.accuracyScore))}%` }} />
                </div>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Estimated Latency</span>
                <strong className="bc-kpi-val bc-tabular">{simResult.latencyMs.toLocaleString()} ms</strong>
                <small>{simResult.latencyMs > 1500 ? 'Slow user wait' : 'Responsive budget'}</small>
              </div>
              <div className="bc-kpi-card">
                <span className="bc-kpi-label">Est. Token / Compute Cost</span>
                <strong className="bc-kpi-val bc-tabular">${simResult.tokenCostUsd.toFixed(4)}</strong>
                <small className="bc-tabular">~{simResult.tokenEstimate.toLocaleString()} tokens / units</small>
              </div>
              <div className={`bc-kpi-card bc-health-${simResult.healthStatus}`}>
                <span className="bc-kpi-label">System State</span>
                <strong className="bc-kpi-health-val">
                  {simResult.healthStatus === 'optimal' ? (
                    <CheckCircle2 size={17} />
                  ) : simResult.healthStatus === 'tradeoff' ? (
                    <AlertTriangle size={17} />
                  ) : (
                    <XCircle size={17} />
                  )}
                  <span>{simResult.healthLabel}</span>
                </strong>
                <small>{simResult.healthReason}</small>
              </div>
            </div>

            {/* Live Simulated Output Box */}
            <div className={`bc-sim-output bc-output-${simResult.healthStatus}`}>
              <TokenStreamTypewriter
                text={simResult.simulatedOutput}
                streamKey={`${topic.id}-${simResult.healthStatus}-${simResult.accuracyScore}-${simResult.latencyMs}`}
                label="Live Simulated Output"
                variant="prose"
              />
            </div>

            {/* Formula Rules Transparency Panel */}
            <div className="bc-formula-panel">
              <button
                type="button"
                className="bc-formula-toggle"
                onClick={() => setShowFormulas(v => !v)}
              >
                <span>Exact Simulation Formulas & Trade-Off Rules</span>
                <span>{showFormulas ? 'Hide' : 'Show'}</span>
              </button>
              {showFormulas && (
                <div className="bc-formula-list">
                  {topic.simulatorConfig.formulaRules.map(rule => (
                    <div key={rule.metric} className="bc-formula-row">
                      <div>
                        <strong>{rule.metric}</strong>
                        <code>{rule.formula}</code>
                      </div>
                      <p>{rule.plainMeaning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {focusedSection === 'simulator' && (
              <div className="bc-step-continue">
                <button type="button" className="bc-btn-primary" onClick={() => setFocusedSection('impact')}>
                  <span>Next: With vs. Without &amp; Best Practices</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </section>
          )}

          {/* ===============================================================
              SECTION 5: WITH IT VS WITHOUT IT & PRODUCTION BEST PRACTICES
          ================================================================ */}
          {(focusedSection === 'all' || focusedSection === 'impact') && (
          <section className="bc-section" id="bc-sec-5-impact">
            <div className="bc-section-head">
              <div className="bc-section-title">
                <CheckCircle2 size={17} />
                <h4>05. What Is Achieved With It vs. Without It &amp; Best Practices</h4>
              </div>
              <div className="bc-segmented" role="group" aria-label="Compare mode">
                <button
                  type="button"
                  className={compareFocus === 'both' ? 'active' : ''}
                  onClick={() => setCompareFocus('both')}
                >
                  Side-by-Side
                </button>
                <button
                  type="button"
                  className={compareFocus === 'without' ? 'active' : ''}
                  onClick={() => setCompareFocus('without')}
                >
                  Without It
                </button>
                <button
                  type="button"
                  className={compareFocus === 'with' ? 'active' : ''}
                  onClick={() => setCompareFocus('with')}
                >
                  With It
                </button>
              </div>
            </div>

            <p className="bc-caption">
              Real-world scenario: <strong>{outcomeProfile.scenarioContext}</strong>
            </p>

            <div className={`bc-compare-grid ${compareFocus !== 'both' ? 'single' : ''}`}>
              {(compareFocus === 'both' || compareFocus === 'without') && (
                <article className="bc-compare-card without">
                  <div className="bc-compare-label">
                    <XCircle size={15} />
                    <span>Without This Concept</span>
                  </div>
                  <h5>{outcomeProfile.withoutConcept.headline}</h5>
                  <p>{outcomeProfile.withoutConcept.whatBreaks}</p>
                  <div className="bc-compare-foot">
                    <strong>Observed failure:</strong> {outcomeProfile.withoutConcept.symptom}
                  </div>
                </article>
              )}

              {(compareFocus === 'both' || compareFocus === 'with') && (
                <article className="bc-compare-card with">
                  <div className="bc-compare-label">
                    <CheckCircle2 size={15} />
                    <span>Achieved With This Concept</span>
                  </div>
                  <h5>{outcomeProfile.withConcept.headline}</h5>
                  <p>{outcomeProfile.withConcept.whatIsAchieved}</p>
                  <div className="bc-compare-foot">
                    <strong>Verified outcome:</strong> {outcomeProfile.withConcept.proofSignal}
                  </div>
                </article>
              )}
            </div>

            <div className="bc-delta-grid">
              {outcomeProfile.metrics.map(m => (
                <div key={m.label} className="bc-delta-card">
                  <span className="bc-delta-label">{m.label}</span>
                  <div className="bc-delta-values bc-tabular">
                    <span className="bc-delta-without">{m.withoutValue}</span>
                    <span aria-hidden="true">→</span>
                    <strong className="bc-delta-with">{m.withValue}</strong>
                  </div>
                  <small>{m.gainSummary}</small>
                </div>
              ))}
            </div>

            <div className="bc-bp-panel">
              <div className="bc-bp-head">
                <h5>Production Best Practices (Do This vs. Avoid That)</h5>
                <span>{outcomeProfile.bestPractices.length} engineering rules</span>
              </div>
              <div className="bc-bp-list">
                {outcomeProfile.bestPractices.map((rule, idx) => (
                  <div key={rule.doThis} className="bc-bp-row">
                    <div className="bc-bp-num bc-tabular">{String(idx + 1).padStart(2, '0')}</div>
                    <div className="bc-bp-cols">
                      <div className="bc-bp-do">
                        <span><CheckCircle2 size={13} /> Do</span>
                        <p>{rule.doThis}</p>
                      </div>
                      <div className="bc-bp-avoid">
                        <span><AlertTriangle size={13} /> Avoid</span>
                        <p>{rule.avoidThis}</p>
                      </div>
                      <p className="bc-bp-why">{rule.whyItMatters}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {focusedSection === 'impact' && (
              <div className="bc-step-continue">
                <button type="button" className="bc-btn-primary" onClick={() => setFocusedSection('practice')}>
                  <span>Next: Coding Challenge &amp; Mini-Quiz</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </section>
          )}

          {/* ===============================================================
              SECTION 6: HANDS-ON PRACTICE & MINI-QUIZ
          ================================================================ */}
          {(focusedSection === 'all' || focusedSection === 'practice') && (
          <section className="bc-section" id="bc-sec-5">
            <div className="bc-section-head">
              <div className="bc-section-title">
                <Terminal size={17} />
                <h4>06. Hands-On Practice &amp; Troubleshooting Mini-Quiz</h4>
              </div>
              <button
                type="button"
                className={isMastered ? 'bc-btn-mastered' : 'bc-btn-secondary'}
                onClick={toggleMastered}
              >
                {isMastered ? <CheckCircle2 size={14} /> : <Check size={14} />}
                <span>{isMastered ? 'Topic Mastered' : 'Mark Mastered'}</span>
              </button>
            </div>

            {/* Coding Challenge */}
            <div className="bc-challenge-panel">
              <div className="bc-challenge-head">
                <span className="bc-kicker">Coding Challenge</span>
                <h5>{topic.handsOnPractice.codingChallenge.title}</h5>
                <p>{topic.handsOnPractice.codingChallenge.prompt}</p>
              </div>

              <div className="bc-io-grid">
                <div className="bc-io-box">
                  <span>Expected Input</span>
                  <code>{topic.handsOnPractice.codingChallenge.expectedInput}</code>
                </div>
                <div className="bc-io-box">
                  <span>Expected Output</span>
                  <code>{topic.handsOnPractice.codingChallenge.expectedOutput}</code>
                </div>
              </div>

              <label htmlFor={`code-editor-${topic.id}`} className="bc-editor-label">
                Your Python Implementation (editable)
              </label>
              <textarea
                id={`code-editor-${topic.id}`}
                className="bc-code-editor"
                rows={7}
                spellCheck={false}
                value={codeDraft}
                onChange={e => {
                  setCodeDraft(e.target.value)
                  setCodeFeedback(null)
                }}
              />

              <div className="bc-challenge-actions">
                <button type="button" className="bc-btn-primary" onClick={handleCheckCode}>
                  <Play size={14} />
                  <span>Verify Implementation</span>
                </button>
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => setShowHint(h => !h)}
                >
                  <HelpCircle size={14} />
                  <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                </button>
                <button
                  type="button"
                  className="bc-btn-secondary"
                  onClick={() => setShowSolution(s => !s)}
                >
                  <Code2 size={14} />
                  <span>{showSolution ? 'Hide Reference Solution' : 'Reveal Solution'}</span>
                </button>
                <button
                  type="button"
                  className="bc-btn-ghost"
                  onClick={() => {
                    setCodeDraft(topic.handsOnPractice.codingChallenge.starterCode)
                    setCodeFeedback(null)
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              </div>

              {showHint && (
                <div className="bc-callout-note">
                  <strong>Hint:</strong> {topic.handsOnPractice.codingChallenge.hint}
                </div>
              )}

              {showSolution && (
                <div className="bc-code-panel">
                  <div className="bc-code-bar">
                    <span className="bc-code-title">Reference Solution</span>
                    <button
                      type="button"
                      className="bc-btn-ghost"
                      onClick={() => setCodeDraft(topic.handsOnPractice.codingChallenge.solutionCode)}
                    >
                      Load into Editor
                    </button>
                  </div>
                  <pre className="bc-code-pre">
                    <code>{topic.handsOnPractice.codingChallenge.solutionCode}</code>
                  </pre>
                </div>
              )}

              {codeFeedback && (
                <div
                  className={`bc-feedback-banner ${codeFeedback.passed ? 'pass' : 'fail'}`}
                  role="status"
                >
                  {codeFeedback.passed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{codeFeedback.message}</span>
                </div>
              )}
            </div>

            {/* 2 Troubleshooting MCQs */}
            <div className="bc-quiz-grid">
              {topic.handsOnPractice.troubleshootingQuiz.map((q, qIdx) => {
                const picked = quizAnswers[q.id]
                const checked = Boolean(quizChecked[q.id])
                const isCorrect = picked === q.correctIndex

                return (
                  <article key={q.id} className="bc-quiz-card">
                    <div className="bc-quiz-kicker">
                      Troubleshooting Question {qIdx + 1} of 2
                    </div>
                    <h5>{q.question}</h5>
                    <div className="bc-quiz-options" role="radiogroup" aria-label={q.question}>
                      {q.options.map((opt, optIdx) => {
                        const chosen = picked === optIdx
                        const statusClass = checked
                          ? optIdx === q.correctIndex
                            ? 'correct'
                            : chosen
                              ? 'wrong'
                              : ''
                          : chosen
                            ? 'selected'
                            : ''

                        return (
                          <button
                            key={opt}
                            type="button"
                            role="radio"
                            aria-checked={chosen}
                            className={`bc-quiz-opt ${statusClass}`}
                            onClick={() => {
                              setQuizAnswers(prev => ({ ...prev, [q.id]: optIdx }))
                              setQuizChecked(prev => ({ ...prev, [q.id]: false }))
                            }}
                          >
                            <span className="bc-opt-letter">{String.fromCharCode(65 + optIdx)}</span>
                            <span>{opt}</span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="bc-quiz-footer">
                      <button
                        type="button"
                        className="bc-btn-secondary"
                        disabled={picked === undefined}
                        onClick={() => handleCheckQuiz(q.id)}
                      >
                        Check Answer
                      </button>
                      {checked && (
                        <span className={`bc-quiz-verdict ${isCorrect ? 'pass' : 'fail'}`}>
                          {isCorrect ? (
                            <>
                              <CheckCircle2 size={15} /> Correct
                            </>
                          ) : (
                            <>
                              <XCircle size={15} /> Try again
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {checked && (
                      <p className="bc-quiz-explanation">{q.explanation}</p>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
          )}
        </div>
      </div>
    </section>
  )
}
