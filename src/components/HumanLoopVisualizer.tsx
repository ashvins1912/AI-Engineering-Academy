import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowRight,Pause,Play,RotateCcw,ShieldCheck,Clock3,Users} from 'lucide-react'
import lesson from '../../content/topics/human-loop/lesson.json'
import fixture from '../../examples/stage-06/fixtures/human-loop.json'
export default function HumanLoopVisualizer(){
 const stages=lesson.visual.animation.stages
 const [step,setStep]=useState(0),[playing,setPlaying]=useState(false),[quorum,setQuorum]=useState(2),[amount,setAmount]=useState(12500),[age,setAge]=useState(5),[speed,setSpeed]=useState(1)
 const [reviewers,setReviewers]=useState<string[]>([])
 useEffect(()=>{if(!playing)return;const timer=window.setInterval(()=>setStep(v=>{if(v>=stages.length-1){setPlaying(false);return v}return v+1}),2200/speed);return()=>window.clearInterval(timer)},[playing,stages.length,speed])
 const required=amount>=10000?Math.max(2,quorum):1
 const expired=age>=30
 const toggleReviewer=(id:string)=>setReviewers(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])
 const reset=()=>{setPlaying(false);setStep(0);setQuorum(2);setAmount(12500);setAge(5);setReviewers([]);setSpeed(1)}
 const move=(delta:number)=>{setPlaying(false);setStep(v=>Math.max(0,Math.min(stages.length-1,v+delta)))}
 const approved=Math.min(reviewers.length,required)
 const canExecute=!expired&&approved>=required&&step===stages.length-1
 return <section className="agent-loop-lab human-loop-lab">
  <header className="agent-loop-head"><div><span className="agent-loop-kicker"><ShieldCheck size={14}/> HUMAN APPROVAL CONTROL LAB</span><h3>Pause the agent before consequential actions.</h3><p>Change the refund amount, reviewer quorum and request age. Watch the approval gate enforce policy.</p></div><span className="agent-loop-count">STEP {step+1} / {stages.length}</span></header>
  <div className="agent-loop-progress">{stages.map((s,i)=><button key={s.step} className={i===step?'active':i<step?'visited':''} onClick={()=>{setPlaying(false);setStep(i)}} aria-label={'Go to '+s.title}/>)}</div>
  <article className="agent-loop-stage"><div className="agent-loop-stage-title"><span>{step+1}</span><div><h4>{stages[step].title}</h4><p>{stages[step].narration}</p></div></div><div className="agent-loop-values"><div><small>INPUT</small><code>{stages[step].input}</code></div><div><small>TRANSFORMATION</small><code>{stages[step].transformation}</code></div><div><small>OUTPUT</small><code>{stages[step].output}</code></div></div><div className="agent-loop-state"><i className="state-pulse"/><span>{stages[step].visualState}</span></div></article>
  <div className="human-approval-board">
   <article><small>PROPOSED REFUND</small><strong>₹{amount.toLocaleString('en-IN')}</strong><span>{amount>=10000?'High risk · two reviewers':'Standard risk · one reviewer'}</span></article>
   <article><small>REQUIRED QUORUM</small><strong>{required} reviewers</strong><span>Policy threshold ₹10,000</span></article>
   <article><small>DECISIONS</small><strong>{approved}/{required}</strong><span>Distinct finance identities</span></article>
   <article><small>PROVIDER CALLS</small><strong>{canExecute?1:0}</strong><span>{expired?'Request expired':canExecute?'Approved and revalidated':'Blocked pending approval'}</span></article>
  </div>
  <div className="human-approval-controls">
   <label><span>Refund amount <b>₹{amount.toLocaleString('en-IN')}</b></span><input type="range" min="1000" max="30000" step="500" value={amount} onChange={e=>{setAmount(Number(e.target.value));setReviewers([])}}/></label>
   <label><span>Quorum policy <b>{quorum}</b></span><input type="range" min="1" max="3" value={quorum} onChange={e=>{setQuorum(Number(e.target.value));setReviewers([])}}/></label>
   <label><span>Request age <b>{age} min</b></span><input type="range" min="0" max="60" value={age} onChange={e=>setAge(Number(e.target.value))}/></label>
   <label><span>Animation speed <b>{speed.toFixed(1)}×</b></span><input type="range" min="0.5" max="2" step="0.5" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label>
  </div>
  <div className="human-reviewers"><div className="human-review-head"><strong><Users size={15}/> Reviewer decisions</strong><span>{fixture.requestId} · {fixture.workflowId}</span></div>
   {[{id:'finance-04',role:'Finance reviewer A'},{id:'finance-09',role:'Finance reviewer B'},{id:'finance-12',role:'Finance reviewer C'}].map(person=><label key={person.id}><input type="checkbox" checked={reviewers.includes(person.id)} disabled={expired} onChange={()=>toggleReviewer(person.id)}/><span><b>{person.role}</b><small>{person.id} · authenticated identity · finance role</small></span><em>{reviewers.includes(person.id)?'APPROVED':'PENDING'}</em></label>)}
   <p><Clock3 size={13}/> {expired?'Expired: new approval request required.':'Action hash '+fixture.actionHashPrefix+'… · workflow version '+fixture.workflowVersion+' · '+(required-approved)+' more distinct approval(s) needed.'}</p>
  </div>
  <div className="agent-loop-controls"><button onClick={()=>move(-1)} disabled={step===0}><ArrowLeft size={14}/>Previous</button><button className="agent-loop-play" onClick={()=>{if(step===stages.length-1&&!playing)setStep(0);setPlaying(v=>!v)}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><button onClick={()=>move(1)} disabled={step===stages.length-1}>Next<ArrowRight size={14}/></button><button onClick={reset}><RotateCcw size={13}/>Reset</button></div>
  <p className="agent-loop-footnote"><ShieldCheck size={13}/> {canExecute?'Quorum and freshness checks pass in this teaching simulation.':'No provider call is allowed until quorum, expiry and action binding pass.'} Notifications never count as approval.</p>
 </section>
}
