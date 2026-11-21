import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Network,ShieldCheck,Server,Terminal} from 'lucide-react'
import lesson from '../../content/topics/mcp-transport/lesson.json'
import fixture from '../../examples/stage-07/fixtures/mcp-transports.json'
export default function MCPTransportsVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [origin,setOrigin]=useState(true),[host,setHost]=useState(true),[body,setBody]=useState(true),[replicas,setReplicas]=useState(3)
 const edgeOk=origin&&host&&body
 const status=!host||!origin?'403 edge denied':!body?'413 body too large':'200 accepted'
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setOrigin(true);setHost(true);setBody(true);setReplicas(3)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const checks=[{name:'Host allow-list',pass:host},{name:'Origin allow-list',pass:origin},{name:'Body size limit',pass:body}]
 return <section className="agent-loop-lab mcp-transports-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Network size={14}/> STAGE 07 · MCP TRANSPORT LAB</span><h3>Choose the transport and harden the edge.</h3><p>Compare local STDIO with remote Streamable HTTP and inspect stateless replica routing.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>EDGE / ROUTING</small><code>{current.transformation}</code></div><div><small>RESULT</small><code>{step===1?status:step===3?'replicas='+replicas+'; sticky_sessions=false':current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===1&&!edgeOk?'Request rejected before JSON-RPC dispatch.':current.visualState}</div></article>
  <div className="mcp-transport-modes"><article><span><Terminal size={15}/> LOCAL</span><strong>STDIO</strong><small>Host launches process</small><p>stdin/stdout = JSONL protocol</p><b>Logs → stderr</b></article><article><span><Network size={15}/> REMOTE</span><strong>Streamable HTTP</strong><small>HTTPS POST /mcp</small><p>TLS + OAuth + edge validation</p><b>Stateless routing</b></article></div>
  <div className="mcp-transport-inspector"><strong><Server size={15}/> Remote edge inspector</strong><div><span>Endpoint</span><b>https://mcp.example.com/mcp</b></div><div><span>Host / Origin</span><b>{host?'allowed':'rejected'} / {origin?'allowed':'rejected'}</b></div><div><span>Body</span><b>{body?'12 KB / 64 KB':'oversized / rejected'}</b></div><div><span>HTTP result</span><b>{status}</b></div><div><span>Replicas</span><b>{replicas} · no sticky sessions</b></div></div>
  <div className="mcp-transport-controls">
   <label><input type="checkbox" checked={host} onChange={e=>setHost(e.target.checked)}/> Host header is allow-listed</label>
   <label><input type="checkbox" checked={origin} onChange={e=>setOrigin(e.target.checked)}/> Browser Origin is allow-listed</label>
   <label><input type="checkbox" checked={body} onChange={e=>setBody(e.target.checked)}/> Request body is within size limit</label>
   <label><span>Stateless replicas <b>{replicas}</b></span><input type="range" min="1" max="6" value={replicas} onChange={e=>setReplicas(Number(e.target.value))}/></label>
  </div>
  <div className="mcp-transport-gates"><strong><ShieldCheck size={15}/> Edge security checks</strong>{checks.map(x=><div key={x.name}><span>{x.name}</span><b className={x.pass?'pass':'fail'}>{x.pass?'PASS':'BLOCK'}</b></div>)}<p>HTTP status {status}. CORS is not authentication; OAuth and domain policy still run after edge validation.</p></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote">Fixture {fixture.scenario}. Remote deployment is stateless; durable business state and idempotency belong outside the transport.</p>
 </section>
}
