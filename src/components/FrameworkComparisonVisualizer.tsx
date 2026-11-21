import {useMemo,useState} from 'react'
import {Scale,ShieldCheck,Layers3,ArrowRight,CheckCircle2,AlertTriangle} from 'lucide-react'
import lesson from '../../content/topics/frameworks/lesson.json'
import fixture from '../../examples/stage-06/fixtures/framework-comparison.json'

const candidates=[
{name:'OpenAI Agents SDK',fit:'Direct agent/tool orchestration',strength:'Agents, tools, handoffs, guardrails and tracing',watch:'OpenAI ecosystem coupling and runtime compatibility',scores:[4,5,4,4,3,4]},
{name:'CrewAI',fit:'Role-oriented teams and flows',strength:'Specialist roles, tasks, crews and workflow coordination',watch:'Delegation budgets, state boundaries and team overhead',scores:[4,4,3,4,3,3]},
{name:'LlamaIndex',fit:'Data-centric agents and retrieval',strength:'Connectors, indexing, retrieval and data tools',watch:'Retrieval quality, ingestion operations and abstraction scope',scores:[4,4,5,4,3,4]},
{name:'Haystack',fit:'Composable search and RAG pipelines',strength:'Explicit components, pipelines and modular retrieval',watch:'Pipeline complexity and agent-specific fit for the use case',scores:[4,4,5,4,4,4]},
{name:'PydanticAI',fit:'Typed Python agents and contracts',strength:'Typed dependencies, validated outputs and testable boundaries',watch:'You may compose more orchestration infrastructure yourself',scores:[4,5,4,4,4,5]},
{name:'Semantic Kernel',fit:'Enterprise plugin ecosystems',strength:'Plugin/function model and multi-language integration options',watch:'Check feature maturity and language parity for pinned version',scores:[4,4,4,4,3,4]}
]
const dimensions=['Task success','Tool safety','Grounding','Traceability','Latency','Maintainability']
export default function FrameworkComparisonVisualizer(){
 const [selected,setSelected]=useState('PydanticAI'),[safetyWeight,setSafetyWeight]=useState(25),[latencyWeight,setLatencyWeight]=useState(10),[candidateCount,setCandidateCount]=useState(6)
 const weights=[25, safetyWeight,20,15,latencyWeight,5]
 const candidatesShown=candidates.slice(0,candidateCount)
 const normalized=useMemo(()=>{const raw=[25,safetyWeight,20,15,latencyWeight,5];const sum=raw.reduce((a,b)=>a+b,0);return raw.map(x=>x/sum)},[safetyWeight,latencyWeight])
 const selectedCandidate=candidates.find(x=>x.name===selected)??candidates[0]
 const score=selectedCandidate.scores.reduce((sum,value,i)=>sum+value*normalized[i],0)
 return <section className="agent-loop-lab framework-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Scale size={14}/> STAGE 06 · FRAMEWORK DECISION LAB</span><h3>Compare frameworks on one task—not on popularity.</h3><p>Same refund fixture, same tool contract and same application-owned policy. The example scores below are illustrative, not measured framework benchmarks.</p></div><span className="agent-loop-count">6 CANDIDATES</span></header>
  <div className="framework-task"><strong>Benchmark fixture</strong><span>{fixture.scenario}</span><small>tenant={fixture.tenantId} · order={fixture.orderId} · amount=₹{fixture.amount.toLocaleString('en-IN')}</small></div>
  <div className="framework-select"><label>Candidate framework<select value={selected} onChange={e=>setSelected(e.target.value)}>{candidates.map(x=><option key={x.name}>{x.name}</option>)}</select></label><div className="framework-score"><small>ILLUSTRATIVE WEIGHTED SCORE</small><strong>{score.toFixed(2)} / 5</strong><span>Hard safety gates still apply first</span></div></div>
  <div className="framework-score-bars">{dimensions.map((name,i)=><div key={name}><span>{name}</span><div><i style={{width:(selectedCandidate.scores[i]/5*100)+'%'}}/></div><b>{selectedCandidate.scores[i]}/5</b></div>)}</div>
  <div className="framework-fit"><article><small>BEST-FIT SIGNAL</small><strong>{selectedCandidate.fit}</strong><p>{selectedCandidate.strength}</p></article><article><small>TRADE-OFF TO VALIDATE</small><strong>{selectedCandidate.watch}</strong><p>Validate against your pinned version, workload and deployment constraints.</p></article></div>
  <div className="framework-controls">
   <label><span>Tool safety weight <b>{safetyWeight}%</b></span><input type="range" min="10" max="40" value={safetyWeight} onChange={e=>setSafetyWeight(Number(e.target.value))}/></label>
   <label><span>Latency weight <b>{latencyWeight}%</b></span><input type="range" min="5" max="25" value={latencyWeight} onChange={e=>setLatencyWeight(Number(e.target.value))}/></label>
   <label><span>Candidate count <b>{candidateCount}</b></span><input type="range" min="2" max="6" value={candidateCount} onChange={e=>setCandidateCount(Number(e.target.value))}/></label>
  </div>
  <div className="framework-candidates"><strong>Framework fit matrix</strong>{candidatesShown.map(x=><button key={x.name} className={x.name===selected?'active':''} onClick={()=>setSelected(x.name)}><span>{x.name}</span><small>{x.fit}</small><ArrowRight size={14}/></button>)}</div>
  <div className="framework-gates"><strong><ShieldCheck size={15}/> Hard safety gates</strong><p><CheckCircle2 size={13}/> All tool calls use the application-owned allow-list and tenant policy.</p><p><CheckCircle2 size={13}/> ₹12,500 refund requires human approval before execution.</p><p><AlertTriangle size={13}/> A cross-tenant call or missing approval rejects the candidate regardless of weighted score.</p></div>
  <p className="agent-loop-footnote"><Layers3 size={13}/> {lesson.explanation.mentalModel} This scorecard is a learning simulator; run the benchmark harness to collect real measurements before making a production selection.</p>
 </section>
}
