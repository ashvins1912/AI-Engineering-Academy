import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Database,ShieldCheck,Clock3} from 'lucide-react'
import lesson from '../../content/topics/state/lesson.json'
import fixture from '../../examples/stage-06/fixtures/durable-state.json'
export default function DurableStateVisualizer(){
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[crash,setCrash]=useState(true),[retry,setRetry]=useState(1),[owner,setOwner]=useState(0)
 const stages=lesson.visual.animation.stages
 useEffect(()=>{if(!playing)return;const timer=window.setInterval(()=>setStep(current=>{if(current>=stages.length-1){setPlaying(false);return current}return current+1}),2400);return()=>window.clearInterval(timer)},[playing,stages.length])
 const lease=owner===0?fixture.workerA:fixture.workerB
 const key=fixture.idempotencyKey
 const move=(delta:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+delta)))}
 const reset=()=>{setPlaying(false);setStep(0);setCrash(true);setRetry(1);setOwner(0)}
 const status=step<2?'KNOWN CHECKPOINT':step===2&&crash?'UNKNOWN REMOTE OUTCOME':step>=3?'RECOVERED WITH SAME KEY':'IN PROGRESS'
 return <section className="agent-loop-lab durable-state-lab">
 <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Database size={14}/> DURABLE AGENT STATE & CHECKPOINTS</span><h3>Survive crashes without repeating side effects.</h3><p>Inspect the uncertain payment window, lease takeover, fencing token and idempotent recovery.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
 <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
 <article className="agent-loop-stage"><div className="agent-loop-stage-title"><span>{step+1}</span><div><h4>{stages[step].title}</h4><p>{stages[step].narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{stages[step].input}</code></div><div><small>TRANSFORMATION</small><code>{stages[step].transformation}</code></div><div><small>OUTPUT</small><code>{stages[step].output}</code></div></div><div className="agent-loop-state"><i className="state-pulse"/><span>{stages[step].visualState}</span></div></article>
 <div className="durable-state-board">
  <article><small>CHECKPOINT</small><strong>{step<2?'PAYMENT_PENDING':step===2&&crash?'PAYMENT_PENDING':'PAYMENT_CONFIRMED'}</strong><span>version {step<2?1:step===2&&crash?1:2}</span></article>
  <article><small>LEASE OWNER</small><strong>{lease.id}</strong><span>fencing token {lease.fence}</span></article>
  <article><small>IDEMPOTENCY KEY</small><strong>{key}</strong><span>stable across retry attempts</span></article>
  <article><small>PROVIDER OPERATIONS</small><strong>1 charge</strong><span>{step===2&&crash?'response lost · reconcile required':'provider reference ch_1042'}</span></article>
 </div>
 <div className="durable-state-controls">
  <label><span>Simulate crash after provider success <b>{crash?'ON':'OFF'}</b></span><input type="checkbox" checked={crash} onChange={e=>setCrash(e.target.checked)}/></label>
  <label><span>Retry attempts <b>{retry}</b></span><input type="range" min="0" max="4" value={retry} onChange={e=>setRetry(Number(e.target.value))}/></label>
  <label><span>Lease owner</span><select value={owner} onChange={e=>setOwner(Number(e.target.value))}><option value={0}>Worker A · fence 7</option><option value={1}>Worker B · fence 8</option></select></label>
 </div>
 <div className="durable-retry-trace"><strong><Clock3 size={14}/> Recovery trace</strong><p>Operation key: <code>{key}</code></p><p>Retry attempts: {retry} · Provider operations: 1 · Current owner: {lease.id}</p><p>{crash?'A lost response is an unknown outcome. Reuse the key or query provider status before any new logical charge.':'No simulated crash. Persist the provider result and checkpoint before continuing.'}</p></div>
 <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1&&!playing)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button></div>
 <p className="agent-loop-footnote"><ShieldCheck size={13}/> {status}. A checkpoint is durable local state; it cannot make a remote provider call atomic. Use idempotency, fencing and reconciliation.</p>
 </section>
}
