import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,GitBranch,Database,ShieldCheck} from 'lucide-react'
import lesson from '../../content/topics/langgraph/lesson.json'
import fixture from '../../examples/stage-06/fixtures/graph-orchestration.json'

export default function GraphOrchestrationVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [route,setRoute]=useState('billing'),[maxSteps,setMaxSteps]=useState(5),[checkpoint,setCheckpoint]=useState(2),[paused,setPaused]=useState(false)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setRoute('billing');setMaxSteps(5);setCheckpoint(2);setPaused(false)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const current=stages[step]
 const routeTarget=route==='unknown'?'ROUTE_ERROR':route
 const terminal=step===4&&maxSteps>=3
 const stateRows=[['question',fixture.question],['intent',step>=2?route:'—'],['next_node',step===0?'classify':step===1?'classify':step===2?routeTarget:step===3?routeTarget:'finish'],['checkpoint_version',step>=3?'1':'0'],['status',route==='unknown'&&step>=2?'routing_error':terminal?'completed':step>=3&&paused?'interrupted':'running']]
 return <section className="agent-loop-lab graph-orchestration-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><GitBranch size={14}/> STAGE 06 · GRAPH EXECUTION LAB</span><h3>Run a stateful agent graph</h3><p>Step through node execution, conditional routing, state updates, checkpoint persistence and resume.</p></div><span className="agent-loop-count">NODE {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===2?'route_map['+route+'] → '+routeTarget:step===3?'save(thread, state, next_node, version)':current.transformation}</code></div><div><small>OUTPUT</small><code>{step===2&&route==='unknown'?'status=routing_error; no dispatch':step===3?'checkpoint_version=1; next_node='+routeTarget:step===4?'resume starts at '+routeTarget+'; max_steps='+maxSteps:current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{step===2&&route==='unknown'?'Unknown route rejected before execution.':step===3&&paused?'Checkpoint saved; execution paused.':current.visualState}</div></article>
  <div className="graph-node-track">{['START','classify','billing / general','checkpoint','finish'].map((node,i)=><div key={node} className={i===step?'active':i<step?'done':''}><span>{i===0?'●':i===4?'■':'○'}</span><small>{node}</small></div>)}</div>
  <div className="graph-state-board"><div className="graph-state-title"><strong><Database size={14}/> Shared graph state</strong><span>{fixture.threadId} · {fixture.tenantId}</span></div>{stateRows.map(([k,v])=><div key={k}><code>{k}</code><b>{v}</b></div>)}</div>
  <div className="graph-controls">
   <label><span>Conditional route <b>{route}</b></span><select value={route} onChange={e=>{setRoute(e.target.value);setStep(0);setPlaying(false)}}><option value="billing">billing</option><option value="general">general</option><option value="unknown">unknown (failure lab)</option></select></label>
   <label><span>Maximum node steps <b>{maxSteps}</b></span><input type="range" min="1" max="10" value={maxSteps} onChange={e=>setMaxSteps(Number(e.target.value))}/></label>
   <label><span>Checkpoint after node <b>{checkpoint}</b></span><input type="range" min="0" max="4" value={checkpoint} onChange={e=>{setCheckpoint(Number(e.target.value));setPaused(false)}}/></label>
   <label className="graph-pause-toggle"><input type="checkbox" checked={paused} onChange={e=>setPaused(e.target.checked)}/> Pause at checkpoint</label>
  </div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> Teaching simulation: route selection and checkpoint state are visualized locally. Production resume must revalidate tenant, identity, policy and side-effect idempotency.</p>
 </section>
}
