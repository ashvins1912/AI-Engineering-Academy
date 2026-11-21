import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,ChartLine,ShieldAlert,Database,GitCompareArrows} from 'lucide-react'
import lesson from '../../content/topics/eval-ci/lesson.json'
import fixture from '../../examples/stage-09/fixtures/evaluation-ci.json'

export default function EvaluationCIVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [baseline,setBaseline]=useState(92),[candidate,setCandidate]=useState(90),[p95,setP95]=useState(1800),[safety,setSafety]=useState(0),[costMilli,setCostMilli]=useState(5)
 const delta=candidate-baseline
 const gates={minimum:candidate>=90,regression:delta>=-1,safety:safety===0,latency:p95<=1500,cost:costMilli<=10}
 const passed=Object.values(gates).every(Boolean)
 const current=stages[step]
 const reportHash='sha256:eval-'+(passed?'PASS':'BLOCK')+'-H2'
 const outputs=[
  'dataset_hash=H1; cases=100; evaluator=deterministic-v1',
  'baseline_success='+baseline+'%; safety_violations=0',
  'candidate_success='+candidate+'%; delta='+delta+'pp; p95='+p95+'ms; cost=$'+(costMilli/1000).toFixed(3),
  'quality='+ (gates.minimum&&gates.regression?'pass':'fail')+'; safety='+(gates.safety?'pass':'fail')+'; latency='+(gates.latency?'pass':'fail')+'; cost='+(gates.cost?'pass':'fail')+'; release='+(passed?'allowed':'blocked'),
  'report_hash='+reportHash+'; exit_code='+(passed?0:1)
 ]
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setBaseline(92);setCandidate(90);setP95(1800);setSafety(0);setCostMilli(5)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 return <section className="agent-loop-lab evaluation-ci-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><ChartLine size={14}/> STAGE 09 · EVALUATION IN CI LAB</span><h3>Make model quality a release gate</h3><p>Compare baseline and candidate on the same golden set. Inspect quality, safety, latency and cost gates independently.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===3?'quality ≥90%; regression ≥−1pp; safety=0; p95≤1500ms; cost≤$0.01':'same case IDs → deterministic scoring → immutable report'}</code></div><div><small>OUTPUT</small><code>{outputs[step]}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===3&&!passed?'One or more hard gates failed; no blended score can override them.':step===4?passed?'Report persisted. CI allows the next release step.':'Report persisted. CI exits 1 and blocks promotion.':current.visualState}</div></article>
  <div className="evaluation-ci-metrics">
   <article><small>BASELINE</small><strong>{baseline}%</strong><span>Approved bundle · 100 cases</span></article>
   <article><small>CANDIDATE</small><strong>{candidate}%</strong><span>Candidate · 100 same cases</span></article>
   <article><small>REGRESSION</small><strong>{delta>0?'+':''}{delta}pp</strong><span>Maximum allowed decline: 1pp</span></article>
   <article><small>CI DECISION</small><strong>{passed?'PASS':'BLOCK'}</strong><span>Exit code {passed?0:1}</span></article>
  </div>
  <div className="evaluation-gates">
   <strong><ShieldAlert size={14}/> Independent release gates</strong>
   {Object.entries(gates).map(([name,ok])=><div key={name}><span>{({minimum:'Minimum task success ≥ 90%',regression:'Regression no worse than −1pp',safety:'Critical safety violations = 0',latency:'p95 latency ≤ 1,500 ms',cost:'Maximum cost per case ≤ $0.01'} as Record<string,string>)[name]}</span><b className={ok?'gate-pass':'gate-fail'}>{ok?'PASS':'FAIL'}</b></div>)}
  </div>
  <div className="evaluation-controls">
   <label><span><b>Baseline success</b><strong>{baseline}%</strong></span><input type="range" min="50" max="100" value={baseline} onChange={e=>setBaseline(Number(e.target.value))}/></label>
   <label><span><b>Candidate success</b><strong>{candidate}%</strong></span><input type="range" min="50" max="100" value={candidate} onChange={e=>setCandidate(Number(e.target.value))}/></label>
   <label><span><b>Candidate p95 latency</b><strong>{p95} ms</strong></span><input type="range" min="200" max="3000" step="50" value={p95} onChange={e=>setP95(Number(e.target.value))}/></label>
   <label><span><b>Critical safety violations</b><strong>{safety}</strong></span><input type="range" min="0" max="5" value={safety} onChange={e=>setSafety(Number(e.target.value))}/></label>
   <label><span><b>Maximum cost per case</b><strong>${(costMilli/1000).toFixed(3)}</strong></span><input type="range" min="0" max="50" value={costMilli} onChange={e=>setCostMilli(Number(e.target.value))}/></label>
  </div>
  <div className="evaluation-report"><div><strong><Database size={14}/> Immutable evaluation report</strong><span>{fixture.bundleDigest}</span></div><article><code>dataset_hash</code><b>H1 · golden-set v4</b></article><article><code>evaluator / policy</code><b>deterministic-v1 / release-policy-v2</b></article><article><code>case coverage</code><b>100 / 100</b></article><article><code>report hash</code><b>{reportHash}</b></article><article><code>promotion evidence</code><b>{passed?'eligible for approval':'blocked by CI'}</b></article></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><GitCompareArrows size={13}/> Teaching simulation: the deterministic example uses required-fact and forbidden-phrase checks. Real evaluations should add reviewed rubrics, confidence intervals, segment slices and human sampling; a judge model cannot override safety gates.</p>
 </section>
}
