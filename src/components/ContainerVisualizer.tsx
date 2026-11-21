import {useEffect,useMemo,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Box,ShieldCheck,Cpu,Database} from 'lucide-react'
import lesson from '../../content/topics/containers/lesson.json'
export default function ContainerVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [memory,setMemory]=useState(256),[concurrency,setConcurrency]=useState(2),[uid,setUid]=useState(10001),[verified,setVerified]=useState(true)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setMemory(256);setConcurrency(2);setUid(10001);setVerified(true)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const baseline=260,peak=baseline+18*concurrency
 const safe=peak<=memory,nonRoot=uid!==0
 const ready=verified&&step>=4
 const current=stages[step]
 const status=!verified?'blocked_model_unverified':!nonRoot?'blocked_root_user':!safe?'oom_risk':ready?'ready':'initializing'
 const estimate=useMemo(()=>({baseline:90+110+35+25,peak:90+110+35+25+18*concurrency}),[concurrency])
 return <section className="agent-loop-lab container-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Box size={14}/> STAGE 09 · CONTAINER RELEASE LAB</span><h3>Build and harden an inference image</h3><p>Inspect multi-stage builds, non-root identity, memory budgets, readiness and graceful shutdown.</p></div><span className="agent-loop-count">STAGE {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{step===3?'uid='+uid+'; memory_limit='+memory+'MiB; concurrency='+concurrency:current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===3?estimate.baseline+' + 18×'+concurrency+' = '+estimate.peak+' MiB':step===4?'model_verified='+verified+'; readiness gate':current.transformation}</code></div><div><small>OUTPUT</small><code>{!verified?'ready=false; artifact verification failed':!nonRoot?'policy=blocked; uid=0':!safe?'oom_risk; estimated_peak='+peak+'MiB':step===4?'ready=true; digest=sha256:...':current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{!verified?'Model verification failed: do not serve traffic.':!nonRoot?'Root runtime rejected by policy.':!safe?'Estimated memory exceeds the cgroup limit; reduce concurrency/model or raise measured capacity.':current.visualState}</div></article>
  <div className="container-metrics"><article><small>BASELINE MEMORY</small><strong>{estimate.baseline} MiB</strong><span>Runtime + model + cache + buffers</span></article><article><small>ESTIMATED PEAK</small><strong>{estimate.peak} MiB</strong><span>{safe?'Within configured limit':'Exceeds configured limit'}</span></article><article><small>MEMORY LIMIT</small><strong>{memory} MiB</strong><span>Container cgroup limit</span></article><article><small>RUNTIME UID</small><strong>{uid}</strong><span>{nonRoot?'Non-root':'Root — blocked'}</span></article></div>
  <div className="container-state"><div><strong><Database size={14}/> Runtime policy state</strong><span>academy-inference · sha256 digest</span></div><div><code>runtime_user</code><b>{nonRoot?'non-root':'root (denied)'}</b></div><div><code>root_filesystem</code><b>read-only</b></div><div><code>model_verified</code><b>{verified?'true':'false'}</b></div><div><code>readiness</code><b>{ready?'healthy':'not ready'}</b></div><div><code>policy_status</code><b>{status}</b></div></div>
  <div className="container-controls">
   <label><span>Memory limit <b>{memory} MiB</b></span><input type="range" min="128" max="1024" step="32" value={memory} onChange={e=>setMemory(Number(e.target.value))}/></label>
   <label><span>Concurrent requests <b>{concurrency}</b></span><input type="range" min="1" max="16" value={concurrency} onChange={e=>setConcurrency(Number(e.target.value))}/></label>
   <label><span>Runtime UID <b>{uid}</b></span><input type="range" min="0" max="10001" step="1" value={uid} onChange={e=>setUid(Number(e.target.value))}/></label>
   <label className="container-verify-toggle"><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> Model artifact digest verified</label>
  </div>
  <div className="container-memory-equation"><strong><Cpu size={15}/> Peak memory estimate</strong><p>90 + 110 + 35 + 25 + (18 × concurrency)</p><div><span>Runtime</span><b>90 MiB</b><span>Model</span><b>110 MiB</b><span>Cache</span><b>35 MiB</b><span>Buffers</span><b>25 MiB</b><span>Requests</span><b>{18*concurrency} MiB</b></div><small>Illustrative budget only. Real limits must be based on measured RSS and cgroup peak memory, including framework workspaces and transient allocations.</small></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> Simulation only. It estimates memory from a fixed example and does not run Docker or inspect host cgroups. Use load tests and runtime metrics before setting production limits.</p>
 </section>
}
