import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Plug,ShieldCheck,Server} from 'lucide-react'
import lesson from '../../content/topics/mcp-architecture/lesson.json'
import fixture from '../../examples/stage-07/fixtures/mcp-session.json'
export default function MCPArchitectureVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [protocol,setProtocol]=useState(true),[consent,setConsent]=useState(true),[scope,setScope]=useState(true)
 const ready=protocol,authorized=protocol&&consent&&scope
 const state=step===0?(protocol?'INITIALIZING':'FAILED'):step===1?'READY':step===2?'READY + TOOLS_DISCOVERED':step===3?(authorized?'TOOL_RESULT':'CALL_BLOCKED'):'CLOSED'
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setProtocol(true);setConsent(true);setScope(true)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 return <section className="agent-loop-lab mcp-lifecycle-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Plug size={14}/> STAGE 07 · MCP LIFECYCLE LAB</span><h3>Inspect an MCP client/server session</h3><p>Follow protocol negotiation, readiness, tool discovery, host authorization and shutdown.</p></div><span className="agent-loop-count">MESSAGE {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>MESSAGE / INPUT</small><code>{current.input}</code></div><div><small>PROTOCOL ACTION</small><code>{current.transformation}</code></div><div><small>RESULT</small><code>{step===0&&!protocol?'error=unsupported_protocol':step===3?'authorized='+authorized+'; result='+(authorized?'order_status=shipped':'blocked_before_server_call'):step===4?'client_state=CLOSED; server_session_removed':current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===3&&!authorized?'Host denied the call. Discovery did not grant permission.':current.visualState}</div></article>
  <div className="mcp-sequence"><div><small>HOST</small><b>AI application</b><span>Consent · identity · policy</span></div><i>↔</i><div><small>CLIENT</small><b>MCP client</b><span>Protocol session</span></div><i>↔</i><div><small>SERVER</small><b>{fixture.server.name}</b><span>Tools · schemas · results</span></div></div>
  <div className="mcp-session-state"><strong><Server size={15}/> Session inspector</strong><div><span>Protocol</span><b>{fixture.protocolVersion}</b></div><div><span>Session state</span><b>{state}</b></div><div><span>Advertised capabilities</span><b>tools</b></div><div><span>Discovered tools</span><b>lookup_order</b></div></div>
  <div className="mcp-policy-controls">
   <label><input type="checkbox" checked={protocol} onChange={e=>setProtocol(e.target.checked)}/> Server supports requested protocol version</label>
   <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> User explicitly consents to lookup_order</label>
   <label><input type="checkbox" checked={scope} onChange={e=>setScope(e.target.checked)}/> Authenticated identity has orders:read scope</label>
  </div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> {ready?'Protocol ready.':'Protocol negotiation fails.'} {authorized?'Consent and scope allow the example call.':'Host policy blocks tools/call before dispatch.'} Tool discovery alone never grants authorization.</p>
 </section>
}
