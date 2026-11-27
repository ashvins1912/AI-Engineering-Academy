import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleCheck,
  Code2,
  Cpu,
  GraduationCap,
  Layers3,
  Search,
  ShieldCheck,
  Sliders,
  Target,
  Workflow,
  X
} from 'lucide-react'
import { curriculum, type Lesson } from './data/curriculum'
import LessonPractice from './components/LessonPractice'
import TopicLearningStudio from './components/TopicLearningStudio'
import AssessmentEngine from './components/AssessmentEngine'
import ProductionLabs from './components/ProductionLabs'
import AgenticInterviewStudio from './components/AgenticInterviewStudio'
import ArchitectureFlow from './components/ArchitectureFlow'
import StudentReflection from './components/StudentReflection'
import InteractiveCurriculumModule from './components/InteractiveCurriculumModule'
import FrontierArchitectureDeepDive from './components/FrontierArchitectureDeepDive'
import StageLabsDrawer from './components/StageLabsDrawer'
import VirtualLabWorkspace from './components/VirtualLabWorkspace'
import LLMDevelopmentMasterclass from './components/LLMDevelopmentMasterclass'
import DataScienceEngineeringStudio from './components/DataScienceEngineeringStudio'
import HarnessEngineeringStudio from './components/HarnessEngineeringStudio'

type WorkspaceView = 'overview' | 'vlab' | 'studio' | 'curriculum' | 'frontier-ops'
type StudioTrack = 'ds-de' | 'foundations'
type FrontierOpsTab = 'harness' | 'llm-masterclass' | 'frontier' | 'labs' | 'interviews'
type LessonFilter = 'all' | 'remaining' | 'completed' | 'bookmarked'
type ModalTab = 'learn' | 'practice' | 'assess'

const validLessonIds = new Set(
  curriculum.flatMap(stage => stage.modules.flatMap(module => module.lessons.map(lesson => lesson.id)))
)

const readList = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [
      ...new Set(
        parsed.filter((value): value is string => typeof value === 'string' && validLessonIds.has(value))
      )
    ]
  } catch {
    return []
  }
}

const persistList = (key: string, value: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be disabled or full. Keep the in-memory learner experience usable.
  }
}

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceView>('overview')
  const [studioTrack, setStudioTrack] = useState<StudioTrack>('ds-de')
  const [frontierOpsTab, setFrontierOpsTab] = useState<FrontierOpsTab>('harness')
  const [query, setQuery] = useState('')
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>('all')
  const [activeStage, setActiveStage] = useState(curriculum[0].id)
  const [completed, setCompleted] = useState<string[]>(() => readList('ai-academy.completed.v1'))
  const [bookmarks, setBookmarks] = useState<string[]>(() => readList('ai-academy.bookmarks.v1'))
  const [expanded, setExpanded] = useState<string[]>([curriculum[0].modules[0].id])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [modalTab, setModalTab] = useState<ModalTab>('learn')

  useEffect(() => {
    persistList('ai-academy.completed.v1', completed)
  }, [completed])
  useEffect(() => {
    persistList('ai-academy.bookmarks.v1', bookmarks)
  }, [bookmarks])

  useEffect(() => {
    if (selectedLesson) setModalTab('learn')
  }, [selectedLesson?.id])

  const allLessons = useMemo(
    () => curriculum.flatMap(s => s.modules.flatMap(m => m.lessons)),
    []
  )

  const nextRecommendedLesson = useMemo(
    () => allLessons.find(l => !completed.includes(l.id)) ?? allLessons[0],
    [allLessons, completed]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matchesFilter = (lessonId: string) => {
      if (lessonFilter === 'completed') return completed.includes(lessonId)
      if (lessonFilter === 'remaining') return !completed.includes(lessonId)
      if (lessonFilter === 'bookmarked') return bookmarks.includes(lessonId)
      return true
    }

    return curriculum
      .map(s => ({
        ...s,
        modules: s.modules
          .map(m => ({
            ...m,
            lessons: m.lessons.filter(l => {
              if (!matchesFilter(l.id)) return false
              if (!q) return true
              return `${l.title} ${l.depth} ${l.lab} ${m.title} ${s.title}`.toLowerCase().includes(q)
            })
          }))
          .filter(m => {
            if (m.lessons.length > 0) return true
            if (lessonFilter !== 'all') return false
            return Boolean(q && `${m.title} ${m.description}`.toLowerCase().includes(q))
          })
      }))
      .filter(s => {
        if (s.modules.length > 0) return true
        if (lessonFilter !== 'all') return false
        return Boolean(!q || s.title.toLowerCase().includes(q))
      })
  }, [query, lessonFilter, completed, bookmarks])

  const active = filtered.find(s => s.id === activeStage) ?? filtered[0] ?? curriculum[0]
  const total = allLessons.length
  const progress = Math.round((completed.length / total) * 100)
  const moduleCount = curriculum.reduce((n, s) => n + s.modules.length, 0)
  const stageNumber = curriculum.findIndex(s => s.id === active.id) + 1

  const toggle = (id: string) =>
    setCompleted(v => (v.includes(id) ? v.filter(x => x !== id) : [...v, id]))
  const toggleBookmark = (id: string) =>
    setBookmarks(v => (v.includes(id) ? v.filter(x => x !== id) : [...v, id]))

  const navigateWorkspace = (next: WorkspaceView) => {
    setWorkspace(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openStage = (stageId: string) => {
    setActiveStage(stageId)
    const stageObj = curriculum.find(s => s.id === stageId)
    if (stageObj?.modules[0]) {
      setExpanded(prev => (prev.includes(stageObj.modules[0].id) ? prev : [...prev, stageObj.modules[0].id]))
    }
    navigateWorkspace('curriculum')
  }

  const shouldExpandModule = (moduleId: string) =>
    Boolean(query.trim()) || lessonFilter !== 'all' || expanded.includes(moduleId)

  return (
    <div className="app-shell">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="topbar">
        <button
          type="button"
          className="brand-wordmark"
          onClick={() => navigateWorkspace('overview')}
        >
          <BrainCircuit size={20} />
          <span>AI Engineering Academy</span>
        </button>

        <nav className="top-nav" aria-label="Learning workspaces">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'vlab', label: 'Virtual Lab' },
              { id: 'studio', label: 'Guided Studio' },
              { id: 'curriculum', label: '12-Stage Path' },
              { id: 'frontier-ops', label: 'Frontier & Ops' }
            ] as { id: WorkspaceView; label: string }[]
          ).map(item => (
            <button
              key={item.id}
              type="button"
              className={`ux-nav-btn ${workspace === item.id ? 'active' : ''}`}
              aria-current={workspace === item.id ? 'page' : undefined}
              onClick={() => navigateWorkspace(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="top-cta"
          onClick={() => navigateWorkspace('vlab')}
        >
          Run Virtual Lab
        </button>
      </header>

      <main className="ux-main">
        {/* ================================================================
            WORKSPACE 1: OVERVIEW & LEARNING PATH HUB
        ================================================================= */}
        {workspace === 'overview' && (
          <div className="ux-overview">
            <section className="hero ux-hero">
              <div className="bc-meta-line">
                <span>Independent Learning Platform</span>
                <span aria-hidden="true">·</span>
                <span>Foundations to Production</span>
                <span aria-hidden="true">·</span>
                <span>Interactive DFDs &amp; Simulators</span>
              </div>
              <h1>
                Become an <em>AI Systems Engineer.</em>
              </h1>
              <p>
                Master the complete AI engineering stack—from Python pipelines, math intuition, and
                transformer internals to ChatGPT &amp; Claude alignment, vLLM serving, durable agents,
                and enterprise governance—inside focused, distraction-free workspaces.
              </p>

              <div className="ux-hero-actions">
                <button
                  type="button"
                  className="bc-btn-primary ux-hero-primary"
                  onClick={() => navigateWorkspace('vlab')}
                >
                  <span>Launch Virtual Lab &amp; All Simulators</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="bc-btn-secondary ux-hero-secondary"
                  onClick={() => navigateWorkspace('studio')}
                >
                  <span>Start Guided Visual Studio</span>
                </button>
              </div>

              <div className="hero-stats ux-kpi-strip">
                <div>
                  <strong className="bc-tabular">{curriculum.length}</strong>
                  <span>Structured stages</span>
                </div>
                <div>
                  <strong className="bc-tabular">{moduleCount}</strong>
                  <span>Engineering modules</span>
                </div>
                <div>
                  <strong className="bc-tabular">{total}</strong>
                  <span>Interactive lessons</span>
                </div>
                <div>
                  <strong className="bc-tabular">{progress}%</strong>
                  <span>Personal mastery ({completed.length}/{total})</span>
                </div>
              </div>
            </section>

            {/* Compact Mastery & Resume Bar */}
            <section className="ux-resume-bar" aria-label="Learning progress">
              <div className="ux-resume-left">
                <div className="ux-resume-meta">
                  <strong>Your Learning Progress</strong>
                  <span className="bc-tabular">
                    {completed.length} / {total} completed · {bookmarks.length} bookmarked
                  </span>
                </div>
                <progress className="ux-progress" value={completed.length} max={total} />
                <p className="ux-resume-next">
                  Recommended next lesson: <strong>{nextRecommendedLesson.title}</strong>
                </p>
              </div>
              <button
                type="button"
                className="bc-btn-secondary"
                onClick={() => setSelectedLesson(nextRecommendedLesson)}
              >
                <span>Open Next Lesson</span>
                <ChevronRight size={15} />
              </button>
            </section>

            {/* 4 Focused Learning Workspaces */}
            <section className="ux-tracks-section" aria-label="Choose a learning workspace">
              <div className="ux-section-intro">
                <h2>Choose Your Learning Workspace</h2>
                <p>
                  Every capability is separated into a dedicated studio so you can learn step-by-step
                  without endless scrolling or visual clutter.
                </p>
              </div>

              <div className="ux-track-grid">
                <article className="ux-track-card">
                  <div className="ux-track-meta">
                    <span className="bc-tabular">01</span>
                    <span>Live sandbox runtime · 11 runnable labs · 20+ simulators</span>
                  </div>
                  <h3>Virtual Lab &amp; All Simulators Control Room</h3>
                  <p>
                    Read and edit real executable code for Transformers, vLLM, Agent Harness Runtime,
                    Mini-LLM Training, A/B Testing + CUPED + PSI Drift, ASOF Feature Stores, and
                    Hybrid RAG—plus all interactive simulators live.
                  </p>
                  <button
                    type="button"
                    className="ux-track-cta"
                    onClick={() => navigateWorkspace('vlab')}
                  >
                    <span>Open Virtual Lab &amp; Simulators</span>
                    <ArrowRight size={15} />
                  </button>
                </article>

                <article className="ux-track-card">
                  <div className="ux-track-meta">
                    <span className="bc-tabular">02</span>
                    <span>Serial study track · 6 chapters · live code + virtual simulators</span>
                  </div>
                  <h3>Senior Data Science &amp; Data Engineering Serial Studio</h3>
                  <p>
                    Chapter-by-chapter visualized mastery of A/B Testing &amp; CUPED, Causal DiD &amp;
                    Time-Series, Imbalance/Calibration/SHAP, Iceberg Lakehouse &amp; Spark Skew,
                    CDC Watermarks &amp; ASOF Feature Stores, and PSI Drift + MinHash LLM Data.
                  </p>
                  <button
                    type="button"
                    className="ux-track-cta"
                    onClick={() => {
                      setStudioTrack('ds-de')
                      navigateWorkspace('studio')
                    }}
                  >
                    <span>Start DS &amp; DE Serial Study Track</span>
                    <ArrowRight size={15} />
                  </button>
                </article>

                <article className="ux-track-card">
                  <div className="ux-track-meta">
                    <span className="bc-tabular">03</span>
                    <span>Harness Engineering · LLM Lifecycle · ChatGPT/Claude &amp; vLLM</span>
                  </div>
                  <h3>Harness Engineering &amp; Frontier LLM Masterclass</h3>
                  <p>
                    Master deterministic Agent Harness Engineering (DFD, 3 production case studies,
                    Pass^k virtual simulator &amp; live runtime) alongside the full LLM Lifecycle,
                    Trained vs. Untrained Lab, ML Models, and ChatGPT/Claude/vLLM internals.
                  </p>
                  <button
                    type="button"
                    className="ux-track-cta"
                    onClick={() => {
                      setFrontierOpsTab('harness')
                      navigateWorkspace('frontier-ops')
                    }}
                  >
                    <span>Open Harness Engineering &amp; Frontier</span>
                    <ArrowRight size={15} />
                  </button>
                </article>

                <article className="ux-track-card">
                  <div className="ux-track-meta">
                    <span className="bc-tabular">04</span>
                    <span>Complete blueprint · 12 stages · 93 lessons</span>
                  </div>
                  <h3>12-Stage Production Curriculum</h3>
                  <p>
                    Deep progression from linear algebra and classical ML through RAG, multi-agent
                    orchestration, MCP/A2A/ACP protocols, MLOps, security, and capstone defense—with
                    live DFD + simulator inside every lesson.
                  </p>
                  <button
                    type="button"
                    className="ux-track-cta"
                    onClick={() => navigateWorkspace('curriculum')}
                  >
                    <span>Explore All 12 Stages</span>
                    <ArrowRight size={15} />
                  </button>
                </article>
              </div>
            </section>

            {/* Quick Stage Jump Index */}
            <section className="ux-stage-index" aria-label="12-stage curriculum index">
              <div className="ux-section-intro">
                <h2>The 12-Stage Curriculum Map</h2>
                <p>Jump straight into any stage to explore its modules, interactive labs, and lessons.</p>
              </div>
              <div className="ux-stage-map-grid">
                {curriculum.map((stage, idx) => {
                  const stageLessons = stage.modules.flatMap(m => m.lessons)
                  const stageDone = stageLessons.filter(l => completed.includes(l.id)).length
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      className="ux-stage-map-item"
                      onClick={() => openStage(stage.id)}
                    >
                      <span className="ux-stage-map-num bc-tabular">
                        Stage {String(idx + 1).padStart(2, '0')}
                      </span>
                      <strong>{stage.title}</strong>
                      <small className="bc-tabular">
                        {stageLessons.length} lessons · {stageDone} done
                      </small>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Unifying End-to-End Request Architecture Mental Model */}
            <div id="system-flow">
              <ArchitectureFlow />
            </div>
          </div>
        )}

        {/* ================================================================
            WORKSPACE 2: VIRTUAL LAB, LIVE RUN ENV & ALL SIMULATORS WALL
        ================================================================= */}
        {workspace === 'vlab' && (
          <div className="ux-workspace-view">
            <VirtualLabWorkspace
              onOpenFrontier={() => {
                setFrontierOpsTab('frontier')
                navigateWorkspace('frontier-ops')
              }}
              onOpenProduction={() => {
                setFrontierOpsTab('labs')
                navigateWorkspace('frontier-ops')
              }}
              onOpenCurriculumStage={openStage}
            />
          </div>
        )}

        {/* ================================================================
            WORKSPACE 3: GUIDED VISUAL STUDIO (DS & DE SERIAL + AI FOUNDATIONS)
        ================================================================= */}
        {workspace === 'studio' && (
          <div className="ux-workspace-view">
            <div className="ux-prod-switch-bar">
              <div>
                <div className="bc-meta-line">
                  <span>Visualized Serial Study Studio</span>
                  <span aria-hidden="true">·</span>
                  <span>Animated DFDs, Virtual Simulators &amp; Live Code Playgrounds</span>
                </div>
                <h2>Guided Visual Learning &amp; Senior DS / DE Serial Track</h2>
              </div>
              <div className="bc-segmented" role="tablist" aria-label="Guided studio track">
                <button
                  type="button"
                  role="tab"
                  aria-selected={studioTrack === 'ds-de'}
                  className={studioTrack === 'ds-de' ? 'active' : ''}
                  onClick={() => setStudioTrack('ds-de')}
                >
                  Senior DS &amp; DE Serial Track (6 Chapters)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={studioTrack === 'foundations'}
                  className={studioTrack === 'foundations' ? 'active' : ''}
                  onClick={() => setStudioTrack('foundations')}
                >
                  AI Foundations Visual Studio (12 Topics)
                </button>
              </div>
            </div>

            {studioTrack === 'ds-de' ? (
              <DataScienceEngineeringStudio onLaunchVirtualLab={() => navigateWorkspace('vlab')} />
            ) : (
              <InteractiveCurriculumModule />
            )}
          </div>
        )}

        {/* ================================================================
            WORKSPACE 3: FULL 12-STAGE CURRICULUM EXPLORER (93 LESSONS)
        ================================================================= */}
        {workspace === 'curriculum' && (
          <div className="ux-workspace-view" id="full-curriculum">
            <header className="ux-view-banner">
              <div>
                <div className="bc-meta-line">
                  <span>Complete Learning Blueprint</span>
                  <span aria-hidden="true">·</span>
                  <span>{curriculum.length} Stages</span>
                  <span aria-hidden="true">·</span>
                  <span>{total} Lessons</span>
                  <span aria-hidden="true">·</span>
                  <span className="bc-tabular">{completed.length} Completed</span>
                </div>
                <h2>12-Stage AI Systems Curriculum</h2>
                <p>
                  Select any stage on the left, filter by completion or bookmarks, launch stage-wide
                  visual labs on demand, or click any lesson to open its full 3-tab interactive studio.
                </p>
              </div>
              <div className="ux-filter-row" role="tablist" aria-label="Filter lessons">
                {(
                  [
                    { id: 'all', label: `All (${total})` },
                    { id: 'remaining', label: `Remaining (${total - completed.length})` },
                    { id: 'completed', label: `Done (${completed.length})` },
                    { id: 'bookmarked', label: `Saved (${bookmarks.length})` }
                  ] as { id: LessonFilter; label: string }[]
                ).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={lessonFilter === tab.id}
                    className={`ux-filter-btn ${lessonFilter === tab.id ? 'active' : ''}`}
                    onClick={() => setLessonFilter(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="content-grid">
              <aside className="sidebar">
                <div className="side-heading">
                  <span>Curriculum Stages</span>
                  <span className="bc-tabular">
                    {filtered.length} / {curriculum.length}
                  </span>
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search topics, tools, labs..."
                  />
                  {query && (
                    <button
                      type="button"
                      className="clear-search"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>

                <nav aria-label="Curriculum stages">
                  {filtered.map(s => {
                    const idx = curriculum.findIndex(x => x.id === s.id) + 1
                    const sLessons = s.modules.flatMap(m => m.lessons)
                    const sDone = sLessons.filter(l => completed.includes(l.id)).length
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`stage-link ${active.id === s.id ? 'selected' : ''}`}
                        onClick={() => setActiveStage(s.id)}
                      >
                        <span className="stage-num bc-tabular">{String(idx).padStart(2, '0')}</span>
                        <span className="ux-stage-link-body">
                          <span>{s.title}</span>
                          <small className="bc-tabular">
                            {sDone}/{sLessons.length}
                          </small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    )
                  })}
                </nav>

                <div className="sidebar-foot">
                  <span className="bc-tabular">
                    <Bookmark size={13} /> {bookmarks.length} saved
                  </span>
                  <span className="bc-tabular">
                    <CircleCheck size={13} /> {completed.length} completed
                  </span>
                </div>
              </aside>

              <section className="main-panel">
                <div className="stage-heading">
                  <div>
                    <div className="bc-meta-line">
                      <span>Stage {String(stageNumber).padStart(2, '0')}</span>
                      <span aria-hidden="true">·</span>
                      <span>Learning Path</span>
                    </div>
                    <h2>{active.title}</h2>
                    <p>{active.outcome}</p>
                  </div>
                  <div className="stage-icon">
                    <Cpu size={24} />
                  </div>
                </div>

                {/* Collapsible, Zero-Clutter Stage Lab Launcher */}
                <StageLabsDrawer stageId={active.id} />

                {/* Stage Modules & Lessons */}
                {active.modules.map((m, mi) => {
                  const isOpen = shouldExpandModule(m.id)
                  const doneCount = m.lessons.filter(l => completed.includes(l.id)).length
                  return (
                    <article className="module" key={m.id}>
                      <button
                        type="button"
                        className="module-head"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setExpanded(v =>
                            v.includes(m.id) ? v.filter(x => x !== m.id) : [...v, m.id]
                          )
                        }
                      >
                        <div className="module-index bc-tabular">{String(mi + 1).padStart(2, '0')}</div>
                        <div className="module-title">
                          <h3>{m.title}</h3>
                          <p>{m.description}</p>
                          <span className="bc-tabular">
                            {m.lessons.length} lessons · {doneCount} completed
                          </span>
                        </div>
                        <ChevronRight className={isOpen ? 'rotate' : ''} size={18} />
                      </button>

                      {isOpen && (
                        <div className="lesson-list">
                          {m.lessons.map(l => (
                            <div
                              className={`lesson ${completed.includes(l.id) ? 'lesson-complete' : ''}`}
                              key={l.id}
                            >
                              <button
                                type="button"
                                className={`check ${completed.includes(l.id) ? 'done' : ''}`}
                                onClick={() => toggle(l.id)}
                                aria-label={
                                  completed.includes(l.id)
                                    ? 'Mark lesson incomplete'
                                    : 'Mark lesson complete'
                                }
                              >
                                {completed.includes(l.id) ? <CircleCheck size={18} /> : <span />}
                              </button>

                              <button
                                type="button"
                                className="lesson-open"
                                onClick={() => setSelectedLesson(l)}
                              >
                                <div className="lesson-body">
                                  <strong>{l.title}</strong>
                                  <p>{l.depth}</p>
                                  <div className="lab">
                                    <Code2 size={14} />
                                    <span>Lab</span>
                                    {l.lab}
                                  </div>
                                </div>
                              </button>

                              <button
                                type="button"
                                className={`bookmark-btn ${bookmarks.includes(l.id) ? 'saved' : ''}`}
                                onClick={() => toggleBookmark(l.id)}
                                aria-label={
                                  bookmarks.includes(l.id) ? 'Remove bookmark' : 'Bookmark lesson'
                                }
                              >
                                <Bookmark
                                  size={16}
                                  fill={bookmarks.includes(l.id) ? 'currentColor' : 'none'}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  )
                })}

                {active.modules.length === 0 && (
                  <div className="empty-state">
                    <Search size={24} />
                    <strong>No matching lessons in this view</strong>
                    <p>Try clearing your search query or switching back to All lessons.</p>
                    <button
                      type="button"
                      className="bc-btn-secondary"
                      onClick={() => {
                        setQuery('')
                        setLessonFilter('all')
                      }}
                    >
                      Reset Filters
                    </button>
                  </div>
                )}

                <div className="note">
                  <ShieldCheck size={18} />
                  <div>
                    <strong>Engineering standard</strong>
                    <p>
                      Every lesson pairs plain-English intuition, worked examples, live animated
                      Mermaid DFDs, a With-vs-Without virtual simulator, production best practices,
                      starter code, and assessment verification.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ================================================================
            WORKSPACE 5: FRONTIER LLM, vLLM, PRODUCTION LABS & INTERVIEWS
        ================================================================= */}
        {workspace === 'frontier-ops' && (
          <div className="ux-workspace-view">
            <div className="ux-prod-switch-bar">
              <div>
                <div className="bc-meta-line">
                  <span>Frontier Architecture &amp; Applied Operations</span>
                  <span aria-hidden="true">·</span>
                  <span>Deep Internals, Fault Injection &amp; Career Defense</span>
                </div>
                <h2>Frontier LLMs, Production Failure Labs &amp; Senior Interviews</h2>
              </div>
              <div className="bc-segmented" role="tablist" aria-label="Frontier and operations mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={frontierOpsTab === 'harness'}
                  className={frontierOpsTab === 'harness' ? 'active' : ''}
                  onClick={() => setFrontierOpsTab('harness')}
                >
                  Harness Engineering (6)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={frontierOpsTab === 'llm-masterclass'}
                  className={frontierOpsTab === 'llm-masterclass' ? 'active' : ''}
                  onClick={() => setFrontierOpsTab('llm-masterclass')}
                >
                  LLM Lifecycle &amp; ML Models (5)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={frontierOpsTab === 'frontier'}
                  className={frontierOpsTab === 'frontier' ? 'active' : ''}
                  onClick={() => setFrontierOpsTab('frontier')}
                >
                  ChatGPT, Claude &amp; vLLM (4)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={frontierOpsTab === 'labs'}
                  className={frontierOpsTab === 'labs' ? 'active' : ''}
                  onClick={() => setFrontierOpsTab('labs')}
                >
                  Production Failure Labs (4)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={frontierOpsTab === 'interviews'}
                  className={frontierOpsTab === 'interviews' ? 'active' : ''}
                  onClick={() => setFrontierOpsTab('interviews')}
                >
                  Senior Interviews (5)
                </button>
              </div>
            </div>

            {frontierOpsTab === 'harness' && (
              <HarnessEngineeringStudio onLaunchVirtualLab={() => navigateWorkspace('vlab')} />
            )}
            {frontierOpsTab === 'llm-masterclass' && (
              <LLMDevelopmentMasterclass onLaunchVirtualLab={() => navigateWorkspace('vlab')} />
            )}
            {frontierOpsTab === 'frontier' && <FrontierArchitectureDeepDive />}
            {frontierOpsTab === 'labs' && <ProductionLabs/>}
            {frontierOpsTab === 'interviews' && <AgenticInterviewStudio />}
          </div>
        )}
      </main>

      <footer className="ux-footer">
        <div className="ux-footer-inner">
          <span>AI Engineering Academy · Independent Curriculum Platform</span>
          <div className="ux-footer-links">
            <button type="button" onClick={() => navigateWorkspace('vlab')}>
              Virtual Lab
            </button>
            <button type="button" onClick={() => navigateWorkspace('studio')}>
              Guided Studio
            </button>
            <button type="button" onClick={() => navigateWorkspace('curriculum')}>
              12-Stage Path
            </button>
            <button type="button" onClick={() => navigateWorkspace('frontier-ops')}>
              Frontier &amp; Ops
            </button>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          REDESIGNED 3-TAB GUIDED LESSON WORKSPACE MODAL (1040px WIDE)
      ===================================================================== */}
      {selectedLesson && (
        <div
          className="lesson-overlay"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSelectedLesson(null)
          }}
        >
          <section
            className="lesson-detail ux-lesson-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-title"
          >
            <header className="detail-header">
              <div>
                <div className="bc-meta-line">
                  <GraduationCap size={14} />
                  <span>Guided Lesson Workspace</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedLesson.id.replace(':', ' / ')}</span>
                </div>
                <h2 id="lesson-title">{selectedLesson.title}</h2>
                <p>{selectedLesson.depth}</p>
              </div>
              <button
                type="button"
                className="close-detail"
                onClick={() => setSelectedLesson(null)}
                aria-label="Close lesson"
              >
                <X size={18} />
              </button>
            </header>

            {/* Focused 3-Tab Lesson Navigation */}
            <div className="ux-modal-tabs" role="tablist" aria-label="Lesson workspace sections">
              <button
                type="button"
                role="tab"
                aria-selected={modalTab === 'learn'}
                className={modalTab === 'learn' ? 'active' : ''}
                onClick={() => setModalTab('learn')}
              >
                <BookOpen size={15} />
                <span>01. Concept, DFD &amp; Simulator</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={modalTab === 'practice'}
                className={modalTab === 'practice' ? 'active' : ''}
                onClick={() => setModalTab('practice')}
              >
                <Code2 size={15} />
                <span>02. Hands-On Lab &amp; Code</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={modalTab === 'assess'}
                className={modalTab === 'assess' ? 'active' : ''}
                onClick={() => setModalTab('assess')}
              >
                <Sliders size={15} />
                <span>03. Assessment &amp; Reflection</span>
              </button>
            </div>

            <div className="detail-scroll">
              {modalTab === 'learn' && (
                <>
                  <div className="detail-lab">
                    <Workflow size={18} />
                    <div>
                      <span>Hands-on lab target</span>
                      <strong>{selectedLesson.lab}</strong>
                    </div>
                  </div>

                  <div className="ux-lesson-two-col">
                    <section className="detail-section">
                      <h3>
                        <Target size={16} /> Learning objectives
                      </h3>
                      <ul>
                        {selectedLesson.objectives.map(x => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="detail-section">
                      <h3>
                        <Layers3 size={16} /> Prerequisites
                      </h3>
                      <ul>
                        {selectedLesson.prerequisites.map(x => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <section className="detail-section">
                    <h3>01. Build intuition</h3>
                    <p>{selectedLesson.intuition}</p>
                  </section>

                  <section className="detail-section">
                    <h3>02. Worked example</h3>
                    <p>{selectedLesson.workedExample}</p>
                  </section>

                  <TopicLearningStudio lesson={selectedLesson}/>
                </>
              )}

              {modalTab === 'practice' && (
                <>
                  <LessonPractice lesson={selectedLesson}/>
                  <section className="detail-section">
                    <h3>Practice exercises</h3>
                    <ol>
                      {selectedLesson.exercises.map(x => (
                        <li key={x}>{x}</li>
                      ))}
                    </ol>
                  </section>
                  <section className="detail-section">
                    <h3>Production engineering note</h3>
                    <p>{selectedLesson.productionNote}</p>
                  </section>
                </>
              )}

              {modalTab === 'assess' && (
                <>
                  <AssessmentEngine key={selectedLesson.id} lesson={selectedLesson} />
                  <section className="detail-section assessment">
                    <h3>Mastery assessment criteria</h3>
                    <p>{selectedLesson.assessment}</p>
                  </section>
                  <StudentReflection key={selectedLesson.id} lesson={selectedLesson} />
                </>
              )}
            </div>

            <footer className="detail-footer">
              <button
                type="button"
                className="secondary-action"
                onClick={() => toggleBookmark(selectedLesson.id)}
              >
                <Bookmark
                  size={15}
                  fill={bookmarks.includes(selectedLesson.id) ? 'currentColor' : 'none'}
                />
                <span>{bookmarks.includes(selectedLesson.id) ? 'Bookmarked' : 'Save Bookmark'}</span>
              </button>

              <div className="ux-modal-footer-right">
                {modalTab !== 'assess' && (
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => setModalTab(modalTab === 'learn' ? 'practice' : 'assess')}
                  >
                    <span>
                      {modalTab === 'learn' ? 'Next: Hands-On Lab' : 'Next: Assessment'}
                    </span>
                    <ArrowRight size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => toggle(selectedLesson.id)}
                >
                  {completed.includes(selectedLesson.id) ? (
                    <>
                      <Check size={16} /> Completed
                    </>
                  ) : (
                    <>
                      <CircleCheck size={16} /> Mark Complete
                    </>
                  )}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  )
}
