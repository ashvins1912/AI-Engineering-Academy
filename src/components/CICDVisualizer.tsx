import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,GitBranch,ShieldCheck,PackageCheck} from 'lucide-react'
import lesson from '../../content/topics/cicd/lesson.json'
import fixture from '../../examples/stage-09/fixtures/cicd-release.json'
export default function CICDVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [tests,setTests]=useState(true),[critical,setCritical]=useState(0),[traffic,setTraffic]=useState(5),[errors,setErrors]=useState(3)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setTests(true);setCritical(0);setTraffic(5);setErrors(3)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const blocked=!tests||critical>0
 const rollback=errors>2
 const current=stages[step]
 const release=blocked?'blocked':step>=4&&rollback?'rolled_back':step>=4?'promoted':'candidate'
 const active=step>=4&&rollback?'release-2026-11-20.3':fixture.candidate.releaseId
 return <section className="agent-loop-lab cicd-release-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><GitBranch size={14}/> STAGE 09 · RELEASE PIPELINE LAB</span><h3>Promote one immutable AI release</h3><p>Pass test and security gates, promote by digest, evaluate canary traffic and restore the previous release on regression.</p></div><span className="agent-loop-count">GATE {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{step===0?'tests='+tests+'; critical_cves='+critical:step===3?'traffic='+traffic+'%; errors='+errors+'%':current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===0?'quality gate + security policy':step===3?'error_rate='+errors+'%; budget=2%':current.transformation}</code></div><div><small>OUTPUT</small><code>{blocked?'candidate=blocked':step===3&&rollback?'decision=rollback':step===4?'active_release='+active:current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{blocked?'Required test or critical vulnerability gate failed. Promotion is blocked.':step===3&&rollback?'Canary error rate breached 2% budget; restore the previous digest.':current.visualState}</div></article>
  <div className="cicd-stage-track">{['CI','BUILD','DEV','STAGING','CANARY','PRODUCTION'].map((x,i)=><div key={x} className={i<=step?'done':''}><span>{i<2?'✓':i===4?'◉':'○'}</span><small>{x}</small></div>)}</div>
  <div className="cicd-release-state"><div><strong><PackageCheck size={14}/> Release bundle</strong><span>{fixture.candidate.releaseId}</span></div><div><code>image_digest</code><b>{fixture.candidate.imageDigest.slice(0,24)}…</b></div><div><code>sbom</code><b>{fixture.candidate.sbomDigest.slice(0,24)}…</b></div><div><code>active_release</code><b>{active}</b></div><div><code>release_state</code><b>{release}</b></div></div>
  <div className="cicd-controls">
   <label className="cicd-toggle"><input type="checkbox" checked={tests} onChange={e=>setTests(e.target.checked)}/> Tests and AI evaluation passed</label>
   <label><span>Critical vulnerabilities <b>{critical}</b></span><input type="range" min="0" max="5" value={critical} onChange={e=>setCritical(Number(e.target.value))}/></label>
   <label><span>Canary traffic <b>{traffic}%</b></span><input type="range" min="1" max="50" value={traffic} onChange={e=>setTraffic(Number(e.target.value))}/></label>
   <label><span>Canary error rate <b>{errors}%</b></span><input type="range" min="0" max="10" value={errors} onChange={e=>setErrors(Number(e.target.value))}/></label>
  </div>
  <div className="cicd-metrics"><article><small>ERROR BUDGET</small><strong>2%</strong><span>Release threshold</span></article><article><small>OBSERVED ERRORS</small><strong>{errors}%</strong><span>{rollback?'Rollback required':'Within budget'}</span></article><article><small>CANARY REQUESTS</small><strong>{traffic*200}</strong><span>5% of 20k baseline = 1k</span></article><article><small>DECISION</small><strong>{blocked?'BLOCK':step>=3&&rollback?'ROLLBACK':'CONTINUE'}</strong><span>Gate-driven release</span></article></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> Simulation only. The executable Python release policy enforces gates and alias rollback. This lab does not publish images or deploy infrastructure.</p>
 </section>
}
