import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Globe,ShieldCheck,FileCheck2,Radio} from 'lucide-react'
import lesson from '../../content/topics/a2a/lesson.json'
import fixture from '../../examples/stage-07/fixtures/a2a.json'

export default function A2AVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [cardValid,setCardValid]=useState(true),[authValid,setAuthValid]=useState(true),[streamConnected,setStreamConnected]=useState(true),[artifactValid,setArtifactValid]=useState(true)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setCardValid(true);setAuthValid(true);setStreamConnected(true);setArtifactValid(true)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const blocked=!cardValid
 const authRequired=cardValid&&!authValid&&step>=1
 const artifactRejected=!artifactValid&&step>=3
 const taskStatus=blocked?'not_dispatched':authRequired?'auth-required':step===0?'discovered':step===1?'submitted':step===2?'working':step===3?'completed':artifactRejected?'completed_artifact_rejected':'completed'
 const transport=streamConnected?'SSE stream':'tasks/get polling fallback'
 const outputs=[
  blocked?'rejected: untrusted Agent Card':'Agent Card validated; protocol=1.0.0',
  blocked?'no task created':authRequired?'auth-required; execution paused':'taskId=task-42; contextId=ctx-9',
  authRequired?'awaiting valid credentials':streamConnected?'status events received':'stream disconnected; polling fallback',
  artifactRejected?'artifact quarantined: MIME/schema/provenance failure':'artifact-7 validated; provenance=2 sources',
  blocked||authRequired||artifactRejected?'delegation incomplete; manual recovery required':'delegation complete; audit linked'
 ]
 const currentOutput=outputs[step]
 const stateRows=[['Agent',fixture.agentCard.name],['Protocol',fixture.protocolVersion],['Task ID',fixture.request.taskId],['Context ID',fixture.request.contextId],['Status',taskStatus],['Update channel',transport]]
 const events=[{seq:1,label:'task submitted',state:'submitted'},{seq:2,label:'specialist working',state:'working'},{seq:3,label:'artifact update',state:'artifact-7'},{seq:4,label:'task completed',state:'completed'}]
 return <section className="agent-loop-lab a2a-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Globe size={14}/> STAGE 07 · A2A INTEROPERABILITY LAB</span><h3>Delegate work to an independent agent</h3><p>Discover a remote agent, negotiate its interface, track its task and validate the returned artifact.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===0?'validate Agent Card + trusted origin':step===1?'authenticate + message/send':step===2?transport:'validate MIME + schema + provenance'}</code></div><div><small>OUTPUT</small><code>{currentOutput}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{blocked?'Discovery blocked before private context is sent.':authRequired?'Authentication is required; no privileged work proceeds.':artifactRejected?'Remote artifact is quarantined and not trusted.':!streamConnected&&step===2?'SSE is unavailable; client falls back to tasks/get polling.':current.visualState}</div></article>
  <div className="a2a-identity-grid"><article><small>AGENT CARD</small><strong>{fixture.agentCard.name}</strong><code>/.well-known/agent-card.json</code><span>{cardValid?'Trusted origin · version compatible':'Rejected · origin/version mismatch'}</span></article><article><small>NEGOTIATED INTERFACE</small><strong>JSON-RPC · A2A {fixture.protocolVersion}</strong><code>https://agents.example.com/a2a</code><span>Streaming capability: declared true</span></article></div>
  <div className="a2a-state-board"><div className="a2a-board-title"><strong><Radio size={14}/> Task and context state</strong><span>{fixture.request.tenantId}</span></div>{stateRows.map(([k,v])=><div key={k}><code>{k}</code><b>{v}</b></div>)}</div>
  <div className="a2a-event-log"><strong>Ordered task events</strong>{events.map(e=><div key={e.seq} className={step>=e.seq-1?'active':''}><small>#{e.seq}</small><span>{e.label}</span><code>{e.state}</code></div>)}</div>
  <div className="a2a-controls">
   <label><span>Agent Card trusted <b>{cardValid?'Yes':'No'}</b></span><input type="checkbox" checked={cardValid} onChange={e=>setCardValid(e.target.checked)}/></label>
   <label><span>Authentication valid <b>{authValid?'Yes':'No'}</b></span><input type="checkbox" checked={authValid} onChange={e=>setAuthValid(e.target.checked)}/></label>
   <label><span>Streaming connected <b>{streamConnected?'Yes':'No'}</b></span><input type="checkbox" checked={streamConnected} onChange={e=>setStreamConnected(e.target.checked)}/></label>
   <label><span>Artifact valid <b>{artifactValid?'Yes':'No'}</b></span><input type="checkbox" checked={artifactValid} onChange={e=>setArtifactValid(e.target.checked)}/></label>
  </div>
  <div className="a2a-artifact"><div><FileCheck2 size={15}/><strong>Artifact validation</strong></div><p>{artifactRejected?'Rejected and quarantined before use.': 'artifact-7 · application/json · 2 provenance references'}</p><small>Remote output is untrusted evidence, never privileged instructions.</small></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> Simulation only: no remote network calls are made. Real deployments must authenticate the remote agent, authorize task ownership and validate callback destinations at the network edge.</p>
 </section>
}
