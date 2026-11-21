import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Code2,ShieldCheck,Terminal,FolderLock} from 'lucide-react'
import lesson from '../../content/topics/client-acp/lesson.json'
import fixture from '../../examples/stage-07/fixtures/client-acp.json'

export default function AgentClientProtocolVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [fsWrite,setFsWrite]=useState(true),[terminal,setTerminal]=useState(true),[permission,setPermission]=useState("allow_once"),[replay,setReplay]=useState(true)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setFsWrite(true);setTerminal(true);setPermission("allow_once");setReplay(true)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const allowed=permission==="allow_once"||permission==="allow_always"
 const capText=[fsWrite?"fs.writeTextFile":"no fs.writeTextFile",terminal?"terminal":"no terminal"].join(" · ")
 const outputs=[
  "protocolVersion=2; common capabilities negotiated",
  "sessionId=sess-1; cwd=/workspace/app; roots=/workspace/app",
  "tool_call=call-1; status=in_progress; notifications ordered",
  !allowed?"permission="+permission+"; operation not executed":!terminal?"permission allowed, but terminal capability unavailable":"permission=allow_once; pytest command may run once",
  replay?"session/resume; replayFrom=start; retained history replayed":"session/resume; current snapshot only"
 ]
 const events=[["initialize","version=2"],["session/new","sess-1"],["session/prompt","running"],["session/request_permission",permission],["session/resume",replay?"replay":"snapshot"]]
 return <section className="agent-loop-lab client-acp-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Code2 size={14}/> STAGE 07 · AGENT CLIENT PROTOCOL LAB</span><h3>Supervise a coding agent from an IDE</h3><p>Negotiate capabilities, create a workspace session, stream tool updates and gate sensitive actions.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>CLIENT INPUT</small><code>{current.input}</code></div><div><small>NEGOTIATION / ACTION</small><code>{step===0?'initialize → version 2 + capability intersection':step===3?'permission outcome → '+permission:step===4?'session/resume → replayFrom='+ (replay?'start':'omitted'):current.transformation}</code></div><div><small>RESULT</small><code>{outputs[step]}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===2&&!fsWrite?'File write is unavailable because Client did not negotiate fs.writeTextFile.':step===3&&!allowed?'Cancelled/rejected permission is not approval; command is blocked.':step===3&&!terminal?'Terminal capability was not negotiated; command cannot launch.':current.visualState}</div></article>
  <div className="client-acp-capabilities"><div><strong><FolderLock size={14}/> Negotiated Client capabilities</strong><span>{capText}</span></div><div><strong><Terminal size={14}/> Agent capability</strong><span>session methods · prompt updates · tool calls</span></div><div><strong>Protocol</strong><span>ACP v{fixture.protocolVersion} · JSON-RPC 2.0 · stdio</span></div></div>
  <div className="client-acp-events"><strong>Ordered protocol events</strong>{events.map(([method,value],i)=><div key={method} className={step>=i?'active':''}><small>{i+1}</small><code>{method}</code><span>{value}</span></div>)}</div>
  <div className="client-acp-controls">
   <label><span>Filesystem write capability <b>{fsWrite?'enabled':'unsupported'}</b></span><input type="checkbox" checked={fsWrite} onChange={e=>setFsWrite(e.target.checked)}/></label>
   <label><span>Terminal capability <b>{terminal?'enabled':'unsupported'}</b></span><input type="checkbox" checked={terminal} onChange={e=>setTerminal(e.target.checked)}/></label>
   <label><span>Permission decision</span><select value={permission} onChange={e=>setPermission(e.target.value)}><option value="allow_once">allow_once</option><option value="reject_once">reject_once</option><option value="cancelled">cancelled</option></select></label>
   <label><span>Replay retained history <b>{replay?'yes':'no'}</b></span><input type="checkbox" checked={replay} onChange={e=>setReplay(e.target.checked)}/></label>
  </div>
  <div className="client-acp-permission"><strong><ShieldCheck size={15}/> Permission boundary</strong><p>Requested operation: <code>pytest</code></p><p>Working directory: <code>/workspace/app</code></p><span>{allowed&&terminal?'Allowed once only':!allowed?'Not approved; do not execute':'Blocked: terminal capability missing'}</span><small>Permission applies to this exact command and cwd. It does not grant future or broader access.</small></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote">Simulation only: no local files or terminals are accessed. Real clients must enforce workspace roots and user permissions outside model-generated instructions.</p>
 </section>
}
