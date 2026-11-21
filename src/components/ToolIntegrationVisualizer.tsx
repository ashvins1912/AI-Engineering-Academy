import {useEffect,useMemo,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,ShieldCheck,Timer,Activity,Database} from 'lucide-react'
import lesson from '../../content/topics/tooling/lesson.json'
import fixture from '../../examples/stage-07/fixtures/tool-integration.json'

export default function ToolIntegrationVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [tokens,setTokens]=useState(7),[status,setStatus]=useState("503"),[attempts,setAttempts]=useState(3),[failures,setFailures]=useState(3),[hasKey,setHasKey]=useState(true),[samePayload,setSamePayload]=useState(true)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setTokens(7);setStatus("503");setAttempts(3);setFailures(3);setHasKey(true);setSamePayload(true)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const breakerOpen=failures>=3
 const quotaOk=tokens>0
 const replay=hasKey&&samePayload
 const backoff=useMemo(()=>Array.from({length:attempts},(_,i)=>Math.round(200*Math.pow(2,i))),[attempts])
 const outcome=status==="timeout"?"unknown; reconcile with same key":Number(status)>=500||Number(status)===429?"retry only if safe/idempotent":"provider response received"
 const outputs=[
  "schema=valid; tenant=tenant-a; scope=refund:write",
  "tokens_after_call="+Math.max(0,tokens-1)+"; quota="+(quotaOk?"admitted":"rejected"),
  replay?"idempotency=key+payload match; duplicate → cached result":hasKey?"idempotency conflict; payload hash mismatch":"no key; non-idempotent write cannot retry",
  "status="+status+"; attempts="+attempts+"; backoff_ms=["+backoff.join(",")+"]; breaker="+(breakerOpen?"OPEN":"CLOSED"),
  outcome+"; provider_ref=refund-88; result persisted"
 ]
 return <section className="agent-loop-lab tool-integration-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Activity size={14}/> STAGE 07 · TOOL RESILIENCE LAB</span><h3>Make tool calls safe under failure</h3><p>Inspect schema, tenant policy, quotas, idempotency, retries, circuit breaker and reconciliation.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===1?'token_bucket.consume(1); bulkhead.acquire()':step===2?'key=refund-ORD-7; payload_hash='+ (samePayload?'matches':'DIFFERS'):step===3?'retry_policy(max='+attempts+'); breaker='+(breakerOpen?'OPEN':'CLOSED'):current.transformation}</code></div><div><small>OUTPUT</small><code>{outputs[step]}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{!quotaOk&&step===1?'Quota exhausted: reject before provider call.':step===2&&!samePayload?'Idempotency conflict: same key cannot represent a different payload.':step===3&&breakerOpen?'Circuit OPEN: fail fast; do not send more provider traffic.':step===4&&status==='timeout'?'Ambiguous outcome: do not create a new key or repeat the refund.':current.visualState}</div></article>
  <div className="tool-integration-metrics"><article><small>RATE TOKENS</small><strong>{tokens}/10</strong><span>Refill 2 tokens/sec</span></article><article><small>RETRY BUDGET</small><strong>{attempts}</strong><span>Max attempts</span></article><article><small>CIRCUIT</small><strong>{breakerOpen?'OPEN':'CLOSED'}</strong><span>{failures} consecutive failures</span></article><article><small>IDEMPOTENCY</small><strong>{replay?'REPLAY SAFE':hasKey?'CONFLICT':'NO KEY'}</strong><span>Tenant + tool + key</span></article></div>
  <div className="tool-integration-controls">
   <label><span>Available rate tokens <b>{tokens}</b></span><input type="range" min="0" max="10" value={tokens} onChange={e=>setTokens(Number(e.target.value))}/></label>
   <label><span>Provider response</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="200">200 success</option><option value="429">429 rate limited</option><option value="503">503 unavailable</option><option value="timeout">Timeout (unknown outcome)</option></select></label>
   <label><span>Maximum attempts <b>{attempts}</b></span><input type="range" min="1" max="5" value={attempts} onChange={e=>setAttempts(Number(e.target.value))}/></label>
   <label><span>Consecutive dependency failures <b>{failures}</b></span><input type="range" min="0" max="5" value={failures} onChange={e=>setFailures(Number(e.target.value))}/></label>
   <label><span>Stable idempotency key</span><input type="checkbox" checked={hasKey} onChange={e=>setHasKey(e.target.checked)}/></label>
   <label><span>Same payload fingerprint</span><input type="checkbox" checked={samePayload} onChange={e=>setSamePayload(e.target.checked)}/></label>
  </div>
  <div className="tool-integration-ledger"><strong><Database size={15}/> Idempotency ledger</strong><div><code>tenant</code><b>tenant-a</b></div><div><code>tool</code><b>{fixture.tool.name}</b></div><div><code>order / amount</code><b>{fixture.request.orderId} / ₹{fixture.request.amount}</b></div><div><code>key</code><b>{hasKey?fixture.request.idempotencyKey:'missing'}</b></div><div><code>payload hash</code><b>{samePayload?'abc123':'mismatch'}</b></div><div><code>state</code><b>{!hasKey?'unprotected':!samePayload?'conflict':status==='timeout'?'unknown → reconcile':'pending / succeeded'}</b></div><small>Provider timeout is an unknown state, not proof that the side effect failed.</small></div>
  <div className="tool-integration-backoff"><strong><Timer size={14}/> Exponential backoff schedule</strong><div>{backoff.map((ms,i)=><span key={i}>Attempt {i+1}<b>{ms} ms + jitter</b></span>)}</div></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> Simulation only: no external API calls are made. Retry only safe/idempotent operations and reconcile ambiguous writes with the original provider key.</p>
 </section>
}
