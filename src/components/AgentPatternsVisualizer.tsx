import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Network,Users,Timer,ShieldCheck} from 'lucide-react'
import lesson from '../../content/topics/patterns/lesson.json'
import fixture from '../../examples/stage-06/fixtures/agent-patterns.json'

export default function AgentPatternsVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [workers,setWorkers]=useState(3),[pool,setPool]=useState(2),[revisions,setRevisions]=useState(2),[deliveries,setDeliveries]=useState(2),[failTask,setFailTask]=useState(false)
 const waves=Math.ceil(workers/pool),duration=waves*4
 const [eventSeen,setEventSeen]=useState(false)
 useEffect(()=>setEventSeen(false),[deliveries])
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setWorkers(3);setPool(2);setRevisions(2);setDeliveries(2);setFailTask(false);setEventSeen(false)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[Math.min(step,stages.length-1)]
 const resultCount=failTask?workers-1:workers
 const consume=()=>setEventSeen(true)
 return <section className="agent-loop-lab patterns-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Network size={14}/> STAGE 06 · AGENT TOPOLOGY LAB</span><h3>Choose the right agent architecture</h3><p>Inspect routing, delegation, parallel work, reflection and event-driven processing with live limits.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{step===2?'tasks='+workers+'; max_workers='+pool:current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===2?'ceil('+workers+'/'+pool+') = '+waves+' waves':step===3?'critic attempts ≤ '+revisions:current.transformation}</code></div><div><small>OUTPUT</small><code>{step===2?'ideal_time≈'+duration+'s; results='+resultCount+'/'+workers:step===3?'revision_budget='+revisions+': '+(revisions>0?'bounded':'no revision'):step===4?'deliveries='+deliveries+'; '+(eventSeen?'duplicate → prior result':'awaiting first delivery'):current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===2&&failTask?'One worker failed: aggregate must report partial_failure.':step===4&&eventSeen?'Duplicate delivery detected; logical effect remains one.':current.visualState}</div></article>
  <div className="patterns-metrics"><article><small>SUBTASKS</small><strong>{workers}</strong><span>Independent tasks</span></article><article><small>CONCURRENCY</small><strong>{pool}</strong><span>Maximum active workers</span></article><article><small>EXECUTION WAVES</small><strong>{waves}</strong><span>Ideal time ≈ {duration}s</span></article><article><small>AGGREGATE</small><strong>{resultCount}/{workers}</strong><span>{failTask?'Partial failure':'All tasks succeeded'}</span></article></div>
  <div className="patterns-controls">
   <label><span><b>Worker tasks</b><strong>{workers}</strong></span><input type="range" min="1" max="6" value={workers} onChange={e=>setWorkers(Number(e.target.value))}/></label>
   <label><span><b>Concurrency cap</b><strong>{pool}</strong></span><input type="range" min="1" max="4" value={pool} onChange={e=>setPool(Number(e.target.value))}/></label>
   <label><span><b>Reflection budget</b><strong>{revisions} revisions</strong></span><input type="range" min="0" max="4" value={revisions} onChange={e=>setRevisions(Number(e.target.value))}/></label>
   <label><span><b>Event deliveries</b><strong>{deliveries}</strong></span><input type="range" min="1" max="3" value={deliveries} onChange={e=>{setDeliveries(Number(e.target.value));setEventSeen(false)}}/></label>
   <label className="patterns-failure-toggle"><input type="checkbox" checked={failTask} onChange={e=>setFailTask(e.target.checked)}/> Inject one worker failure</label>
  </div>
  <div className="patterns-event"><div><strong><ShieldCheck size={15}/> Event deduplication inspector</strong><small>{fixture.event.eventId} · tenant {fixture.event.tenantId}</small></div><p>{eventSeen?'Event has been processed. Redelivery returns the stored result.':'Event is ready. Process it once, then retry to inspect deduplication.'}</p><button onClick={consume}>Deliver event</button><span>Deliveries configured: {deliveries} · logical effects: {eventSeen?1:0}</span></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1&&!playing)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><Timer size={13}/> Simulation only: concurrency waves assume equal 4-second tasks and omit queue/network overhead. A local thread timeout cannot forcibly stop arbitrary Python work; production cancellation must be cooperative or handled by isolated workers.</p>
 </section>
}
