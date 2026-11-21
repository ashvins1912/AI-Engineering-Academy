import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Boxes,ShieldCheck,Database,MessageSquareText,Wrench} from 'lucide-react'
import lesson from '../../content/topics/mcp-primitives/lesson.json'
import fixture from '../../examples/stage-07/fixtures/mcp-primitives.json'
export default function MCPPrimitivesVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [toolConsent,setToolConsent]=useState(true),[resourceScope,setResourceScope]=useState(true),[tenantMatch,setTenantMatch]=useState(true),[promptAllowed,setPromptAllowed]=useState(true),[privateCache,setPrivateCache]=useState(true)
 const toolOk=toolConsent,resourceOk=resourceScope&&tenantMatch,promptOk=promptAllowed
 const allOk=toolOk&&resourceOk&&promptOk&&privateCache
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setToolConsent(true);setResourceScope(true);setTenantMatch(true);setPromptAllowed(true);setPrivateCache(true)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const statuses=[{name:'Tool: calculate_refund',pass:toolOk},{name:'Resource: refunds policy',pass:resourceOk},{name:'Prompt: refund_review',pass:promptOk},{name:'Private cache scope',pass:privateCache}]
 return <section className="agent-loop-lab mcp-primitives-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Boxes size={14}/> STAGE 07 · MCP PRIMITIVES LAB</span><h3>Separate actions, context and prompt templates.</h3><p>Inspect tools, resources, resource templates and prompts with independent authorization rules.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>REQUEST</small><code>{current.input}</code></div><div><small>PRIMITIVE OPERATION</small><code>{current.transformation}</code></div><div><small>RESULT</small><code>{step===3?'tool='+toolOk+'; resource='+resourceOk+'; prompt='+promptOk:step===4?'cacheScope='+(privateCache?'private':'misconfigured')+'; overall='+allOk:current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===3&&!allOk?'One or more primitive policies denied access.':current.visualState}</div></article>
  <div className="mcp-primitive-cards">
   <article><span><Wrench size={16}/> TOOL</span><strong>calculate_refund</strong><small>Action · quote only</small><p>Input: amount (number)</p><b className={toolOk?'pass':'fail'}>{toolOk?'CONSENT + SCOPE OK':'BLOCKED'}</b></article>
   <article><span><Database size={16}/> RESOURCE</span><strong>policy://refunds/v3</strong><small>Read-only context</small><p>Template: tenant://{'{tenant_id}'}/orders/{'{order_id}'}</p><b className={resourceOk?'pass':'fail'}>{resourceOk?'TENANT SCOPE OK':'BLOCKED'}</b></article>
   <article><span><MessageSquareText size={16}/> PROMPT</span><strong>refund_review</strong><small>Reusable message</small><p>Required argument: order_id</p><b className={promptOk?'pass':'fail'}>{promptOk?'ALLOW-LISTED':'BLOCKED'}</b></article>
  </div>
  <div className="mcp-primitive-controls">
   <label><input type="checkbox" checked={toolConsent} onChange={e=>setToolConsent(e.target.checked)}/> User consent for quote tool</label>
   <label><input type="checkbox" checked={resourceScope} onChange={e=>setResourceScope(e.target.checked)}/> resources:read scope granted</label>
   <label><input type="checkbox" checked={tenantMatch} onChange={e=>setTenantMatch(e.target.checked)}/> Resource URI tenant matches authenticated tenant</label>
   <label><input type="checkbox" checked={promptAllowed} onChange={e=>setPromptAllowed(e.target.checked)}/> Prompt is allow-listed</label>
   <label><input type="checkbox" checked={privateCache} onChange={e=>setPrivateCache(e.target.checked)}/> Private data uses private cache scope</label>
  </div>
  <div className="mcp-primitive-policy"><strong><ShieldCheck size={15}/> Primitive policy inspector</strong>{statuses.map(x=><div key={x.name}><span>{x.name}</span><b className={x.pass?'pass':'fail'}>{x.pass?'PASS':'DENY'}</b></div>)}<p>Quote tool does not execute a refund. A real write action requires a separate tool, policy and HITL approval.</p></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote">Fixture {fixture.scenario}. Tool, resource and prompt access are independent; discovery never grants permission.</p>
 </section>
}
