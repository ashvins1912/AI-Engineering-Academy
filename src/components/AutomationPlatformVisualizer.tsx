import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Workflow,ShieldCheck,Globe,KeyRound} from 'lucide-react'
import lesson from '../../content/topics/automation-tools/lesson.json'
import fixture from '../../examples/stage-08/fixtures/automation-platform.json'

export default function AutomationPlatformVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [apiAvailable,setApiAvailable]=useState(true),[originAllowed,setOriginAllowed]=useState(true),[approved,setApproved]=useState(true),[duplicate,setDuplicate]=useState(false)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setApiAvailable(true);setOriginAllowed(true);setApproved(true);setDuplicate(false)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const integration=apiAvailable?"API connector":"browser fallback"
 const blockedBrowser=!apiAvailable&&!originAllowed
 const finalState=duplicate?"duplicate_trigger_ignored":blockedBrowser&&step>=2?"browser_origin_blocked":!approved&&step>=3?"approval_rejected_or_pending":"notification_sent_once"
 const outputs=[
  duplicate?"event_id="+fixture.trigger.eventId+"; duplicate=true; logical_runs=1":"event_id="+fixture.trigger.eventId+"; signature=valid; logical_runs=1",
  "action="+fixture.api.action+"; scope="+fixture.api.scope+"; credential_ref="+fixture.api.credentialRef,
  integration+"; origin="+fixture.browser.origin+"; allowlisted="+originAllowed,
  "approval="+(approved?"approved":"not approved")+"; payload_hash="+fixture.approval.payloadHash,
  "state="+finalState+"; idempotency_key="+fixture.notification.idempotencyKey
 ]
 return <section className="agent-loop-lab automation-platform-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Workflow size={14}/> STAGE 08 · AUTOMATION PLATFORM LAB</span><h3>Connect APIs, browsers and approvals safely</h3><p>Follow a document review automation from signed trigger through connector selection and approved execution.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===1?'API available='+apiAvailable+' → '+integration:step===2?'origin allowlist='+originAllowed+'; browser context isolated':step===3?'approval decision='+approved+'; hash='+fixture.approval.payloadHash:current.transformation}</code></div><div><small>OUTPUT</small><code>{outputs[step]}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{duplicate?'Duplicate webhook does not create another logical workflow run.':blockedBrowser&&step>=2?'Browser navigation blocked; do not bypass the origin policy.':!approved&&step>=3?'Approval is not granted; no external notification is sent.':current.visualState}</div></article>
  <div className="automation-platform-envelope"><div><strong><KeyRound size={14}/> Connector and credential boundary</strong><span>{fixture.api.action} · scope {fixture.api.scope}</span></div><div><code>credential_ref</code><b>{fixture.api.credentialRef}</b></div><div><code>raw_token</code><b>never in workflow state</b></div><div><code>browser_origin</code><b>{fixture.browser.origin}</b></div><div><code>browser_context</code><b>{fixture.browser.context}</b></div><div><code>locator</code><b>{fixture.browser.locator.role} / {fixture.browser.locator.name}</b></div></div>
  <div className="automation-platform-metrics"><article><small>INTEGRATION</small><strong>{integration}</strong><span>{apiAvailable?"Preferred stable API":"UI-only fallback"}</span></article><article><small>ORIGIN POLICY</small><strong>{originAllowed?"ALLOW":"BLOCK"}</strong><span>HTTPS allowlist</span></article><article><small>APPROVAL</small><strong>{approved?"APPROVED":"PENDING"}</strong><span>Exact payload hash</span></article><article><small>EXECUTION</small><strong>{finalState}</strong><span>Idempotent action</span></article></div>
  <div className="automation-platform-controls">
   <label><span>Supported API available</span><input type="checkbox" checked={apiAvailable} onChange={e=>setApiAvailable(e.target.checked)}/></label>
   <label><span>Browser origin allowlisted</span><input type="checkbox" checked={originAllowed} onChange={e=>setOriginAllowed(e.target.checked)}/></label>
   <label><span>Manager approval granted</span><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/></label>
   <label><span>Duplicate webhook delivered</span><input type="checkbox" checked={duplicate} onChange={e=>setDuplicate(e.target.checked)}/></label>
  </div>
  <div className="automation-approval-card"><strong><ShieldCheck size={15}/> Human approval preview</strong><div><span>Recipient</span><b>manager@example</b></div><div><span>Payload hash</span><b>{fixture.approval.payloadHash}</b></div><div><span>Approver</span><b>{fixture.approval.approver}</b></div><div><span>Expiry</span><b>{fixture.approval.expiresInSeconds/60} minutes</b></div><small>Any change to recipient or message invalidates the approval. A decision is single-use.</small></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><Globe size={13}/> Simulation only: no n8n workflow, OAuth token, local browser or external SaaS account is accessed.</p>
 </section>
}
