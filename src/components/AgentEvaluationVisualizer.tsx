import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Activity,ShieldCheck,Database} from 'lucide-react'
import lesson from '../../content/topics/agent-eval/lesson.json'
import fixture from '../../examples/stage-06/fixtures/agent-evaluation.json'
export default function AgentEvaluationVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [success,setSuccess]=useState(92),[safetyFailures,setSafetyFailures]=useState(1),[p95,setP95]=useState(1800),[cost,setCost]=useState(12)
 const [missingApproval,setMissingApproval]=useState(false)
 const eligible=safetyFailures===0&&!missingApproval&&p95<=2000&&cost<=20
 const quality=(success*.4+96*.25+88*.25+95*.1)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setSuccess(92);setSafetyFailures(1);setP95(1800);setCost(12);setMissingApproval(false)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const hardGates=[{name:'Tenant isolation',pass:safetyFailures===0},{name:'HITL approval',pass:!missingApproval},{name:'P95 latency',pass:p95<=2000},{name:'Cost per task',pass:cost<=20}]
 return <section className="agent-loop-lab evaluation-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Activity size={14}/> STAGE 06 · AGENT EVALUATION LAB</span><h3>Evaluate the trajectory, not just the answer.</h3><p>Change task success, safety failures, tail latency and cost. Observe the release gate.</p></div><span className="agent-loop-count">STAGE {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{step===2?'success='+success+'%; tool_accuracy=96%; grounded=88%':step===3?'cross_tenant='+safetyFailures+'; missing_approval='+(missingApproval?1:0):current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===2?'quality_score='+quality.toFixed(1)+'/100':step===3?'hard_gates = '+hardGates.filter(x=>x.pass).length+'/'+hardGates.length:current.transformation}</code></div><div><small>OUTPUT</small><code>{step===3?'eligible='+eligible+'; reason='+(eligible?'all_gates_pass':'critical_gate_failure'):step===4?'p95='+p95+'ms; cost=$0.0'+cost+'/task':current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===3&&!eligible?'Release blocked: hard safety or operational gate failed.':step===4?eligible?'Candidate is eligible for canary evaluation.':'Candidate remains blocked pending remediation.':current.visualState}</div></article>
  <div className="evaluation-metrics"><article><small>TASK SUCCESS</small><strong>{success}%</strong><span>Goal completion rate</span></article><article><small>QUALITY SCORE</small><strong>{quality.toFixed(1)}</strong><span>Illustrative composite / 100</span></article><article><small>P95 LATENCY</small><strong>{p95} ms</strong><span>Tail latency budget 2,000 ms</span></article><article><small>RELEASE STATUS</small><strong>{eligible?'ELIGIBLE':'BLOCKED'}</strong><span>{safetyFailures} safety failure(s)</span></article></div>
  <div className="evaluation-controls">
   <label><span>Task success rate <b>{success}%</b></span><input type="range" min="50" max="100" value={success} onChange={e=>setSuccess(Number(e.target.value))}/></label>
   <label><span>Critical safety failures <b>{safetyFailures}</b></span><input type="range" min="0" max="5" value={safetyFailures} onChange={e=>setSafetyFailures(Number(e.target.value))}/></label>
   <label><span>P95 latency <b>{p95} ms</b></span><input type="range" min="200" max="5000" step="100" value={p95} onChange={e=>setP95(Number(e.target.value))}/></label>
   <label><span>Cost per task <b>$0.{String(cost).padStart(2,'0')}</b></span><input type="range" min="1" max="100" value={cost} onChange={e=>setCost(Number(e.target.value))}/></label>
   <label className="evaluation-toggle"><input type="checkbox" checked={missingApproval} onChange={e=>setMissingApproval(e.target.checked)}/> Inject missing human approval</label>
  </div>
  <div className="evaluation-gates"><strong><ShieldCheck size={15}/> Non-compensable release gates</strong>{hardGates.map(x=><div key={x.name}><span>{x.name}</span><b className={x.pass?'pass':'fail'}>{x.pass?'PASS':'FAIL'}</b></div>)}</div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><Database size={13}/> Dataset {fixture.datasetId} · {fixture.cases.length} fixture examples · simulated metrics only. Run the Python harness for deterministic evaluation results.</p>
 </section>
}
