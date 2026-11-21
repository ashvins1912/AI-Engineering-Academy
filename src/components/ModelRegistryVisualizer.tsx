import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Boxes,GitBranch,Database,AlertTriangle} from 'lucide-react'
import lesson from '../../content/topics/registry/lesson.json'
import fixture from '../../examples/stage-09/fixtures/model-prompt-registry.json'

export default function ModelRegistryVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [quality,setQuality]=useState(94),[compatible,setCompatible]=useState(true),[approved,setApproved]=useState(true),[canary,setCanary]=useState(4)
 const promotionAllowed=quality>=90&&compatible&&approved
 const promoted=promotionAllowed&&step>=3
 const rolledBack=promoted&&step>=4&&canary>1
 const production=rolledBack||!promoted?'release-12':'release-13'
 const aliasVersion=rolledBack?9:promoted?8:7
 const current=stages[step]
 const outputs=[
  'model=v13; prompt=p9; immutable=true',
  compatible?'compatibility=pass; integrity=verified':'compatibility=blocked; mismatch detected',
  approved?'reviewer=release-reviewer; approval=bound-to-H1':'approval=missing; promotion blocked',
  promotionAllowed?'production=release-13; alias_version=8':'promotion=blocked; policy gates incomplete',
  !promoted?'production=release-12; rollback=not-required':rolledBack?'production=release-12; alias_version=9':'production=release-13; canary=within-threshold'
 ]
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setQuality(94);setCompatible(true);setApproved(true);setCanary(4)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 return <section className="agent-loop-lab model-registry-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Boxes size={14}/> STAGE 09 · MODEL AND PROMPT REGISTRY</span><h3>Promote a governed release bundle</h3><p>Bind immutable model and prompt versions, validate contracts, require independent approval and roll back by moving an alias.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===2?'quality ≥ 90; compatibility; independent reviewer':step===3?'CAS expected_alias_version=7; authorized release manager':step===4?'canary_error_rate='+canary+'%; threshold=1%':'sha256 digest + provenance + schema contract'}</code></div><div><small>OUTPUT</small><code>{outputs[step]}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===3&&!promotionAllowed?'Release blocked until every gate passes.':step===4&&rolledBack?'Canary breach: complete prior bundle restored; failed release retained.':step===4&&promoted?'Canary is healthy; new bundle remains live.':current.visualState}</div></article>
  <div className="registry-release-metrics">
   <article><small>MODEL VERSION</small><strong>v13</strong><span>{fixture.model.digest}</span></article>
   <article><small>PROMPT VERSION</small><strong>p9</strong><span>{fixture.prompt.digest}</span></article>
   <article><small>QUALITY GATE</small><strong>{quality}%</strong><span>{quality>=90?'Pass · minimum 90%':'Blocked · minimum 90%'}</span></article>
   <article><small>PRODUCTION ALIAS</small><strong>{production}</strong><span>alias version {aliasVersion}</span></article>
  </div>
  <div className="registry-manifest"><div><strong><Database size={14}/> Release bundle manifest</strong><span>sha256:manifest-H1</span></div>
   <article><code>model</code><b>support-assistant:v13</b></article>
   <article><code>prompt</code><b>support-system:p9</b></article>
   <article><code>tokenizer / tools</code><b>tok-v3 / tools-v4</b></article>
   <article><code>source run / dataset</code><b>run-2026-11-21-014 / dataset-42</b></article>
   <article><code>evaluation / safety</code><b>eval-0.94 / support-safety-v5</b></article>
   <article><code>approval</code><b>{approved?'reviewer · approved':'not approved'}</b></article>
  </div>
  <div className="registry-controls">
   <label><span><b>Evaluation quality</b><strong>{quality}% · threshold 90%</strong></span><input type="range" min="0" max="100" value={quality} onChange={e=>setQuality(Number(e.target.value))}/></label>
   <label><span><b>Canary error rate</b><strong>{canary}% · rollback above 1%</strong></span><input type="range" min="0" max="10" step="0.5" value={canary} onChange={e=>setCanary(Number(e.target.value))}/></label>
   <label className="registry-toggle"><input type="checkbox" checked={compatible} onChange={e=>setCompatible(e.target.checked)}/> Model, prompt, tokenizer and tool schemas compatible</label>
   <label className="registry-toggle"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/> Independent reviewer approved exact manifest hash</label>
  </div>
  <div className="registry-alias-history"><strong><GitBranch size={14}/> Alias history</strong><div><span>v7</span><b>release-12</b><small>previous production</small></div><div><span>v8</span><b>{promoted?'release-13':'not promoted'}</b><small>compare-and-swap promotion</small></div><div><span>v9</span><b>{rolledBack?'release-12':'not yet written'}</b><small>rollback after canary gate</small></div></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><AlertTriangle size={13}/> Simulation only. The SQLite example uses server-supplied role allow-lists; production must derive roles from authenticated identity, verify signatures through a trusted KMS/attestor, and emit runtime-loaded digests.</p>
 </section>
}
