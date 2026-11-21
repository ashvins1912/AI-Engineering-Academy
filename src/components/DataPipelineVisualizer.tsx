import {useEffect,useMemo,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Database,ShieldCheck,ChartNoAxesCombined,GitBranch} from 'lucide-react'
import lesson from '../../content/topics/data-pipeline/lesson.json'
import fixture from '../../examples/stage-09/fixtures/data-feature-pipeline.json'

export default function DataPipelineVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [invalidRows,setInvalidRows]=useState(0),[testPercent,setTestPercent]=useState(20),[shift,setShift]=useState(0),[fitScope,setFitScope]=useState('train_only')
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setInvalidRows(0);setTestPercent(20);setShift(0);setFitScope('train_only')}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const train=Math.round(100*(100-testPercent)/100),test=100-train
 const mean=25+shift*.15,std=11.18
 const holdout=[50+shift,60+shift]
 const psi=useMemo(()=>{const x=shift/100;return Math.max(0,Math.min(3,x*x*1.8))},[shift])
 const contractPass=invalidRows===0,leakage=fitScope!=='train_only'
 const status=!contractPass?'contract_failed':leakage?'leakage_blocked':step===4?'manifest_ready':'running'
 const current=stages[step]
 return <section className="agent-loop-lab data-pipeline-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Database size={14}/> STAGE 09 · DATA PIPELINE LAB</span><h3>Build a reproducible feature pipeline</h3><p>Validate contracts, freeze split membership, fit on training rows only, inspect drift and publish lineage.</p></div><span className="agent-loop-count">STAGE {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{step===1?'rows=100; test='+testPercent+'%; seed=17':step===2?'train_rows='+train+'; fit_scope='+fitScope:step===3?'holdout='+holdout.join(',')+'; shift='+shift:current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===1?'split: '+train+' train / '+test+' holdout':step===2?'μ='+mean.toFixed(2)+'; σ='+std.toFixed(2):step===3?'PSI signal≈'+psi.toFixed(3):current.transformation}</code></div><div><small>OUTPUT</small><code>{!contractPass?'contract=failed; quarantine':leakage?'leakage=blocked; no publish':step===4?'manifest=sha256; source=v3; code=abc123':current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{!contractPass?'Contract failed: fix invalid rows before feature publication.':leakage?'Leakage detected: feature fit must use training rows only.':current.visualState}</div></article>
  <div className="data-pipeline-metrics"><article><small>INPUT ROWS</small><strong>100</strong><span>{invalidRows} injected invalid</span></article><article><small>TRAIN</small><strong>{train}</strong><span>Split seed 17</span></article><article><small>HOLDOUT</small><strong>{test}</strong><span>Never fit here</span></article><article><small>DRIFT SIGNAL</small><strong>{psi.toFixed(3)}</strong><span>{psi>.25?'Investigate shift':'No strong shift in demo'}</span></article></div>
  <div className="data-pipeline-state"><div><strong><GitBranch size={14}/> Pipeline state</strong><span>{fixture.sourceVersion} · {fixture.codeRevision}</span></div><div><code>contract</code><b>{contractPass?'passed':'failed'}</b></div><div><code>feature_fit_scope</code><b>{fitScope}</b></div><div><code>manifest</code><b>{status==='manifest_ready'?'registered':'not published'}</b></div></div>
  <div className="data-pipeline-controls">
   <label><span>Invalid rows <b>{invalidRows}</b></span><input type="range" min="0" max="10" value={invalidRows} onChange={e=>setInvalidRows(Number(e.target.value))}/></label>
   <label><span>Holdout percentage <b>{testPercent}%</b></span><input type="range" min="10" max="40" step="5" value={testPercent} onChange={e=>setTestPercent(Number(e.target.value))}/></label>
   <label><span>Distribution shift <b>{shift}%</b></span><input type="range" min="0" max="100" step="5" value={shift} onChange={e=>setShift(Number(e.target.value))}/></label>
   <label><span>Feature fit scope</span><select value={fitScope} onChange={e=>setFitScope(e.target.value)}><option value="train_only">Training rows only (safe)</option><option value="all_rows">All rows (leakage lab)</option></select></label>
  </div>
  <div className="data-pipeline-equation"><strong><ChartNoAxesCombined size={15}/> Numerical feature transform</strong><p>z = (x − μtrain) / σtrain</p><div><span>μtrain</span><b>{mean.toFixed(2)}</b><span>σtrain</span><b>{std.toFixed(2)}</b><span>holdout x</span><b>{holdout[0]}</b><span>holdout z</span><b>{((holdout[0]-mean)/std).toFixed(2)}</b></div><small>Training-only statistics are frozen and reused on holdout rows. The demo drift score is illustrative, not a production PSI implementation.</small></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> Simulation only. Real publication also verifies source snapshot immutability, temporal joins, tenant authorization and a production drift policy.</p>
 </section>
}
