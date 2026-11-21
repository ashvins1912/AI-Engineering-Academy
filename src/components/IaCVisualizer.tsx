import {useEffect,useMemo,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,Cloud,ShieldCheck,GitBranch,Wallet} from 'lucide-react'
import lesson from '../../content/topics/infra/lesson.json'
export default function IaCVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1)
 const [tasks,setTasks]=useState(1),[publicIp,setPublicIp]=useState(false),[wildcard,setWildcard]=useState(false),[budget,setBudget]=useState(100)
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),1900/speed);return()=>window.clearTimeout(timer)},[playing,step,speed,stages.length])
 const reset=()=>{setPlaying(false);setStep(0);setTasks(1);setPublicIp(false);setWildcard(false);setBudget(100)}
 const move=(d:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+d)))}
 const cost=useMemo(()=>52.2+35*tasks,[tasks])
 const blocked=publicIp||wildcard
 const overBudget=cost>budget
 const current=stages[step]
 const state=blocked?'policy_blocked':overBudget?'budget_review':step===4?'approval_required':'plan_ready'
 return <section className="agent-loop-lab iac-plan-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><Cloud size={14}/> STAGE 09 · INFRASTRUCTURE PLAN LAB</span><h3>Review an infrastructure plan safely</h3><p>Inspect a private inference stack, policy risks, state protection and fixed cloud costs before approval.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage" aria-live="polite"><div className="agent-loop-stage-title"><span>{String(step+1).padStart(2,'0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{step===0?'desired_count='+tasks+'; env=dev':step===3?'public_task_ip='+publicIp+'; wildcard_iam='+wildcard:current.input}</code></div><div><small>TRANSFORMATION</small><code>{step===3?'policy + cost estimate':current.transformation}</code></div><div><small>OUTPUT</small><code>{blocked?'plan=blocked':overBudget?'budget=exceeded':step===4?'approval=required; apply=not_executed':current.output}</code></div></div><div className="agent-loop-state"><span className="state-pulse"/>{blocked?'Policy violation: tasks must stay private and IAM must not use wildcard permissions.':overBudget?'Estimated monthly cost exceeds the configured budget; review or reduce resources.':current.visualState}</div></article>
  <div className="iac-resource-track">{['VPC','ALB','Private ECS','Endpoints','IAM','Logs'].map((x,i)=><div key={x} className={i<=step+1?'done':''}><span>{i<2?'●':'○'}</span><small>{x}</small></div>)}</div>
  <div className="iac-state"><div><strong><GitBranch size={14}/> Plan identity</strong><span>dev · ap-south-1 · terraform</span></div><div><code>workload_network</code><b>{publicIp?'public (blocked)':'private subnet'}</b></div><div><code>image_reference</code><b>sha256: immutable digest</b></div><div><code>state_backend</code><b>encrypted + versioned + locked</b></div><div><code>approval</code><b>{state==='approval_required'?'required':'not submitted'}</b></div><div><code>apply</code><b>not executed</b></div></div>
  <div className="iac-controls">
   <label><span>Desired task count <b>{tasks}</b></span><input type="range" min="0" max="8" value={tasks} onChange={e=>setTasks(Number(e.target.value))}/></label>
   <label><span>Monthly budget <b>${budget}</b></span><input type="range" min="25" max="500" step="25" value={budget} onChange={e=>setBudget(Number(e.target.value))}/></label>
   <label className="iac-toggle"><input type="checkbox" checked={publicIp} onChange={e=>setPublicIp(e.target.checked)}/> Assign public IP to inference tasks (unsafe)</label>
   <label className="iac-toggle"><input type="checkbox" checked={wildcard} onChange={e=>setWildcard(e.target.checked)}/> Grant wildcard IAM permissions (unsafe)</label>
  </div>
  <div className="iac-cost"><strong><Wallet size={15}/> Illustrative monthly cost</strong><div><span>ALB + endpoints + logs</span><b>$52.20</b></div><div><span>Fargate tasks ({tasks} × $35)</span><b>${(tasks*35).toFixed(2)}</b></div><div className="total"><span>Estimated total</span><b>${cost.toFixed(2)}</b></div><small>{overBudget?'Budget exceeded — approval blocked.':'Within configured budget.'} Estimates exclude transfer, taxes, storage growth and regional variation. desired_count=0 still incurs fixed service costs.</small></div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button><label className="agent-loop-speed">Speed <select value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> Simulation only. The Terraform module is validated and reviewed; no cloud credentials, terraform apply or infrastructure provisioning are used.</p>
 </section>
}
