import {useEffect,useMemo,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,ChartLine,Database,FileCheck2,FlaskConical} from 'lucide-react'
import lesson from '../../content/topics/experiment/lesson.json'
import fixture from '../../examples/stage-09/fixtures/experiment-tracking.json'

export default function ExperimentTrackingVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [seed,setSeed]=useState(42),[lr,setLr]=useState(10),[epochs,setEpochs]=useState(12),[datasetVersion,setDatasetVersion]=useState(3),[splitLeak,setSplitLeak]=useState(false)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setSeed(42);setLr(10);setEpochs(12);setDatasetVersion(3);setSplitLeak(false)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const runB=Math.min(0.99,Math.max(0.5,0.84+epochs*0.005+Math.max(0,20-lr)*0.0005+(seed===42?0.01:0)))
 const compatible=datasetVersion===3&&!splitLeak
 const curve=useMemo(()=>Array.from({length:epochs},(_,i)=>Math.min(0.99,0.55+(runB-0.55)*(i+1)/epochs)),[epochs,runB])
 const outputs=[
  "dataset=v"+datasetVersion+"; content_hash=sha256:ab12; split_overlap="+(splitLeak?1:0),
  "run_id=run-B; seed="+seed+"; lr="+(lr/1000).toFixed(3)+"; epochs="+epochs,
  "val_accuracy="+runB.toFixed(3)+"; metric_points="+epochs+"; artifact_hash=sha256:2222",
  compatible?"comparison=valid; delta="+(runB-0.91).toFixed(3):"comparison=blocked; dataset/split protocol mismatch",
  "seed="+seed+"; code_commit=8f3a; lockfile_hash=lock-42; dataset_match="+compatible
 ]
 return <section className="agent-loop-lab experiment-tracking-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><FlaskConical size={14}/> STAGE 09 · EXPERIMENT TRACKING LAB</span><h3>Make every model run reproducible</h3><p>Inspect dataset lineage, immutable parameters, metric history, artifact hashes and fair run comparison.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===1?'seed='+seed+'; lr='+lr+'/1000; epochs='+epochs:step===3?'compare dataset_hash + split_hash + metric_protocol':current.transformation}</code></div><div><small>OUTPUT</small><code>{outputs[step]}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===3&&!compatible?'Run comparison blocked: dataset version or split integrity differs.':step===4&&compatible?'Reproduction metadata matches the recorded experiment context.':current.visualState}</div></article>
  <div className="experiment-dataset-card"><strong><Database size={14}/> Immutable dataset manifest</strong><div><span>Dataset</span><b>reviews-v{datasetVersion}</b></div><div><span>Rows</span><b>10,000</b></div><div><span>Content hash</span><b>{fixture.dataset.contentHash}</b></div><div><span>Split hash</span><b>{fixture.dataset.splitHash}</b></div><div><span>Train / validation / test</span><b>8,000 / 1,000 / 1,000</b></div><div><span>Split integrity</span><b>{splitLeak?'OVERLAP DETECTED':'disjoint'}</b></div></div>
  <div className="experiment-run-grid"><article><small>RUN A · LOGISTIC REGRESSION</small><strong>{fixture.runA.validationAccuracy.toFixed(2)}</strong><span>Validation accuracy · 8 epochs</span><code>{fixture.runA.runId} · seed {fixture.runA.seed}</code></article><article><small>RUN B · NEURAL NETWORK</small><strong>{runB.toFixed(2)}</strong><span>Validation accuracy · {epochs} epochs</span><code>run-B · seed {seed}</code></article></div>
  <div className="experiment-metric-curve"><strong><ChartLine size={14}/> Run B validation accuracy by epoch</strong>{curve.map((value,i)=><div key={i}><small>{i+1}</small><span><i style={{width:(value*100)+'%'}}/></span><b>{value.toFixed(3)}</b></div>)}</div>
  <div className="experiment-controls">
   <label><span>Random seed <b>{seed}</b></span><input type="range" min="1" max="1000" value={seed} onChange={e=>setSeed(Number(e.target.value))}/></label>
   <label><span>Learning rate × 1000 <b>{lr}</b></span><input type="range" min="1" max="100" value={lr} onChange={e=>setLr(Number(e.target.value))}/></label>
   <label><span>Training epochs <b>{epochs}</b></span><input type="range" min="1" max="30" value={epochs} onChange={e=>setEpochs(Number(e.target.value))}/></label>
   <label><span>Dataset version <b>v{datasetVersion}</b></span><input type="range" min="1" max="5" value={datasetVersion} onChange={e=>setDatasetVersion(Number(e.target.value))}/></label>
   <label><span>Inject split leakage</span><input type="checkbox" checked={splitLeak} onChange={e=>setSplitLeak(e.target.checked)}/></label>
  </div>
  <div className="experiment-repro-card"><strong><FileCheck2 size={15}/> Reproducibility checklist</strong><div><span>Git commit</span><b>8f3a</b></div><div><span>Environment lock</span><b>lock-42</b></div><div><span>Seed / config</span><b>{seed} / lr={(lr/1000).toFixed(3)}</b></div><div><span>Dataset / split</span><b>{compatible?'MATCH':'MISMATCH'}</b></div><div><span>Artifact SHA-256</span><b>{fixture.runB.artifactHash}</b></div><small>Matching seeds alone do not guarantee bitwise determinism across hardware and kernels.</small></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote">Simulation only: metric curves are illustrative. The Python labs train a deterministic toy model and persist actual run metadata locally.</p>
 </section>
}
