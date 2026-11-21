import { useEffect, useMemo, useState } from 'react'
import { BrainCircuit, Bookmark, Check, ChevronRight, CircleCheck, Code2, Cpu, GitBranch, Search, ShieldCheck, Sparkles, Workflow, X, GraduationCap, Target, Layers3 } from 'lucide-react'
import { curriculum, type Lesson } from './data/curriculum'
import MathLabs from './components/MathLabs'
import Stage1MasteryLabs from './components/Stage1MasteryLabs'
import MLLabs from './components/MLLabs'
import Stage3MasteryLabs from './components/Stage3MasteryLabs'
import Stage2MasteryLabs from './components/Stage2MasteryLabs'
import TransformerLabs from './components/TransformerLabs'
import Stage4MasteryLabs from './components/Stage4MasteryLabs'
import RAGLabs from './components/RAGLabs'
import Stage5MasteryLabs from './components/Stage5MasteryLabs'
import LessonPractice from './components/LessonPractice'
import ProductionLabs from './components/ProductionLabs'
import AgenticInterviewStudio from './components/AgenticInterviewStudio'
import AgentLoopVisualizer from './components/AgentLoopVisualizer'
import AgentLoopLessonDetails from './components/AgentLoopLessonDetails'
import PlanningVisualizer from './components/PlanningVisualizer'
import PlanningLessonDetails from './components/PlanningLessonDetails'
import MemoryVisualizer from './components/MemoryVisualizer'
import MemoryLessonDetails from './components/MemoryLessonDetails'
import DurableStateVisualizer from './components/DurableStateVisualizer'
import DurableStateLessonDetails from './components/DurableStateLessonDetails'
import HumanLoopVisualizer from './components/HumanLoopVisualizer'
import HumanLoopLessonDetails from './components/HumanLoopLessonDetails'
import AgentPatternsVisualizer from './components/AgentPatternsVisualizer'
import AgentPatternsLessonDetails from './components/AgentPatternsLessonDetails'
import GraphOrchestrationVisualizer from './components/GraphOrchestrationVisualizer'
import GraphOrchestrationLessonDetails from './components/GraphOrchestrationLessonDetails'
import FrameworkComparisonVisualizer from './components/FrameworkComparisonVisualizer'
import FrameworkComparisonLessonDetails from './components/FrameworkComparisonLessonDetails'
import AgentEvaluationVisualizer from './components/AgentEvaluationVisualizer'
import AgentEvaluationLessonDetails from './components/AgentEvaluationLessonDetails'
import MCPArchitectureVisualizer from './components/MCPArchitectureVisualizer'
import MCPArchitectureLessonDetails from './components/MCPArchitectureLessonDetails'
import MCPPrimitivesVisualizer from './components/MCPPrimitivesVisualizer'
import MCPPrimitivesLessonDetails from './components/MCPPrimitivesLessonDetails'
import MCPAdvancedVisualizer from './components/MCPAdvancedVisualizer'
import MCPAdvancedLessonDetails from './components/MCPAdvancedLessonDetails'
import MCPSecurityVisualizer from './components/MCPSecurityVisualizer'
import MCPSecurityLessonDetails from './components/MCPSecurityLessonDetails'
import MCPTransportsVisualizer from './components/MCPTransportsVisualizer'
import MCPTransportsLessonDetails from './components/MCPTransportsLessonDetails'
import MCPObservabilityVisualizer from './components/MCPObservabilityVisualizer'
import MCPObservabilityLessonDetails from './components/MCPObservabilityLessonDetails'
import ArchitectureFlow from './components/ArchitectureFlow'
import StudentReflection from './components/StudentReflection'

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
  const [showAgentLoop, setShowAgentLoop] = useState(false)
  const [showPlanning, setShowPlanning] = useState(false)
  const [showMemory, setShowMemory] = useState(false)
  const [showDurableState, setShowDurableState] = useState(false)
  const [showHumanLoop, setShowHumanLoop] = useState(false)
  const [showAgentPatterns, setShowAgentPatterns] = useState(false)
  const [showGraphOrchestration, setShowGraphOrchestration] = useState(false)
  const [showFrameworkComparison, setShowFrameworkComparison] = useState(false)
  const [showAgentEvaluation, setShowAgentEvaluation] = useState(false)
  const [showMCPArchitecture, setShowMCPArchitecture] = useState(false)
  const [showMCPPrimitives, setShowMCPPrimitives] = useState(false)
  const [showMCPAdvanced, setShowMCPAdvanced] = useState(false)
  const [showMCPSecurity, setShowMCPSecurity] = useState(false)
  const [showMCPTransports, setShowMCPTransports] = useState(false)
  const [showMCPObservability, setShowMCPObservability] = useState(false)

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
      <ArchitectureFlow/>
      <ProductionLabs/>
      <AgenticInterviewStudio/>
      <div className="content-grid"><aside className="sidebar"><div className="side-heading">CURRICULUM <span>{filtered.length} / {curriculum.length} STAGES</span></div><label className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search topics, tools, labs..."/>{query && <button className="clear-search" onClick={()=>setQuery('')} aria-label="Clear search"><X size={14}/></button>}</label><nav>{filtered.map((s)=><button key={s.id} className={`stage-link ${active.id===s.id?'selected':''}`} onClick={()=>setActiveStage(s.id)}><span className="stage-num">{String(curriculum.findIndex(x=>x.id===s.id)+1).padStart(2,'0')}</span><span>{s.title}</span><ChevronRight size={15}/></button>)}</nav><div className="sidebar-foot"><span><Bookmark size={13}/> {bookmarks.length} bookmarked</span><span><CircleCheck size={13}/> {completed.length} completed</span></div></aside>
      <section className="main-panel"><div className="stage-heading"><div><div className="eyebrow">STAGE {String(stageNumber).padStart(2,'0')} · LEARNING PATH</div><h2>{active.title}</h2><p>{active.outcome}</p></div><div className="stage-icon"><Cpu size={27}/></div></div>
        {active.id==='stage-1'&&<div className="phase-lab-launch"><div><strong>Interactive foundations lab</strong><p>Seven guided topics with step-by-step numerical animations, failure labs and mastery checks.</p></div><button className="lab-primary" onClick={()=>setShowLabs(v=>!v)}>{showLabs?'Hide labs':'Open 7 mastery gates'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-1'&&showLabs&&<><Stage1MasteryLabs/><MathLabs/></>}
        {active.id==='stage-2'&&<div className="phase-lab-launch"><div><strong>Interactive machine learning workbench</strong><p>Seven classical ML topics with editable numerical experiments, failure analysis and practical mastery evidence.</p></div><button className="lab-primary" onClick={()=>setShowMLLabs(v=>!v)}>{showMLLabs?'Hide workbench':'Open 7 mastery gates + workbench'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-2'&&showMLLabs&&<><Stage2MasteryLabs/><MLLabs/></>}
        {active.id==='stage-3'&&<div className="phase-lab-launch"><div><strong>Interactive neural network lab</strong><p>Seven deep-learning topics with interactive forward/backward traces, optimizer experiments, CNN/RNN walkthroughs and generalization evidence.</p></div><button className="lab-primary" onClick={()=>setShowDeepLabs(v=>!v)}>{showDeepLabs?'Hide neural lab':'Open 7 mastery gates + neural lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-3'&&showDeepLabs&&<><Stage3MasteryLabs/><MLLabs initialTab="network"/></>}
        {active.id==='stage-4'&&<div className="phase-lab-launch"><div><strong>Interactive transformer and LLM workbench</strong><p>Eight topic-first mastery gates for tokenization, embeddings, Q/K/V, causal masking, multi-head attention, transformer blocks, decoding and LLM engineering.</p></div><button className="lab-primary" onClick={()=>setShowTransformerLabs(v=>!v)}>{showTransformerLabs?'Hide transformer labs':'Open 8 mastery gates + transformer labs'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-4'&&showTransformerLabs&&<><Stage4MasteryLabs/><TransformerLabs/></>}
        {active.id==='stage-5'&&<div className="phase-lab-launch"><div><strong>Interactive RAG engineering workbench</strong><p>Experiment with ingestion, chunking, dense and sparse retrieval, reranking, GraphRAG, Visual RAG and evaluation metrics.</p></div><button className="lab-primary" onClick={()=>setShowRAGLabs(v=>!v)}>{showRAGLabs?'Hide RAG labs':'Open 12 mastery gates + 7 RAG workbenches'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-5'&&showRAGLabs&&<><Stage5MasteryLabs/><RAGLabs/></>}
        {active.id==='stage-6'&&<div className="phase-lab-launch"><div><strong>Interactive agent control-flow lab</strong><p>Start Stage 6 with an animated, numerical tool-using agent. Inspect decisions, policy checks, observations, budgets and stop conditions.</p></div><button className="lab-primary" onClick={()=>setShowAgentLoop(v=>!v)}>{showAgentLoop?'Hide agent loop':'Open agent loop animation'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-6'&&showAgentLoop&&<><AgentLoopVisualizer/><AgentLoopLessonDetails/></>}
        {active.id==='stage-6'&&<div className="phase-lab-launch"><div><strong>Topic 2 · Planning and task decomposition</strong><p>Build a dependency DAG, calculate ready-task priority and critical path, execute safely and replan after failure.</p></div><button className="lab-primary" onClick={()=>setShowPlanning(v=>!v)}>{showPlanning?'Hide planning lab':'Open planning mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-6'&&showPlanning&&<><PlanningVisualizer/><PlanningLessonDetails/></>}
        {active.id==='stage-6'&&<div className="phase-lab-launch"><div><strong>Topic 3 · Agent memory and context engineering</strong><p>Explore working, episodic and semantic memory; scoped retrieval, provenance, token budgets, summarization, expiry and deletion.</p></div><button className="lab-primary" onClick={()=>setShowMemory(v=>!v)}>{showMemory?'Hide memory lab':'Open memory mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-6'&&showMemory&&<><MemoryVisualizer/><MemoryLessonDetails/></>}
        {active.id==='stage-6'&&<div className="phase-lab-launch"><div><strong>Topic 4 · State, checkpoints and durable execution</strong><p>Model state machines, recover after crashes, deduplicate side effects, fence stale workers and pause for human approval.</p></div><button className="lab-primary" onClick={()=>setShowDurableState(v=>!v)}>{showDurableState?'Hide durable execution lab':'Open durable execution mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-6'&&showDurableState&&<><DurableStateVisualizer/><DurableStateLessonDetails/></>}
        {active.id==='stage-6'&&<div className="phase-lab-launch"><div><strong>Topic 5 · Human-in-the-loop controls</strong><p>Enforce approval gates, reviewer identity, separation of duties, exact action binding, quorum, expiry and auditable workflow resume.</p></div><button className="lab-primary" onClick={()=>setShowHumanLoop(v=>!v)}>{showHumanLoop?'Hide approval lab':'Open human approval mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-6'&&showHumanLoop&&<><HumanLoopVisualizer/><HumanLoopLessonDetails/></>}
        {active.id==='stage-6'&&<div className="phase-lab-launch"><div><strong>Topic 6 · Agent design patterns</strong><p>Compare router, supervisor-worker, parallel, hierarchical, reflection and event-driven topologies with bounded execution labs.</p></div><button className="lab-primary" onClick={()=>setShowAgentPatterns(v=>!v)}>{showAgentPatterns?'Hide pattern lab':'Open agent topology mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-6'&&showAgentPatterns&&<><AgentPatternsVisualizer/><AgentPatternsLessonDetails/></>}
        {active.id==='stage-6'&&<div className="phase-lab-launch"><div><strong>Topic 7 · Graph-based agent orchestration</strong><p>Learn nodes, edges, conditional routing, reducers, checkpoints, interrupts and resumable graph execution.</p></div><button className="lab-primary" onClick={()=>setShowGraphOrchestration(v=>!v)}>{showGraphOrchestration?'Hide graph lab':'Open graph orchestration mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-6'&&showGraphOrchestration&&<><GraphOrchestrationVisualizer/><GraphOrchestrationLessonDetails/></>}
        {active.id==='stage-6'&&<div className="phase-lab-launch"><div><strong>Topic 8 · Agent framework comparison</strong><p>Compare Agents SDK, CrewAI, LlamaIndex, Haystack, PydanticAI and Semantic Kernel using one shared task contract and safety-first benchmark.</p></div><button className="lab-primary" onClick={()=>setShowFrameworkComparison(v=>!v)}>{showFrameworkComparison?'Hide framework lab':'Open framework decision mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-6'&&showFrameworkComparison&&<><FrameworkComparisonVisualizer/><FrameworkComparisonLessonDetails/></>}
        {active.id==='stage-6'&&<div className="phase-lab-launch"><div><strong>Topic 9 · Agent evaluation</strong><p>Evaluate task success, tool accuracy, citations, trajectories, safety, latency and cost with hard release gates.</p></div><button className="lab-primary" onClick={()=>setShowAgentEvaluation(v=>!v)}>{showAgentEvaluation?'Hide evaluation lab':'Open agent evaluation mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-6'&&showAgentEvaluation&&<><AgentEvaluationVisualizer/><AgentEvaluationLessonDetails/></>}
        {active.id==='stage-7'&&<div className="phase-lab-launch"><div><strong>Stage 7 · Topic 1 — MCP architecture and lifecycle</strong><p>Understand host/client/server boundaries, stateless JSON-RPC requests, per-request metadata, capability discovery, consent and safe tool invocation.</p></div><button className="lab-primary" onClick={()=>setShowMCPArchitecture(v=>!v)}>{showMCPArchitecture?'Hide MCP lab':'Open MCP protocol mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-7'&&showMCPArchitecture&&<><MCPArchitectureVisualizer/><MCPArchitectureLessonDetails/></>}
        {active.id==='stage-7'&&<div className="phase-lab-launch"><div><strong>Stage 7 · Topic 2 — MCP tools, resources and prompts</strong><p>Model actions, read-only context, URI templates and reusable prompts with independent schemas, cache semantics and authorization rules.</p></div><button className="lab-primary" onClick={()=>setShowMCPPrimitives(v=>!v)}>{showMCPPrimitives?'Hide primitives lab':'Open MCP primitives mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-7'&&showMCPPrimitives&&<><MCPPrimitivesVisualizer/><MCPPrimitivesLessonDetails/></>}
        {active.id==='stage-7'&&<div className="phase-lab-launch"><div><strong>Stage 7 · Topic 3 — MCP advanced capabilities</strong><p>Build stateless multi-round input flows, signed requestState, the Tasks extension, progress, cooperative cancellation and subscriptions.</p></div><button className="lab-primary" onClick={()=>setShowMCPAdvanced(v=>!v)}>{showMCPAdvanced?'Hide advanced lab':'Open MCP advanced capabilities lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-7'&&showMCPAdvanced&&<><MCPAdvancedVisualizer/><MCPAdvancedLessonDetails/></>}
        {active.id==='stage-7'&&<div className="phase-lab-launch"><div><strong>Stage 7 · Topic 4 — Transport and deployment</strong><p>Compare STDIO and Streamable HTTP, secure the remote edge, prevent DNS rebinding, and scale stateless replicas without sticky sessions.</p></div><button className="lab-primary" onClick={()=>setShowMCPTransports(v=>!v)}>{showMCPTransports?'Hide transport lab':'Open MCP transport mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-7'&&showMCPTransports&&<><MCPTransportsVisualizer/><MCPTransportsLessonDetails/></>}
        {active.id==='stage-7'&&<div className="phase-lab-launch"><div><strong>Stage 7 · Topic 5 — MCP security engineering</strong><p>Protect stateless MCP endpoints with OAuth 2.1, PRM discovery, issuer/audience validation, per-tool scopes, step-up and tenant-level authorization.</p></div><button className="lab-primary" onClick={()=>setShowMCPSecurity(v=>!v)}>{showMCPSecurity?'Hide security lab':'Open MCP security mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-7'&&showMCPSecurity&&<><MCPSecurityVisualizer/><MCPSecurityLessonDetails/></>}
        {active.id==='stage-7'&&<div className="phase-lab-launch"><div><strong>Supplementary lab · MCP observability and reliability</strong><p>Instrument redacted traces, measure p50/p95, apply safe retries and circuit breakers, and reconcile idempotent operations after crashes.</p></div><button className="lab-primary" onClick={()=>setShowMCPObservability(v=>!v)}>{showMCPObservability?'Hide operations lab':'Open MCP reliability mastery lab'} <ChevronRight size={15}/></button></div>}
        {active.id==='stage-7'&&showMCPObservability&&<><MCPObservabilityVisualizer/><MCPObservabilityLessonDetails/></>}
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
      <section className="detail-section"><h3>Production engineering note</h3><p>{selectedLesson.productionNote}</p></section><StudentReflection key={selectedLesson.id} lesson={selectedLesson}/></div><footer className="detail-footer"><button className="secondary-action" onClick={()=>toggleBookmark(selectedLesson.id)}><Bookmark size={15} fill={bookmarks.includes(selectedLesson.id)?'currentColor':'none'}/>{bookmarks.includes(selectedLesson.id)?'Bookmarked':'Bookmark'}</button><button className="primary-action" onClick={()=>toggle(selectedLesson.id)}>{completed.includes(selectedLesson.id)?<><Check size={16}/> Completed</>:<><CircleCheck size={16}/> Mark complete</>}</button></footer></section></div>}
  </div>
}
