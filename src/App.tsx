import { useEffect, useMemo, useState } from 'react'
import { BrainCircuit, Bookmark, Check, ChevronRight, CircleCheck, Code2, Cpu, GitBranch, Search, ShieldCheck, Sparkles, Workflow, X, GraduationCap, Target, Layers3 } from 'lucide-react'
import { curriculum, type Lesson } from './data/curriculum'
import MathLabs from './components/MathLabs'
import MLLabs from './components/MLLabs'
import TransformerLabs from './components/TransformerLabs'
import RAGLabs from './components/RAGLabs'
import LessonPractice from './components/LessonPractice'

const readList = (key: string): string[] => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as string[] : [] } catch { return [] }
}

export default function App() {
  const [query, setQuery] = useState('')
  const [activeStage, setActiveStage] = useState(curriculum[0].id)
  const [completed, setCompleted] = useState<string[]>(() => readList('ai-academy.completed.v1'))
  const [bookmarks, setBookmarks] = useState<string[]>(() => readList('ai-academy.bookmarks.v1'))
  const [expanded, setExpanded] = useState<string[]>([curriculum[0].modules[0].id])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [showLabs, setShowLabs] = useState(false)
  const [showMLLabs, setShowMLLabs] = useState(false)
  const [showDeepLabs, setShowDeepLabs] = useState(false)
  const [showTransformerLabs, setShowTransformerLabs] = useState(false)
  const [showRAGLabs, setShowRAGLabs] = useState(false)

  useEffect(() => { localStorage.setItem('ai-academy.completed.v1', JSON.stringify(completed)) }, [completed])
  useEffect(() => { localStorage.setItem('ai-academy.bookmarks.v1', JSON.stringify(bookmarks)) }, [bookmarks])

  const allLessons = useMemo(() => curriculum.flatMap(s => s.modules.flatMap(m => m.lessons)), [])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return curriculum
    return curriculum.map(s => ({...s, modules:s.modules.map(m => ({...m, lessons:m.lessons.filter(l => `${l.title} ${l.depth} ${l.lab} ${m.title} ${s.title}`.toLowerCase().includes(q))})).filter(m => m.lessons.length || `${m.title} ${m.description}`.toLowerCase().includes(q))})).filter(s => s.modules.length || s.title.toLowerCase().includes(q))
  }, [query])
  const active = filtered.find(s => s.id === activeStage) ?? filtered[0] ?? curriculum[0]
  const total = allLessons.length
  const progress = Math.round(completed.length / total * 100)
  const toggle = (id: string) => setCompleted(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])
  const toggleBookmark = (id: string) => setBookmarks(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])
  const moduleCount = curriculum.reduce((n,s)=>n+s.modules.length,0)
  const stageNumber = curriculum.findIndex(s => s.id === active.id) + 1

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><BrainCircuit size={22}/></div><div><strong>AI Engineering Academy</strong><span>Understand · Build · Evaluate · Deploy</span></div></div><div className="top-actions"><span className="status"><i/> Curriculum preview</span><a href="https://github.com/" target="_blank" rel="noreferrer">GitHub <GitBranch size={14}/></a></div></header>
    <main>
      <section className="hero"><div className="eyebrow"><Sparkles size={14}/> INDEPENDENT LEARNING PLATFORM</div><h1>Become an <em>AI Systems Engineer.</em></h1><p>From mathematical intuition to autonomous agents, advanced RAG, MCP, A2A, LLMOps and production-grade AI platforms.</p><div className="hero-stats"><div><strong>{curriculum.length}</strong><span>Learning stages</span></div><div><strong>{moduleCount}</strong><span>Modules</span></div><div><strong>{total}</strong><span>Lesson blueprints</span></div><div><strong>{progress}%</strong><span>Browser-saved progress</span></div></div></section>
      <section className="progress-card"><div className="progress-copy"><div><span className="eyebrow">YOUR LEARNING JOURNEY</span><h2>Mastery overview</h2></div><strong>{completed.length} / {total} lessons</strong></div><div className="progress-track"><span style={{width:`${progress}%`}}/></div><p>Progress and bookmarks are saved in this browser. Account-level synchronization will be added with the authentication and database milestone.</p></section>
      <div className="content-grid"><aside className="sidebar"><div className="side-heading">CURRICULUM <span>{filtered.length} / {curriculum.length} STAGES</span></div><label className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search topics, tools, labs..."/>{query && <button className="clear-search" onClick={()=>setQuery('')} aria-label="Clear search"><X size={14}/></button>}</label><nav>{filtered.map((s)=><button key={s.id} className={`stage-link ${active.id===s.id?'selected':''}`} onClick={()=>setActiveStage(s.id)}><span className="stage-num">{String(curriculum.findIndex(x=>x.id===s.id)+1).padStart(2,'0')}</span><span>{s.title}</span><ChevronRight size={15}/></button>)}</nav><div className="sidebar-foot"><span><Bookmark size={13}/> {bookmarks.length} bookmarked</span><span><CircleCheck size={13}/> {completed.length} completed</span></div></aside>
      <section className="main-panel"><div className="stage-heading"><div><div className="eyebrow">STAGE {String(stageNumber).padStart(2,'0')} · LEARNING PATH</div><h2>{active.title}</h2><p>{active.outcome}</p></div><div className="stage-icon"><Cpu size={27}/></div></div>
        {active.id==='stage-1'&&<div className="phase-lab-launch"><div><strong>Interactive foundations lab</strong><p>Experiment with vectors, probability, optimization and Python data transformations.</p></div><button className="lab-primary" onClick={()=>setShowLabs(v=>!v)}>{showLabs?'Hide labs':'Open 5 interactive labs'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-1'&&showLabs&&<MathLabs/>}
        {active.id==='stage-2'&&<div className="phase-lab-launch"><div><strong>Interactive machine learning workbench</strong><p>Train and inspect classical ML models, clustering and neural network learning mechanics.</p></div><button className="lab-primary" onClick={()=>setShowMLLabs(v=>!v)}>{showMLLabs?'Hide workbench':'Open 11 interactive labs'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-2'&&showMLLabs&&<MLLabs/>}
        {active.id==='stage-3'&&<div className="phase-lab-launch"><div><strong>Interactive neural network lab</strong><p>Explore neural-network gradients, CNN feature maps, recurrent sequence state, regularization and model evaluation.</p></div><button className="lab-primary" onClick={()=>setShowDeepLabs(v=>!v)}>{showDeepLabs?'Hide neural lab':'Open neural network lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-3'&&showDeepLabs&&<MLLabs initialTab="network"/>}
        {active.id==='stage-4'&&<div className="phase-lab-launch"><div><strong>Interactive transformer and LLM workbench</strong><p>Trace token IDs, embeddings, Q/K/V attention, multi-head projections, transformer blocks and next-token decoding.</p></div><button className="lab-primary" onClick={()=>setShowTransformerLabs(v=>!v)}>{showTransformerLabs?'Hide transformer labs':'Open 6 transformer labs'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-4'&&showTransformerLabs&&<TransformerLabs/>}
        {active.id==='stage-5'&&<div className="phase-lab-launch"><div><strong>Interactive RAG engineering workbench</strong><p>Experiment with ingestion, chunking, dense and sparse retrieval, reranking, GraphRAG, Visual RAG and evaluation metrics.</p></div><button className="lab-primary" onClick={()=>setShowRAGLabs(v=>!v)}>{showRAGLabs?'Hide RAG labs':'Open 7 RAG labs'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-5'&&showRAGLabs&&<RAGLabs/>}
        {active.modules.map((m,mi)=><article className="module" key={m.id}><button className="module-head" onClick={()=>setExpanded(v=>v.includes(m.id)?v.filter(x=>x!==m.id):[...v,m.id])}><div className="module-index">{String(mi+1).padStart(2,'0')}</div><div className="module-title"><h3>{m.title}</h3><p>{m.description}</p><span>{m.lessons.length} lessons · {m.lessons.filter(l=>completed.includes(l.id)).length} completed</span></div><ChevronRight className={expanded.includes(m.id)?'rotate':''} size={18}/></button>
          {expanded.includes(m.id)&&<div className="lesson-list">{m.lessons.map(l=><div className={`lesson ${completed.includes(l.id)?'lesson-complete':''}`} key={l.id}><button className={`check ${completed.includes(l.id)?'done':''}`} onClick={()=>toggle(l.id)} aria-label={completed.includes(l.id)?'Mark lesson incomplete':'Mark lesson complete'}>{completed.includes(l.id)?<CircleCheck size={18}/>:<span/>}</button><button className="lesson-open" onClick={()=>setSelectedLesson(l)}><div className="lesson-body"><strong>{l.title}</strong><p>{l.depth}</p><div className="lab"><Code2 size={13}/><span>LAB</span>{l.lab}</div></div></button><button className={`bookmark-btn ${bookmarks.includes(l.id)?'saved':''}`} onClick={()=>toggleBookmark(l.id)} aria-label={bookmarks.includes(l.id)?'Remove bookmark':'Bookmark lesson'}><Bookmark size={16} fill={bookmarks.includes(l.id)?'currentColor':'none'}/></button></div>)}</div>}
        </article>)}
        {active.modules.length===0&&<div className="empty-state"><Search size={25}/><strong>No matching lessons in this stage</strong><p>Try another search term or clear your search.</p></div>}
        <div className="note"><ShieldCheck size={18}/><div><strong>Engineering standard</strong><p>Lessons include intuition, prerequisites, worked examples, step-by-step execution, implementation exercises, assessment and production considerations. Interactive numerical labs are available for foundations, classical ML, deep learning, transformer internals and RAG engineering. Larger model training and GPU-backed execution remain separate milestones.</p></div></div>
      </section></div>
      <section className="bottom-callout"><div className="callout-icon"><Workflow size={23}/></div><div><h3>Built for real engineering capability</h3><p>Learn to design, implement, test, secure, optimize and operate AI systems—not just call an LLM API.</p></div></section>
    </main><footer>AI Engineering Academy · Independent project · Curriculum and lesson engine milestone</footer>

    {selectedLesson && <div className="lesson-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedLesson(null)}}><section className="lesson-detail" role="dialog" aria-modal="true" aria-labelledby="lesson-title"><header className="detail-header"><div><div className="eyebrow"><GraduationCap size={14}/> GUIDED LESSON</div><h2 id="lesson-title">{selectedLesson.title}</h2><p>{selectedLesson.depth}</p></div><button className="close-detail" onClick={()=>setSelectedLesson(null)} aria-label="Close lesson"><X/></button></header><div className="detail-scroll"><div className="detail-lab"><Code2 size={17}/><div><span>HANDS-ON LAB</span><strong>{selectedLesson.lab}</strong></div></div>
      <section className="detail-section"><h3><Target size={17}/> Learning objectives</h3><ul>{selectedLesson.objectives.map(x=><li key={x}>{x}</li>)}</ul></section>
      <section className="detail-section"><h3><Layers3 size={17}/> Prerequisites</h3><ul>{selectedLesson.prerequisites.map(x=><li key={x}>{x}</li>)}</ul></section>
      <section className="detail-section"><h3>01 · Build intuition</h3><p>{selectedLesson.intuition}</p></section>
      <section className="detail-section"><h3>02 · Worked example</h3><p>{selectedLesson.workedExample}</p></section>
      <section className="detail-section"><h3>03 · Step-by-step execution</h3><ol>{selectedLesson.workflow.map(x=><li key={x}>{x}</li>)}</ol></section>
      <LessonPractice lesson={selectedLesson}/>
      <section className="detail-section"><h3>04 · Practice exercises</h3><ol>{selectedLesson.exercises.map(x=><li key={x}>{x}</li>)}</ol></section>
      <section className="detail-section assessment"><h3>05 · Assessment criteria</h3><p>{selectedLesson.assessment}</p></section>
      <section className="detail-section"><h3>Production engineering note</h3><p>{selectedLesson.productionNote}</p></section></div><footer className="detail-footer"><button className="secondary-action" onClick={()=>toggleBookmark(selectedLesson.id)}><Bookmark size={15} fill={bookmarks.includes(selectedLesson.id)?'currentColor':'none'}/>{bookmarks.includes(selectedLesson.id)?'Bookmarked':'Bookmark'}</button><button className="primary-action" onClick={()=>toggle(selectedLesson.id)}>{completed.includes(selectedLesson.id)?<><Check size={16}/> Completed</>:<><CircleCheck size={16}/> Mark complete</>}</button></footer></section></div>}
  </div>
}
