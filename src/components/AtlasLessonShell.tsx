import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  Code2,
  Compass,
  Cpu,
  Flame,
  GitBranch,
  Layers,
  ListTree,
  MessageSquareQuote,
  PanelLeftOpen,
  Scale,
  Search,
  ShieldAlert,
  Sliders,
  Target,
  X,
  XCircle
} from 'lucide-react'
import type { Lesson, Stage } from '../data/curriculum'
import { getAtlasBlueprint } from '../data/atlasLessonBlueprints'
import AtlasDiagramCard from './AtlasDiagramCard'
import TopicLearningStudio from './TopicLearningStudio'
import StageLabsDrawer from './StageLabsDrawer'
import AssessmentEngine from './AssessmentEngine'
import StudentReflection from './StudentReflection'

type LessonFilter = 'all' | 'remaining' | 'completed' | 'bookmarked'

interface AtlasLessonShellProps {
  curriculum: Stage[]
  filteredCurriculum: Stage[]
  activeLesson: Lesson
  activeStage: Stage
  activeModuleTitle: string
  stageIndex: number
  completed: string[]
  bookmarks: string[]
  query: string
  lessonFilter: LessonFilter
  totalLessons: number
  onQueryChange: (q: string) => void
  onFilterChange: (f: LessonFilter) => void
  onSelectLesson: (lesson: Lesson, stageId: string) => void
  onToggleComplete: (lessonId: string) => void
  onToggleBookmark: (lessonId: string) => void
  practiceNode: ReactNode
}

interface TocEntry {
  id: string
  label: string
  depth: 1 | 2
}

export default function AtlasLessonShell({
  curriculum,
  filteredCurriculum,
  activeLesson,
  activeStage,
  activeModuleTitle,
  stageIndex,
  completed,
  bookmarks,
  query,
  lessonFilter,
  totalLessons,
  onQueryChange,
  onFilterChange,
  onSelectLesson,
  onToggleComplete,
  onToggleBookmark,
  practiceNode
}: AtlasLessonShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expandedStages, setExpandedStages] = useState<string[]>([activeStage.id])
  const [activeSectionId, setActiveSectionId] = useState<string>('atlas-anchor')

  const blueprint = useMemo(
    () => getAtlasBlueprint(activeLesson, activeStage.title, stageIndex),
    [activeLesson, activeStage.title, stageIndex]
  )

  const allLessonRefs = useMemo(
    () =>
      curriculum.flatMap(stage =>
        stage.modules.flatMap(mod =>
          mod.lessons.map(lesson => ({
            lesson,
            stageId: stage.id,
            stageTitle: stage.title
          }))
        )
      ),
    [curriculum]
  )

  const currentIdx = allLessonRefs.findIndex(item => item.lesson.id === activeLesson.id)
  const prevRef = currentIdx > 0 ? allLessonRefs[currentIdx - 1] : null
  const nextRef = currentIdx >= 0 && currentIdx < allLessonRefs.length - 1 ? allLessonRefs[currentIdx + 1] : null

  const tocEntries = useMemo<TocEntry[]>(() => {
    const stageItems: TocEntry[] = blueprint.stages.map(st => ({
      id: `atlas-stage-${st.stageNum}`,
      label: `Stage ${st.stageNum}: ${st.title.length > 28 ? `${st.title.slice(0, 26)}...` : st.title}`,
      depth: 2
    }))

    return [
      { id: 'atlas-anchor', label: 'Hook & Scale Anchor', depth: 1 },
      { id: 'atlas-scope', label: 'Scope Boundary', depth: 2 },
      { id: 'atlas-evolution', label: '5-Stage Evolution', depth: 1 },
      ...stageItems,
      { id: 'atlas-slip', label: 'Where Candidates Slip', depth: 1 },
      { id: 'atlas-compare', label: 'Trade-Off Table', depth: 1 },
      { id: 'atlas-interview', label: 'Interview Cheat-Sheet', depth: 1 },
      { id: 'atlas-interactive', label: 'Interactive Simulator', depth: 1 },
      { id: 'atlas-lab', label: 'Hands-On Lab & Code', depth: 1 },
      { id: 'atlas-assess', label: 'Mastery Assessment', depth: 1 }
    ]
  }, [blueprint.stages])

  useEffect(() => {
    setExpandedStages(prev => (prev.includes(activeStage.id) ? prev : [...prev, activeStage.id]))
  }, [activeStage.id])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  useEffect(() => {
    setActiveSectionId('atlas-anchor')
    const ids = tocEntries.map(t => t.id)
    const elements = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0 || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0 && visible[0].target.id) {
          setActiveSectionId(visible[0].target.id)
        }
      },
      {
        rootMargin: '-90px 0px -65% 0px',
        threshold: [0, 0.2, 0.5]
      }
    )

    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [activeLesson.id, tocEntries])

  const toggleStageExpand = (stageId: string) => {
    setExpandedStages(prev =>
      prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]
    )
  }

  const handlePickLesson = (lesson: Lesson, stageId: string) => {
    onSelectLesson(lesson, stageId)
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const jumpToSection = (id: string) => {
    setActiveSectionId(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const isDone = completed.includes(activeLesson.id)
  const isSaved = bookmarks.includes(activeLesson.id)
  const difficultySlug = blueprint.difficulty.toLowerCase().replace(/[^a-z]+/g, '-')

  const renderSidebarTree = () => (
    <div className="atlas-tree-inner">
      <div className="atlas-tree-head">
        <div>
          <span className="atlas-tree-kicker">ENGINEERING ATLAS</span>
          <strong>12-Stage Curriculum</strong>
        </div>
        <span className="atlas-tree-count bc-tabular">
          {completed.length}/{totalLessons}
        </span>
      </div>

      <progress className="atlas-tree-progress" value={completed.length} max={totalLessons} />

      <label className="atlas-tree-search">
        <Search size={14} />
        <input
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Filter 93 topics, labs..."
          aria-label="Filter curriculum topics"
        />
        {query && (
          <button
            type="button"
            className="atlas-tree-clear"
            onClick={() => onQueryChange('')}
            aria-label="Clear topic filter"
          >
            <X size={13} />
          </button>
        )}
      </label>

      <div className="atlas-tree-filters" role="tablist" aria-label="Filter curriculum lessons">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'remaining', label: 'Left' },
            { id: 'completed', label: 'Done' },
            { id: 'bookmarked', label: 'Saved' }
          ] as { id: LessonFilter; label: string }[]
        ).map(f => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={lessonFilter === f.id}
            className={`atlas-filter-chip ${lessonFilter === f.id ? 'active' : ''}`}
            onClick={() => onFilterChange(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <nav className="atlas-tree-nav" aria-label="Curriculum stages and lessons">
        {filteredCurriculum.map(stage => {
          const sIdx = curriculum.findIndex(s => s.id === stage.id) + 1
          const sLessons = stage.modules.flatMap(m => m.lessons)
          const sDone = sLessons.filter(l => completed.includes(l.id)).length
          const isExpanded =
            Boolean(query.trim()) ||
            lessonFilter !== 'all' ||
            expandedStages.includes(stage.id)

          return (
            <div className="atlas-tree-stage" key={stage.id}>
              <button
                type="button"
                className={`atlas-tree-stage-btn ${stage.id === activeStage.id ? 'current-stage' : ''}`}
                aria-expanded={isExpanded}
                onClick={() => toggleStageExpand(stage.id)}
              >
                <span className="atlas-tree-chevron">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <span className="atlas-tree-stage-num bc-tabular">
                  {String(sIdx).padStart(2, '0')}
                </span>
                <span className="atlas-tree-stage-name">{stage.title}</span>
                <span className="atlas-tree-stage-ratio bc-tabular">
                  {sDone}/{sLessons.length}
                </span>
              </button>

              {isExpanded && (
                <div className="atlas-tree-modules">
                  {stage.modules.map(mod => (
                    <div className="atlas-tree-mod" key={mod.id}>
                      <div className="atlas-tree-mod-label">{mod.title}</div>
                      <ul className="atlas-tree-lessons">
                        {mod.lessons.map(lesson => {
                          const lessonDone = completed.includes(lesson.id)
                          const lessonSaved = bookmarks.includes(lesson.id)
                          const isCurrent = lesson.id === activeLesson.id

                          return (
                            <li key={lesson.id}>
                              <button
                                type="button"
                                className={`atlas-tree-lesson-btn ${isCurrent ? 'active' : ''} ${
                                  lessonDone ? 'done' : ''
                                }`}
                                aria-current={isCurrent ? 'page' : undefined}
                                onClick={() => handlePickLesson(lesson, stage.id)}
                              >
                                <span className="atlas-tree-dot" aria-hidden="true">
                                  {lessonDone ? <Check size={11} /> : <span />}
                                </span>
                                <span className="atlas-tree-lesson-title">{lesson.title}</span>
                                {lessonSaved && (
                                  <Bookmark size={11} className="atlas-tree-saved-icon" fill="currentColor" />
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {filteredCurriculum.length === 0 && (
          <div className="atlas-tree-empty">
            <p>No lessons match this filter.</p>
            <button
              type="button"
              className="atlas-ctrl-btn"
              onClick={() => {
                onQueryChange('')
                onFilterChange('all')
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </nav>
    </div>
  )

  return (
    <div className="atlas-shell" id="full-curriculum">
      {drawerOpen && (
        <div
          className="atlas-drawer-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setDrawerOpen(false)
          }}
        >
          <aside className="atlas-drawer-panel" aria-label="Curriculum navigation drawer">
            <div className="atlas-drawer-top">
              <span>Curriculum Navigator</span>
              <button
                type="button"
                className="atlas-ctrl-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close curriculum drawer"
              >
                <X size={16} />
              </button>
            </div>
            {renderSidebarTree()}
          </aside>
        </div>
      )}

      {/* COLUMN 1: LEFT COLLAPSIBLE CURRICULUM TREE */}
      <aside className="atlas-left-sidebar" aria-label="Curriculum tree">
        {renderSidebarTree()}
      </aside>

      {/* COLUMN 2: CENTER LEARNING CANVAS (max-w-3xl EDITORIAL WIDTH) */}
      <article className="atlas-center-canvas">
        <div className="atlas-article-column">
          <div className="atlas-canvas-topbar">
            <button
              type="button"
              className="atlas-mobile-tree-btn"
              onClick={() => setDrawerOpen(true)}
            >
              <PanelLeftOpen size={15} />
              <span>Curriculum ({completed.length}/{totalLessons})</span>
            </button>

            <nav className="atlas-breadcrumb" aria-label="Lesson location">
              <span className="bc-tabular">Stage {String(stageIndex).padStart(2, '0')}</span>
              <ChevronRight size={13} />
              <span>{activeStage.title}</span>
              <ChevronRight size={13} />
              <span className="atlas-crumb-mod">{activeModuleTitle}</span>
            </nav>
          </div>

          {/* STRUCTURED LESSON HEADER */}
          <header className="atlas-lesson-header">
            <div className="atlas-header-badges">
              <span className={`atlas-diff-badge diff-${difficultySlug}`}>
                <Cpu size={12} />
                {blueprint.difficulty}
              </span>
              <span className="atlas-meta-chip bc-tabular">
                <Clock size={12} />
                {blueprint.readMinutes} min read
              </span>
              <span className="atlas-meta-chip bc-tabular">
                <GitBranch size={12} />
                {blueprint.stages.length} Progressive Diagrams
              </span>
              {isDone && (
                <span className="atlas-done-badge">
                  <CheckCircle2 size={12} />
                  Mastered
                </span>
              )}
            </div>

            <h1 className="atlas-lesson-title">{activeLesson.title}</h1>
            <p className="atlas-lesson-subtitle">{activeLesson.depth}</p>

            <div className="atlas-concept-pills" aria-label="Core concepts covered">
              {blueprint.conceptPills.map(pill => (
                <span key={pill} className="atlas-concept-pill">
                  {pill}
                </span>
              ))}
            </div>

            <div className="atlas-header-actions">
              <button
                type="button"
                className={`atlas-action-primary ${isDone ? 'is-done' : ''}`}
                onClick={() => onToggleComplete(activeLesson.id)}
              >
                {isDone ? <Check size={15} /> : <CircleCheck size={15} />}
                <span>{isDone ? 'Completed' : 'Mark Lesson Complete'}</span>
              </button>
              <button
                type="button"
                className={`atlas-action-secondary ${isSaved ? 'is-saved' : ''}`}
                onClick={() => onToggleBookmark(activeLesson.id)}
              >
                <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                <span>{isSaved ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
              <button
                type="button"
                className="atlas-action-secondary"
                onClick={() => jumpToSection('atlas-lab')}
              >
                <Code2 size={14} />
                <span>Jump to Lab</span>
              </button>
            </div>
          </header>

          {/* SECTION 1: HOOK & SCALE ANCHOR + SCOPE BOUNDARY */}
          <section id="atlas-anchor" className="atlas-section">
            <div className="atlas-section-kicker sky">
              <Compass size={14} />
              <span>01 · THE HOOK &amp; SCALE ANCHOR</span>
            </div>
            <h2>{blueprint.anchor.title}</h2>
            <p className="atlas-prose">{blueprint.anchor.analogy}</p>

            <div className="atlas-scale-grid">
              {blueprint.anchor.scaleMetrics.map(metric => (
                <div className="atlas-scale-card" key={metric.label}>
                  <span className="atlas-scale-label">{metric.label}</span>
                  <strong className="atlas-scale-value bc-tabular">{metric.value}</strong>
                  <small className="atlas-scale-note">{metric.note}</small>
                </div>
              ))}
            </div>

            <div id="atlas-scope" className="atlas-scope-callout">
              <div className="atlas-scope-head">
                <Target size={15} />
                <strong>Scope Boundary — What We Build vs. What We Skip</strong>
              </div>
              <div className="atlas-scope-grid">
                <div className="atlas-scope-col in-scope">
                  <div className="atlas-scope-col-title">
                    <CheckCircle2 size={14} />
                    <span>In Scope (Built Here)</span>
                  </div>
                  <ul>
                    {blueprint.scopeBoundary.inScope.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="atlas-scope-col out-scope">
                  <div className="atlas-scope-col-title">
                    <XCircle size={14} />
                    <span>Out of Scope (Skipped Here)</span>
                  </div>
                  <ul>
                    {blueprint.scopeBoundary.outOfScope.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: 5 PROGRESSIVE ARCHITECTURE STAGES */}
          <section id="atlas-evolution" className="atlas-section">
            <div className="atlas-section-kicker indigo">
              <Layers size={14} />
              <span>02 · 5 PROGRESSIVE ARCHITECTURE STAGES</span>
            </div>
            <h2>Evolving {activeLesson.title} One Bottleneck at a Time</h2>
            <p className="atlas-prose">
              Each stage solves one physical constraint, traces a single request from left to right,
              and names the exact failure mode that forces the next architecture upgrade.
            </p>

            <div className="atlas-stages-stack">
              {blueprint.stages.map(stage => (
                <div
                  key={stage.stageNum}
                  id={`atlas-stage-${stage.stageNum}`}
                  className="atlas-stage-block"
                >
                  <div className="atlas-stage-head">
                    <span className="atlas-stage-pill bc-tabular">
                      Stage {stage.stageNum} of {blueprint.stages.length}
                    </span>
                    <h3>{stage.title}</h3>
                  </div>

                  <div className="atlas-req-banner">
                    <span className="atlas-req-label">Stage Goal</span>
                    <p>{stage.stageGoal}</p>
                  </div>

                  <AtlasDiagramCard
                    figureNumber={`Fig. ${stage.stageNum}`}
                    stageLabel={`Stage ${stage.stageNum}`}
                    title={stage.title}
                    syntax={stage.mermaid}
                    diagramType="flowchart"
                    nodeLabels={stage.nodeLabels}
                    architecturalRule={stage.architecturalRule}
                  />

                  <div className="atlas-trace-block">
                    <div className="atlas-trace-label">How a Single Request Flows (Left to Right)</div>
                    {stage.howItWorks.map((para, pIdx) => (
                      <p key={pIdx} className="atlas-prose">
                        {para}
                      </p>
                    ))}
                  </div>

                  {stage.breaksUnderLoad && (
                    <div className="atlas-breaks-callout" role="note">
                      <div className="atlas-breaks-title">
                        <Flame size={15} />
                        <span>Where Stage {stage.stageNum} Breaks Under Load</span>
                      </div>
                      <p>{stage.breaksUnderLoad}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3: WHERE CANDIDATES SLIP (3 ANTI-PATTERNS) */}
          <section id="atlas-slip" className="atlas-section">
            <div className="atlas-section-kicker amber">
              <ShieldAlert size={14} />
              <span>03 · WHERE CANDIDATES SLIP</span>
            </div>
            <h2>3 Anti-Patterns &amp; Exact Failure Modes Under Load</h2>

            <div className="atlas-slip-list">
              {blueprint.whereCandidatesSlip.map((item, idx) => (
                <div className="atlas-slip-card" key={idx}>
                  <div className="atlas-slip-mistake">
                    <AlertTriangle size={15} />
                    <strong>{item.boldMistake}</strong>
                  </div>
                  <p className="atlas-slip-why">{item.failureUnderLoad}</p>
                  <p className="atlas-slip-fix">
                    <CheckCircle2 size={14} />
                    <span>Fix:</span> {item.fix}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 4: POINT-TO-POINT COMPARISON TABLE */}
          <section id="atlas-compare" className="atlas-section">
            <div className="atlas-section-kicker sky">
              <Scale size={14} />
              <span>04 · POINT-TO-POINT TRADE-OFF COMPARISON</span>
            </div>
            <h2>{blueprint.comparisonTable.title}</h2>

            <div className="atlas-table-wrap">
              <table className="atlas-compare-table">
                <thead>
                  <tr>
                    <th>Design Option</th>
                    <th>Throughput</th>
                    <th>Latency</th>
                    <th>Complexity</th>
                    <th>Primary Failure Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {blueprint.comparisonTable.rows.map(row => (
                    <tr key={row.option}>
                      <td className="atlas-td-option">{row.option}</td>
                      <td className="atlas-td-mono bc-tabular">{row.throughput}</td>
                      <td className="atlas-td-mono bc-tabular">{row.latency}</td>
                      <td>{row.complexity}</td>
                      <td className="atlas-td-risk">{row.failureMode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 5: INTERVIEW CHEAT-SHEET (3 VERBATIM QUOTES) */}
          <section id="atlas-interview" className="atlas-section">
            <div className="atlas-section-kicker emerald">
              <MessageSquareQuote size={14} />
              <span>05 · INTERVIEW CHEAT-SHEET</span>
            </div>
            <h2>What to Say Verbatim at the Whiteboard</h2>

            <div className="atlas-interview-grid">
              {blueprint.interviewQuotes.map((item, qIdx) => (
                <div className="atlas-interview-box" key={qIdx}>
                  <div className="atlas-interview-head">
                    <MessageSquareQuote size={15} />
                    <span>{item.prompt}</span>
                  </div>
                  <blockquote className="atlas-interview-quote">{item.quote}</blockquote>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 6: INTERACTIVE SIMULATOR & LIVE PLAYGROUND */}
          <section id="atlas-interactive" className="atlas-section">
            <div className="atlas-section-kicker indigo">
              <BookOpen size={14} />
              <span>06 · INTERACTIVE SIMULATOR &amp; LIVE DFD PLAYGROUND</span>
            </div>
            <h2>With-vs-Without Virtual Architecture Simulator</h2>
            <p className="atlas-prose">{activeLesson.intuition}</p>
            <div className="atlas-worked-box">
              <strong>Worked Numerical Walkthrough</strong>
              <p>{activeLesson.workedExample}</p>
            </div>

            <StageLabsDrawer stageId={activeStage.id} />
            <TopicLearningStudio lesson={activeLesson} />
          </section>

          {/* SECTION 7: HANDS-ON LAB & CODE PRACTICE */}
          <section id="atlas-lab" className="atlas-section">
            <div className="atlas-section-kicker emerald">
              <Code2 size={14} />
              <span>07 · HANDS-ON LAB &amp; PRODUCTION CODE</span>
            </div>
            <h2>Lab Target: {activeLesson.lab}</h2>

            {practiceNode}

            <div className="atlas-exercises-card">
              <h3>Engineering Practice Exercises</h3>
              <ol>
                {activeLesson.exercises.map(ex => (
                  <li key={ex}>{ex}</li>
                ))}
              </ol>
            </div>

            <div className="atlas-prod-note">
              <strong>Production Hardening Note</strong>
              <p>{activeLesson.productionNote}</p>
            </div>
          </section>

          {/* SECTION 8: MASTERY ASSESSMENT & REFLECTION */}
          <section id="atlas-assess" className="atlas-section">
            <div className="atlas-section-kicker sky">
              <Sliders size={14} />
              <span>08 · MASTERY VERIFICATION &amp; REFLECTION</span>
            </div>
            <h2>Verify Mastery of {activeLesson.title}</h2>

            <AssessmentEngine key={`assess-${activeLesson.id}`} lesson={activeLesson} />

            <div className="atlas-mastery-rubric">
              <strong>Pass Rubric</strong>
              <p>{activeLesson.assessment}</p>
            </div>

            <StudentReflection key={`reflect-${activeLesson.id}`} lesson={activeLesson} />
          </section>

          {/* NEXT / PREVIOUS LESSON FOOTER */}
          <nav className="atlas-pager" aria-label="Lesson sequence navigation">
            {prevRef ? (
              <button
                type="button"
                className="atlas-pager-btn prev"
                onClick={() => handlePickLesson(prevRef.lesson, prevRef.stageId)}
              >
                <ArrowLeft size={16} />
                <div>
                  <span>Previous Lesson</span>
                  <strong>{prevRef.lesson.title}</strong>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextRef && (
              <button
                type="button"
                className="atlas-pager-btn next"
                onClick={() => handlePickLesson(nextRef.lesson, nextRef.stageId)}
              >
                <div>
                  <span>Next Lesson</span>
                  <strong>{nextRef.lesson.title}</strong>
                </div>
                <ArrowRight size={16} />
              </button>
            )}
          </nav>
        </div>
      </article>

      {/* COLUMN 3: RIGHT STICKY OUTLINE ("ON THIS PAGE" TOC) */}
      <aside className="atlas-right-toc" aria-label="On this page outline">
        <div className="atlas-toc-sticky">
          <div className="atlas-toc-head">
            <ListTree size={14} />
            <span>On This Page</span>
          </div>

          <ul className="atlas-toc-list">
            {tocEntries.map(entry => (
              <li key={entry.id} className={entry.depth === 2 ? 'depth-2' : 'depth-1'}>
                <button
                  type="button"
                  className={`atlas-toc-link ${activeSectionId === entry.id ? 'active' : ''}`}
                  onClick={() => jumpToSection(entry.id)}
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="atlas-toc-footer">
            <div className="atlas-toc-status">
              <span>Lesson Status</span>
              <strong className={isDone ? 'done' : ''}>
                {isDone ? 'Completed' : 'In Progress'}
              </strong>
            </div>
            <button
              type="button"
              className={`atlas-toc-complete-btn ${isDone ? 'is-done' : ''}`}
              onClick={() => onToggleComplete(activeLesson.id)}
            >
              {isDone ? <Check size={14} /> : <CircleCheck size={14} />}
              <span>{isDone ? 'Marked Complete' : 'Mark Complete'}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
