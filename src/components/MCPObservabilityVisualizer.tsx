import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Activity,ShieldCheck,RefreshCw,Database} from 'lucide-react'
import lesson from '../../content/topics/mcp-observability/lesson.json'
import fixture from '../../examples/stage-07/fixtures/mcp-observability.json'
export default function MCPObservabilityVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [failureRate,setFailureRate]=useState(30),[retries,setRetries]=useState(3),[threshold,setThreshold]=useState(3),[duplicates,setDuplicates]=useState(3)
 const [providerSucceeded,setProviderSucceeded]=useState(false),[reconciled,setReconciled]=useState(false)
 const breakerOpen=failureRate>=threshold*20
 const providerCalls=providerSucceeded||reconciled?1:Math.min(retries+1,4)
 const duplicateLogicalOps=1
 const status=reconciled?'COMPLETED':providerSucceeded?'PENDING_RECONCILIATION':breakerOpen?'CIRCUIT_OPEN':'RETRY_BOUNDED'
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setFailureRate(30);setRetries(3);setThreshold(3);setDuplicates(3);setProviderSucceeded(false);setReconciled(false)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 return <section className="agent-loop-lab mcp-observability-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Activity size={14}/> STAGE 07 · MCP OPERATIONS LAB</span><h3>Observe failures and recover without duplicate writes.</h3><p>Inspect redacted traces, p95 latency, retry budgets, circuit state and idempotent reconciliation.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>RELIABILITY ACTION</small><code>{step===2?'retry_count='+retries+'; breaker_threshold='+threshold:step===3?'duplicate_requests='+duplicates+'; idempotency_key=refund:ORD-7:v4':current.transformation}</code></div><div><small>OUTPUT</small><code>{step===2?'breaker='+ (breakerOpen?'OPEN':'CLOSED')+'; retries≤'+retries:step===4?'status='+status+'; provider_calls='+providerCalls+'; logical_ops='+duplicateLogicalOps:current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===4&&reconciled?'Provider result reconciled; duplicate requests reuse the completed result.':step===2&&breakerOpen?'Circuit breaker is open; fail fast until cooldown and one probe.':current.visualState}</div></article>
  <div className="mcp-ops-metrics"><article><small>TRACE</small><strong>trace-42</strong><span>token=[REDACTED]</span></article><article><small>ERROR RATE</small><strong>{failureRate}%</strong><span>simulated provider errors</span></article><article><small>P95 LATENCY</small><strong>{failureRate>=60?'4,200':'1,800'} ms</strong><span>tail latency</span></article><article><small>BREAKER</small><strong>{breakerOpen?'OPEN':'CLOSED'}</strong><span>threshold {threshold}</span></article></div>
  <div className="mcp-ops-controls">
   <label><span>Provider failure rate <b>{failureRate}%</b></span><input type="range" min="0" max="100" step="10" value={failureRate} onChange={e=>setFailureRate(Number(e.target.value))}/></label>
   <label><span>Maximum retries <b>{retries}</b></span><input type="range" min="0" max="5" value={retries} onChange={e=>setRetries(Number(e.target.value))}/></label>
   <label><span>Circuit threshold <b>{threshold}</b></span><input type="range" min="1" max="5" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label>
   <label><span>Duplicate requests <b>{duplicates}</b></span><input type="range" min="1" max="10" value={duplicates} onChange={e=>setDuplicates(Number(e.target.value))}/></label>
  </div>
  <div className="mcp-ops-actions"><button onClick={()=>setProviderSucceeded(true)}><Database size={14}/> Simulate provider success + local crash</button><button onClick={()=>setReconciled(true)} disabled={!providerSucceeded}><RefreshCw size={14}/> Reconcile by idempotency key</button></div>
  <div className="mcp-ops-ledger"><strong><ShieldCheck size={15}/> Idempotency ledger</strong><div><span>Key</span><b>refund:ORD-7:v4</b></div><div><span>Logical operations</span><b>1 (same key replayed {duplicates}×)</b></div><div><span>Provider calls</span><b>{providerCalls}</b></div><div><span>Ledger status</span><b>{status}</b></div></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote">Fixture {fixture.scenario}. Retries are safe only with idempotency; a pending operation is reconciled, never blindly resubmitted.</p>
 </section>
}
