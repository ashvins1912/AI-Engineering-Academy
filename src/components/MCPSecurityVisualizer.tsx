import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,ShieldCheck,KeyRound,LockKeyhole} from 'lucide-react'
import lesson from '../../content/topics/mcp-security/lesson.json'
import fixture from '../../examples/stage-07/fixtures/mcp-security.json'
export default function MCPSecurityVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [issuer,setIssuer]=useState(true),[audience,setAudience]=useState(true),[scope,setScope]=useState(true),[tenant,setTenant]=useState(true)
 const status=!issuer||!audience?'401 invalid_token':!scope?'403 insufficient_scope':!tenant?'403 object access denied':'200 authorized'
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setIssuer(true);setAudience(true);setScope(true);setTenant(true)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const checks=[{name:'Issuer (iss)',pass:issuer},{name:'Audience (aud)',pass:audience},{name:'Required scope',pass:scope},{name:'Tenant/object policy',pass:tenant}]
 return <section className="agent-loop-lab mcp-security-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><KeyRound size={14}/> STAGE 07 · MCP AUTHORIZATION LAB</span><h3>Verify identity, resource and permission.</h3><p>Simulate the distinction between 401 invalid_token, 403 insufficient_scope and object-level denial.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>VALIDATION</small><code>{current.transformation}</code></div><div><small>RESULT</small><code>{step>=3?status:current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{status==='200 authorized'?'Token and object policy checks pass.':status==='401 invalid_token'?'Credentials are invalid for this resource; request a new resource-bound token.':status==='403 insufficient_scope'?'Identity is valid but missing scope; perform step-up authorization.':'Token scope passes but the requested object is outside the tenant boundary.'}</div></article>
  <div className="mcp-security-token"><strong><LockKeyhole size={15}/> Access token claims (simulated)</strong><div><span>iss</span><b>{issuer?fixture.authorizationServer:'https://wrong-issuer.example'}</b></div><div><span>aud</span><b>{audience?fixture.resourceUri:'https://other-api.example'}</b></div><div><span>exp / now</span><b>200 / 100</b></div><div><span>scope</span><b>{scope?'orders:read refund:write':'orders:read'}</b></div><div><span>tenant</span><b>{tenant?'tenant-a':'tenant-b'}</b></div><div className="mcp-security-status"><span>HTTP decision</span><b>{status}</b></div></div>
  <div className="mcp-security-controls">
   <label><input type="checkbox" checked={issuer} onChange={e=>setIssuer(e.target.checked)}/> Token issuer matches configured authorization server</label>
   <label><input type="checkbox" checked={audience} onChange={e=>setAudience(e.target.checked)}/> Token audience matches this MCP resource</label>
   <label><input type="checkbox" checked={scope} onChange={e=>setScope(e.target.checked)}/> Required tool scope is granted</label>
   <label><input type="checkbox" checked={tenant} onChange={e=>setTenant(e.target.checked)}/> Requested order belongs to authenticated tenant</label>
  </div>
  <div className="mcp-security-gates"><strong><ShieldCheck size={15}/> Enforcement order</strong>{checks.map(x=><div key={x.name}><span>{x.name}</span><b className={x.pass?'pass':'fail'}>{x.pass?'PASS':'FAIL'}</b></div>)}</div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote">Simulation only: production must cryptographically verify signature and claims using JWKS or introspection. This visualizer never displays real tokens.</p>
 </section>
}
