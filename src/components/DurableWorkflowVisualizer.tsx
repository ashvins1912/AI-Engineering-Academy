import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Workflow,ShieldCheck,Database,Server} from 'lucide-react'
import lesson from '../../content/topics/durable/lesson.json'
import fixture from '../../examples/stage-08/fixtures/durable-workflow.json'

export default function DurableWorkflowVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [history,setHistory]=useState(10000),[lease,setLease]=useState(30),[fence,setFence]=useState(12),[crash,setCrash]=useState(true),[signal,setSignal]=useState(true)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setHistory(10000);setLease(30);setFence(12);setCrash(true);setSignal(true)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const activeFence=crash?fence+1:fence
 const compact=history>=10000
 const worker=crash&&step>=3?"worker-B":"worker-A"
 const outputs=[
  "workflow_id="+fixture.workflowId+"; code_version="+fixture.codeVersion+"; history=2",
  "activity=verify_identity; idempotency=loan-42:verify; lease="+lease+"s",
  "heartbeat=10s; activity=completed; provider_ref=idv-9",
  "worker="+worker+"; fence="+activeFence+"; completed activities replayed from history",
  "signal="+(signal?"approval-1 persisted":"waiting")+"; continue_as_new="+compact
 ]
 return <section className="agent-loop-lab durable-workflow-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Workflow size={14}/> STAGE 08 · DURABLE WORKFLOW LAB</span><h3>Resume workflows after workers crash</h3><p>Inspect history replay, activity state, heartbeat, lease fencing, signals and history compaction.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===3?'lease expiry → claim with fence '+activeFence+' → replay':step===4?'signal dedupe + history compaction threshold='+history:current.transformation}</code></div><div><small>OUTPUT</small><code>{outputs[step]}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===3&&crash?'Worker A is stale; writes with fence '+fence+' are rejected.':step===4&&compact?'Continue-as-new creates a linked run with compact state.':current.visualState}</div></article>
  <div className="durable-workflow-state"><div><strong><Database size={14}/> Workflow execution state</strong><span>{fixture.workflowId} · tenant {fixture.tenantId}</span></div><div><code>code_version</code><b>{fixture.codeVersion}</b></div><div><code>history_events</code><b>{history}</b></div><div><code>activity</code><b>{step>=2?'verify_identity=completed':'verify_identity=pending'}</b></div><div><code>worker / fence</code><b>{worker} / {activeFence}</b></div><div><code>signal</code><b>{signal?'approval-1 received':'waiting'}</b></div><div><code>run state</code><b>{compact?'continue_as_new_due':'running'}</b></div></div>
  <div className="durable-workflow-metrics"><article><small>HISTORY</small><strong>{history.toLocaleString()}</strong><span>{compact?'Compaction threshold reached':'Below threshold'}</span></article><article><small>LEASE</small><strong>{lease}s</strong><span>Heartbeat every 10s</span></article><article><small>FENCING TOKEN</small><strong>{activeFence}</strong><span>{crash?'New worker claimed':'Current worker'}</span></article><article><small>REPLAY</small><strong>DETERMINISTIC</strong><span>Completed activities skipped</span></article></div>
  <div className="durable-workflow-controls">
   <label><span>History event count <b>{history.toLocaleString()}</b></span><input type="range" min="10" max="20000" step="10" value={history} onChange={e=>setHistory(Number(e.target.value))}/></label>
   <label><span>Worker lease duration <b>{lease}s</b></span><input type="range" min="5" max="120" value={lease} onChange={e=>setLease(Number(e.target.value))}/></label>
   <label><span>Current fencing token <b>{fence}</b></span><input type="range" min="1" max="20" value={fence} onChange={e=>setFence(Number(e.target.value))}/></label>
   <label><span>Inject worker crash</span><input type="checkbox" checked={crash} onChange={e=>setCrash(e.target.checked)}/></label>
   <label><span>Approval signal received</span><input type="checkbox" checked={signal} onChange={e=>setSignal(e.target.checked)}/></label>
  </div>
  <div className="durable-engine-matrix"><strong><Server size={15}/> Choose the engine by workload</strong><div><b>Temporal</b><span>Durable application workflows, signals, timers, activity retries and replay</span></div><div><b>Prefect</b><span>Python-first flows/tasks, deployments, work pools and operational state</span></div><div><b>Airflow</b><span>Scheduled DAGs, batch pipelines, backfills and task instances</span></div><div><b>Dagster</b><span>Asset-centric data pipelines, partitions, lineage and materializations</span></div></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> Simulation only: no Temporal, Prefect, Airflow or Dagster cluster is provisioned. Durable execution does not make external provider side effects exactly once.</p>
 </section>
}
