import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,GitCompareArrows,ShieldCheck,ArrowRightLeft} from 'lucide-react'
import lesson from '../../content/topics/ibm-acp/lesson.json'
import fixture from '../../examples/stage-07/fixtures/acp-migration.json'

export default function IBMACPMigrationVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [canary,setCanary]=useState(5),[parity,setParity]=useState(99.6),[securityFailures,setSecurityFailures]=useState(0),[duplicates,setDuplicates]=useState(0)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setCanary(5);setParity(99.6);setSecurityFailures(0);setDuplicates(0)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const eligible=parity>=99&&securityFailures===0&&duplicates===0
 const mapping=[['sessionId','contextId'],['runId','taskId'],['SSE accepted','Task submitted'],['SSE working','statusUpdate: working'],['SSE result','artifactUpdate + completed']]
 return <section className="agent-loop-lab ibm-acp-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><GitCompareArrows size={14}/> STAGE 07 · IBM ACP → A2A MIGRATION LAB</span><h3>Replace the legacy contract without losing semantics</h3><p>Map identifiers and events, prove parity, enforce safety gates and control the canary.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>LEGACY INPUT</small><code>{current.input}</code></div><div><small>SEMANTIC TRANSFORMATION</small><code>{current.transformation}</code></div><div><small>TARGET / DECISION</small><code>{step===3?'parity='+parity+'%; security_failures='+securityFailures+'; duplicates='+duplicates:step===4?'canary='+canary+'%; eligible='+eligible:current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===3&&!eligible?'Migration blocked: a parity or non-compensable safety gate failed.':step===4&&!eligible?'Rollback required; do not promote A2A traffic.':current.visualState}</div></article>
  <div className="ibm-acp-mapping"><strong><ArrowRightLeft size={14}/> Semantic mapping matrix</strong>{mapping.map(([old,target])=><div key={old}><code>{old}</code><span>→</span><b>{target}</b></div>)}</div>
  <div className="ibm-acp-metrics"><article><small>PARITY</small><strong>{parity.toFixed(1)}%</strong><span>Minimum 99.0%</span></article><article><small>SECURITY FAILURES</small><strong>{securityFailures}</strong><span>Must remain zero</span></article><article><small>DUPLICATE EFFECTS</small><strong>{duplicates}</strong><span>Must remain zero</span></article><article><small>CANARY</small><strong>{eligible?canary:0}%</strong><span>{eligible?'Eligible for controlled rollout':'Blocked'}</span></article></div>
  <div className="ibm-acp-controls">
   <label><span>Canary traffic <b>{canary}%</b></span><input type="range" min="0" max="100" value={canary} onChange={e=>setCanary(Number(e.target.value))}/></label>
   <label><span>Parity rate <b>{parity.toFixed(1)}%</b></span><input type="range" min="80" max="100" step="0.1" value={parity} onChange={e=>setParity(Number(e.target.value))}/></label>
   <label><span>Critical security failures <b>{securityFailures}</b></span><input type="range" min="0" max="3" value={securityFailures} onChange={e=>setSecurityFailures(Number(e.target.value))}/></label>
   <label><span>Duplicate side effects <b>{duplicates}</b></span><input type="range" min="0" max="3" value={duplicates} onChange={e=>setDuplicates(Number(e.target.value))}/></label>
  </div>
  <div className="ibm-acp-gates"><strong><ShieldCheck size={15}/> Non-compensable cutover gates</strong><p><span>{parity>=99?'PASS':'FAIL'}</span> Parity ≥ 99%</p><p><span>{securityFailures===0?'PASS':'FAIL'}</span> Zero critical security failures</p><p><span>{duplicates===0?'PASS':'FAIL'}</span> Zero duplicate side effects</p><small>Parity cannot compensate for a security regression or repeated write.</small></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote">Fixture {fixture.protocol} → A2A {fixture.target.protocolVersion}. Simulation only: no live traffic is routed. Use read-only shadow mode for parity tests and one authoritative writer for side effects.</p>
 </section>
}
