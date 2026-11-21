import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,RadioTower,ShieldCheck,Inbox,Clock3} from 'lucide-react'
import lesson from '../../content/topics/event-driven/lesson.json'
import fixture from '../../examples/stage-08/fixtures/event-driven.json'

export default function EventDrivenVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [deliveries,setDeliveries]=useState(2),[version,setVersion]=useState(4),[expected,setExpected]=useState(3),[attempts,setAttempts]=useState(3),[signatureValid,setSignatureValid]=useState(true),[queueRate,setQueueRate]=useState(120)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setDeliveries(2);setVersion(4);setExpected(3);setAttempts(3);setSignatureValid(true);setQueueRate(120)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const gap=version>expected+1
 const stale=version<=expected
 const duplicateCount=Math.max(0,deliveries-1)
 const backlogPerMinute=Math.max(0,(queueRate-100)*60)
 const result=step===2?(gap?'version_gap: defer/retry':stale?'stale event: ignore/record':'processed once; duplicates='+duplicateCount):step===3?'attempts='+attempts+'; '+(attempts>=3?'DLQ after retry budget':'retry with backoff'):step===4?'scheduled_key='+fixture.schedule.scheduleId+':'+fixture.schedule.scheduledFor:'event_id='+fixture.event.eventId
 const status=step===0&&!signatureValid?'webhook_rejected':step===2&&gap?'deferred':step===3&&attempts>=3?'dead_letter':step>=2?'processed/observed':'pending'
 return <section className="agent-loop-lab event-driven-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><RadioTower size={14}/> STAGE 08 · EVENT AUTOMATION LAB</span><h3>Build reliable event-triggered automation</h3><p>Inspect outbox delivery, duplicate messages, aggregate ordering, retries, DLQ and scheduled triggers.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===0?'transactional outbox; signature='+signatureValid:step===2?'inbox lookup + aggregate_version='+version+' expected='+expected:step===3?'attempts='+attempts+'; max=3; visibility timeout':current.transformation}</code></div><div><small>OUTPUT</small><code>{result}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{!signatureValid&&step===0?'Invalid webhook signature: reject before event creation.':gap&&step===2?'Event version gap: defer; do not corrupt the projection.':step===2&&deliveries>1?'Duplicate deliveries detected; inbox still allows one logical effect.':step===3&&attempts>=3?'Poison event reached retry limit and is quarantined in DLQ.':current.visualState}</div></article>
  <div className="event-driven-envelope"><div><strong><Inbox size={14}/> Event envelope</strong><span>{fixture.event.eventType} · schema v{fixture.event.schemaVersion}</span></div><div><code>event_id</code><b>{fixture.event.eventId}</b></div><div><code>tenant</code><b>{fixture.event.tenantId}</b></div><div><code>aggregate</code><b>{fixture.event.aggregateId}</b></div><div><code>version / expected</code><b>{version} / {expected}</b></div><div><code>trace</code><b>{fixture.event.traceId}</b></div></div>
  <div className="event-driven-metrics"><article><small>DELIVERIES</small><strong>{deliveries}</strong><span>Logical effects: {gap||stale?0:1}</span></article><article><small>DUPLICATES</small><strong>{duplicateCount}</strong><span>Inbox dedupe key</span></article><article><small>QUEUE BACKLOG</small><strong>{backlogPerMinute}</strong><span>Events/min at 100/s consumer capacity</span></article><article><small>STATUS</small><strong>{status}</strong><span>At-least-once processing</span></article></div>
  <div className="event-driven-controls">
   <label><span>Broker deliveries <b>{deliveries}</b></span><input type="range" min="1" max="4" value={deliveries} onChange={e=>setDeliveries(Number(e.target.value))}/></label>
   <label><span>Incoming aggregate version <b>{version}</b></span><input type="range" min="1" max="8" value={version} onChange={e=>setVersion(Number(e.target.value))}/></label>
   <label><span>Consumer current version <b>{expected}</b></span><input type="range" min="0" max="8" value={expected} onChange={e=>setExpected(Number(e.target.value))}/></label>
   <label><span>Consumer attempts <b>{attempts}</b></span><input type="range" min="1" max="6" value={attempts} onChange={e=>setAttempts(Number(e.target.value))}/></label>
   <label><span>Incoming events/sec <b>{queueRate}</b></span><input type="range" min="10" max="200" step="10" value={queueRate} onChange={e=>setQueueRate(Number(e.target.value))}/></label>
   <label><span>Webhook signature valid</span><input type="checkbox" checked={signatureValid} onChange={e=>setSignatureValid(e.target.checked)}/></label>
  </div>
  <div className="event-driven-recovery"><strong><ShieldCheck size={15}/> Delivery and recovery policy</strong><p><span>Outbox</span> Business state and event intent commit together.</p><p><span>Inbox</span> Consumer commits one effect per tenant/event ID.</p><p><span>Ordering</span> Aggregate version must be current + 1.</p><p><span>DLQ</span> Retry limit {3}; current attempts {attempts}.</p><p><span>Schedule</span> {fixture.schedule.scheduleId} · {fixture.schedule.timezone}</p></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><Clock3 size={13}/> Simulation only: no external webhook or broker is called. Queue backlog assumes a fixed 100 events/sec consumer capacity and is a teaching estimate.</p>
 </section>
}
