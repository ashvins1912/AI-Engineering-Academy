import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Workflow,ShieldCheck,GitBranch,Layers} from 'lucide-react'
import lesson from '../../content/topics/workflow-patterns/lesson.json'
import fixture from '../../examples/stage-08/fixtures/workflow-patterns.json'

export default function WorkflowPatternsVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [workers,setWorkers]=useState(2),[shippingFailure,setShippingFailure]=useState(true),[compensationFailure,setCompensationFailure]=useState(false),[deadline,setDeadline]=useState(30)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setWorkers(2);setShippingFailure(true);setCompensationFailure(false);setDeadline(30)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const finalState=!shippingFailure?"completed":compensationFailure?"compensation_required":"compensated"
 const order=["fraud","address","inventory","payment","shipping"]
 const states=order.map((name,i)=>({name,status:step===0?"pending":i<2?(step>=1?"completed":"pending"):i===2?(step>=2?"completed":"pending"):i===3?(step>=2?"completed":"pending"):step>=3?(shippingFailure?"failed":"completed"):"pending"}))
 const compensation=shippingFailure?(compensationFailure?["void_payment: failed","release_inventory: pending"]:["void_payment: compensated","release_inventory: compensated"]):["not required"]
 const activeCount=step===1?Math.min(workers,2):0
 const output=step===3?compensation.join(" · "):step===4?"status="+finalState+"; max_workers="+workers+"; deadline="+deadline+"s":current.output
 return <section className="agent-loop-lab workflow-patterns-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Workflow size={14}/> STAGE 08 · WORKFLOW PATTERNS LAB</span><h3>Orchestrate deterministic business processes</h3><p>Inspect dependency order, bounded parallel work, saga failure and reverse compensation.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===1?'bounded fan-out; max_workers='+workers:step===3?'reverse compensation of successful side effects':current.transformation}</code></div><div><small>OUTPUT</small><code>{output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===3&&compensationFailure?'Compensation failed: preserve compensation_required and escalate.':step===4&&finalState==='compensated'?'All completed side effects have a recorded compensation.':step===4&&finalState==='compensation_required'?'Do not claim rollback; an operator recovery task is required.':current.visualState}</div></article>
  <div className="workflow-node-board"><div><strong><GitBranch size={14}/> Workflow execution graph</strong><span>{fixture.workflowId} · {fixture.tenantId}</span></div><div className="workflow-node-list">{states.map((node,i)=><article key={node.name} className={node.status}><small>{i+1}</small><strong>{node.name}</strong><span>{node.status}</span></article>)}</div></div>
  <div className="workflow-pattern-metrics"><article><small>MAX WORKERS</small><strong>{workers}</strong><span>Active now: {activeCount}</span></article><article><small>DEPENDENCIES</small><strong>5</strong><span>2 parallel, 3 sequential</span></article><article><small>DEADLINE</small><strong>{deadline}s</strong><span>Run budget</span></article><article><small>FINAL STATE</small><strong>{finalState}</strong><span>{shippingFailure?"Shipping failure injected":"Success path"}</span></article></div>
  <div className="workflow-pattern-controls">
   <label><span>Parallel worker limit <b>{workers}</b></span><input type="range" min="1" max="4" value={workers} onChange={e=>setWorkers(Number(e.target.value))}/></label>
   <label><span>Workflow deadline <b>{deadline}s</b></span><input type="range" min="5" max="120" step="5" value={deadline} onChange={e=>setDeadline(Number(e.target.value))}/></label>
   <label><span>Inject shipping failure</span><input type="checkbox" checked={shippingFailure} onChange={e=>setShippingFailure(e.target.checked)}/></label>
   <label><span>Inject compensation failure</span><input type="checkbox" checked={compensationFailure} onChange={e=>setCompensationFailure(e.target.checked)}/></label>
  </div>
  <div className="workflow-compensation"><strong><Layers size={15}/> Saga compensation trace</strong>{compensation.map((entry,i)=><div key={i}><small>{i+1}</small><span>{entry}</span></div>)}<p><ShieldCheck size={13}/> Compensation is a new business action—not an automatic database rollback.</p></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote">Simulation only: no inventory, payment or shipping APIs are called. A real saga persists every step and compensation and reconciles ambiguous provider outcomes.</p>
 </section>
}
