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
  GraduationCap,
  Layers3,
  Menu,
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
import VirtualLabWorkspace from './components/VirtualLabWorkspace'
import LLMDevelopmentMasterclass from './components/LLMDevelopmentMasterclass'
import DataScienceEngineeringStudio from './components/DataScienceEngineeringStudio'
import HarnessEngineeringStudio from './components/HarnessEngineeringStudio'
import MLRoadmap2026Studio from './components/MLRoadmap2026Studio'
import BuildAiSystemsStudio from './components/BuildAiSystemsStudio'
import AtlasLessonShell from './components/AtlasLessonShell'

type WorkspaceView = 'overview' | 'vlab' | 'studio' | 'curriculum' | 'frontier-ops'
type StudioTrack = 'ml-2026' | 'ds-de' | 'foundations'
type FrontierOpsTab = 'build-ai' | 'harness' | 'llm-masterclass' | 'frontier' | 'labs' | 'interviews'
type LessonFilter = 'all' | 'remaining' | 'completed' | 'bookmarked'
type ModalTab = 'learn' | 'practice' | 'assess'

const WORKSPACE_NAV_ITEMS: { id: WorkspaceView; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'vlab', label: 'Virtual Lab' },
  { id: 'studio', label: 'Guided Studio' },
  { id: 'curriculum', label: '12-Stage Path' },
  { id: 'frontier-ops', label: 'Frontier & Ops' }
]

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
  const [studioTrack, setStudioTrack] = useState<StudioTrack>('ml-2026')
  const [frontierOpsTab, setFrontierOpsTab] = useState<FrontierOpsTab>('build-ai')
  const [query, setQuery] = useState('')
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>('all')
  const [completed, setCompleted] = useState<string[]>(() => readList('ai-academy.completed.v1'))
  const [bookmarks, setBookmarks] = useState<string[]>(() => readList('ai-academy.bookmarks.v1'))
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [atlasLessonId, setAtlasLessonId] = useState<string>(curriculum[0].modules[0].lessons[0].id)
  const [modalTab, setModalTab] = useState<ModalTab>('learn')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    persistList('ai-academy.completed.v1', completed)
  }, [completed])
  useEffect(() => {
    persistList('ai-academy.bookmarks.v1', bookmarks)
  }, [bookmarks])

  useEffect(() => {
    if (selectedLesson) setModalTab('learn')
  }, [selectedLesson?.id])

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileNavOpen])

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

  const total = allLessons.length
  const progress = Math.round((completed.length / total) * 100)
  const moduleCount = curriculum.reduce((n, s) => n + s.modules.length, 0)

  const toggle = (id: string) =>
    setCompleted(v => (v.includes(id) ? v.filter(x => x !== id) : [...v, id]))
  const toggleBookmark = (id: string) =>
    setBookmarks(v => (v.includes(id) ? v.filter(x => x !== id) : [...v, id]))

  const navigateWorkspace = (next: WorkspaceView) => {
    setWorkspace(next)
    setMobileNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeAtlasMeta = useMemo(() => {
    for (let sIdx = 0; sIdx < curriculum.length; sIdx++) {
      const st = curriculum[sIdx]
      for (const mod of st.modules) {
        const found = mod.lessons.find(l => l.id === atlasLessonId)
        if (found) {
          return { lesson: found, stage: st, moduleTitle: mod.title, stageIndex: sIdx + 1 }
        }
      }
    }
    const fallbackStage = curriculum[0]
    const fallbackMod = fallbackStage.modules[0]
    return {
      lesson: fallbackMod.lessons[0],
      stage: fallbackStage,
      moduleTitle: fallbackMod.title,
      stageIndex: 1
    }
  }, [atlasLessonId])

  const openAtlasLesson = (lesson: Lesson) => {
    setAtlasLessonId(lesson.id)
    navigateWorkspace('curriculum')
  }

  const openStage = (stageId: string) => {
    const stageObj = curriculum.find(s => s.id === stageId)
    if (stageObj?.modules[0]?.lessons[0]) {
      setAtlasLessonId(stageObj.modules[0].lessons[0].id)
    }
    navigateWorkspace('curriculum')
  }

  return (
    <div className="app-shell">
      {/* Strict 3-Zone Top Navigation Bar + Responsive Mobile Toggle */}
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
          {WORKSPACE_NAV_ITEMS.map(item => (
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

        <button
          type="button"
          className="ux-mobile-menu-btn"
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-workspace-drawer"
          aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMobileNavOpen(v => !v)}
        >
          {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
          <span>{mobileNavOpen ? 'Close' : 'Menu'}</span>
        </button>
      </header>

      {mobileNavOpen && (
        <nav
          id="mobile-workspace-drawer"
          className="ux-mobile-drawer"
          aria-label="Mobile workspace navigation"
        >
          <div className="ux-mobile-drawer-list">
            {WORKSPACE_NAV_ITEMS.map(item => (
              <button
                key={item.id}
                type="button"
                className={`ux-mobile-nav-item ${workspace === item.id ? 'active' : ''}`}
                aria-current={workspace === item.id ? 'page' : undefined}
                onClick={() => navigateWorkspace(item.id)}
              >
                <span>{item.label}</span>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="bc-btn-primary ux-mobile-cta"
            onClick={() => navigateWorkspace('vlab')}
          >
            Run Virtual Lab
          </button>
        </nav>
      )}

      <main className={`ux-main ${workspace === 'curriculum' ? 'ux-main-atlas' : ''}`}>
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
                  onClick={() => {
                    setStudioTrack('ml-2026')
                    navigateWorkspace('studio')
                  }}
                >
                  <span>Open ML Roadmap 2026 (16 Tracks)</span>
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
                onClick={() => openAtlasLesson(nextRecommendedLesson)}
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
                    <span>16 Tracks · 157 Audited Topics · Animated DFDs &amp; Simulators</span>
                  </div>
                  <h3>Machine Learning Roadmap 2026 &amp; DS / DE Visual Studio</h3>
                  <p>
                    Complete audited coverage of Python, Math, Preprocessing, Classical ML, Deep
                    Learning, Frameworks, CV, NLP, GenAI/LLMs, RL, MLOps, Cloud Deployment, and 14
                    Real-World Projects—plus the 6-chapter Senior DS &amp; DE Serial Track.
                  </p>
                  <button
                    type="button"
                    className="ux-track-cta"
                    onClick={() => {
                      setStudioTrack('ml-2026')
                      navigateWorkspace('studio')
                    }}
                  >
                    <span>Open ML Roadmap 2026 Studio</span>
                    <ArrowRight size={15} />
                  </button>
                </article>

                <article className="ux-track-card">
                  <div className="ux-track-meta">
                    <span className="bc-tabular">03</span>
                    <span>Build ChatGPT, Claude &amp; Copilot · Transformers · RAG · MCP · ACP</span>
                  </div>
                  <h3>Build ChatGPT, Claude &amp; Copilot + Frontier AI Architecture</h3>
                  <p>
                    Complete Python/TypeScript code, simple-English Transformer deep dives, animated
                    Model + RAG + MCP + ACP data-flow diagrams, unified virtual architect playground,
                    Harness Engineering, and vLLM serving internals.
                  </p>
                  <button
                    type="button"
                    className="ux-track-cta"
                    onClick={() => {
                      setFrontierOpsTab('build-ai')
                      navigateWorkspace('frontier-ops')
                    }}
                  >
                    <span>Build ChatGPT, Claude &amp; Copilot</span>
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
            WORKSPACE 3: GUIDED VISUAL STUDIO (ML ROADMAP 2026 + DS/DE + FOUNDATIONS)
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
                <h2>Machine Learning Roadmap 2026 &amp; Guided Visual Studios</h2>
              </div>
              <div className="bc-segmented" role="tablist" aria-label="Guided studio track">
                <button
                  type="button"
                  role="tab"
                  aria-selected={studioTrack === 'ml-2026'}
                  className={studioTrack === 'ml-2026' ? 'active' : ''}
                  onClick={() => setStudioTrack('ml-2026')}
                >
                  ML Roadmap 2026 (16 Tracks)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={studioTrack === 'ds-de'}
                  className={studioTrack === 'ds-de' ? 'active' : ''}
                  onClick={() => setStudioTrack('ds-de')}
                >
                  Senior DS &amp; DE Serial Track (6)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={studioTrack === 'foundations'}
                  className={studioTrack === 'foundations' ? 'active' : ''}
                  onClick={() => setStudioTrack('foundations')}
                >
                  AI Foundations Visual Studio (12)
                </button>
              </div>
            </div>

            {studioTrack === 'ml-2026' && (
              <MLRoadmap2026Studio onLaunchVirtualLab={() => navigateWorkspace('vlab')} />
            )}
            {studioTrack === 'ds-de' && (
              <DataScienceEngineeringStudio onLaunchVirtualLab={() => navigateWorkspace('vlab')} />
            )}
            {studioTrack === 'foundations' && <InteractiveCurriculumModule />}
          </div>
        )}

        {/* ================================================================
            WORKSPACE 3: FULL 12-STAGE CURRICULUM EXPLORER (93 LESSONS)
        ================================================================= */}
        {workspace === 'curriculum' && (
          <div className="ux-workspace-view atlas-workspace-wrap">
            <AtlasLessonShell
              curriculum={curriculum}
              filteredCurriculum={filtered}
              activeLesson={activeAtlasMeta.lesson}
              activeStage={activeAtlasMeta.stage}
              activeModuleTitle={activeAtlasMeta.moduleTitle}
              stageIndex={activeAtlasMeta.stageIndex}
              completed={completed}
              bookmarks={bookmarks}
              query={query}
              lessonFilter={lessonFilter}
              totalLessons={total}
              onQueryChange={setQuery}
              onFilterChange={setLessonFilter}
              onSelectLesson={lesson => {
                setAtlasLessonId(lesson.id)
              }}
              onToggleComplete={toggle}
              onToggleBookmark={toggleBookmark}
              practiceNode={<LessonPractice lesson={activeAtlasMeta.lesson} />}
            />
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
                  aria-selected={frontierOpsTab === 'build-ai'}
                  className={frontierOpsTab === 'build-ai' ? 'active' : ''}
                  onClick={() => setFrontierOpsTab('build-ai')}
                >
                  Build ChatGPT, Claude &amp; Copilot (5)
                </button>
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

            {frontierOpsTab === 'build-ai' && (
              <BuildAiSystemsStudio onLaunchVirtualLab={() => navigateWorkspace('vlab')} />
            )}
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
                  <AssessmentEngine key={`modal-assess-${selectedLesson.id}`} lesson={selectedLesson} />
                  <section className="detail-section assessment">
                    <h3>Mastery assessment criteria</h3>
                    <p>{selectedLesson.assessment}</p>
                  </section>
                  <StudentReflection key={`modal-reflect-${selectedLesson.id}`} lesson={selectedLesson} />
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
