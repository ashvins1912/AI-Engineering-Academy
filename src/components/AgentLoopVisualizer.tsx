import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, ShieldCheck, Timer } from 'lucide-react'

const stages = [
  { title: 'Initialize state', narration: 'The request becomes task state. No tool has run yet, and the step budget is ready.', input: 'request: find MUG-1 and apply a discount', transform: 'Create product=null, discount=null, trace=[]', output: 'remaining_steps = max_steps', state: 'State panel: both observation slots are empty.' },
  { title: 'Choose catalog tool', narration: 'Because the product price is unknown, the planner proposes catalog_search. The host checks its allow-list before dispatch.', input: 'product=null; proposed_tool=catalog_search', transform: 'Validate tool name and SKU argument', output: 'catalog_search accepted; sku=MUG-1', state: 'Decision passes through the policy gate.' },
  { title: 'Append observation', narration: 'The catalog returns a unit price of ₹80. The result is added to the trajectory and becomes available to the next decision.', input: 'catalog response: unit_price=80', transform: 'Store product observation and consume one step', output: 'product.unit_price=80; remaining_steps=max_steps−1', state: 'First trace row appears; product slot fills with ₹80.' },
  { title: 'Calculate and stop', narration: 'The planner now has enough evidence to calculate the discount. Once the result exists, the loop stops instead of calling tools again.', input: 'amount=80; discount rate is adjustable', transform: '80 × (1 − discount_percent / 100)', output: 'final price is calculated from the current slider value', state: 'Second trace row appears and the loop terminates.' }
]

export default function AgentLoopVisualizer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [maxSteps, setMaxSteps] = useState(4)
  const [timeoutMs, setTimeoutMs] = useState(2000)
  const [discountPercent, setDiscountPercent] = useState(10)
  const finalPrice = useMemo(() => 80 * (1 - discountPercent / 100), [discountPercent])
  const canComplete = maxSteps >= 2
  const current = stages[step]

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      setStep(currentStep => {
        if (currentStep >= stages.length - 1) {
          setPlaying(false)
          return currentStep
        }
        return currentStep + 1
      })
    }, 1800 / speed)
    return () => window.clearTimeout(timer)
  }, [playing, speed, step])

  const reset = () => { setPlaying(false); setStep(0) }
  const next = () => setStep(value => Math.min(stages.length - 1, value + 1))
  const previous = () => setStep(value => Math.max(0, value - 1))

  return <section className="agent-loop-lab" aria-labelledby="agent-loop-title">
    <div className="agent-loop-head">
      <div><span className="agent-loop-kicker"><ShieldCheck size={13}/> STAGE 06 · LIVE NUMERICAL TRACE</span><h3 id="agent-loop-title">Animate the agent control loop</h3><p>Watch the same request move through state, tool selection, policy validation, observation and a bounded stop condition. All values update from the controls below.</p></div>
      <span className="agent-loop-count">STEP {step + 1} / {stages.length}</span>
    </div>
    <div className="agent-loop-progress" aria-label="Animation progress">{stages.map((item, index) => <button key={item.title} className={index === step ? 'active' : index < step ? 'visited' : ''} onClick={() => {setPlaying(false);setStep(index)}} aria-label={`Go to step ${index + 1}: ${item.title}`} />)}</div>
    <div className="agent-loop-stage" aria-live="polite">
      <div className="agent-loop-stage-title"><span>{String(step + 1).padStart(2, '0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div>
      <div className="agent-loop-values">
        <div><small>INPUT</small><code>{current.input}</code></div>
        <div><small>TRANSFORMATION</small><code>{step === 3 ? `80 × (1 − ${discountPercent}/100) = ${finalPrice.toFixed(2)}` : current.transform}</code></div>
        <div><small>OUTPUT</small><code>{step === 3 ? (canComplete ? `status=completed; final_price=₹${finalPrice.toFixed(2)}; tool_calls=2` : 'status=step_limit; final_price=not available; only one tool call allowed') : step === 2 ? `product.unit_price=₹80; remaining_steps=${Math.max(0, maxSteps - 1)}` : current.output}</code></div>
      </div>
      <div className="agent-loop-state"><span className="state-pulse"/>{step === 3 && !canComplete ? 'Budget exhausted before the second tool: task remains incomplete.' : current.state}</div>
    </div>
    <div className="agent-loop-controls">
      <button onClick={previous} disabled={step === 0}><ArrowLeft size={14}/>Back</button>
      <button className="agent-loop-play" onClick={() => {if(step === stages.length - 1) setStep(0);setPlaying(value => !value)}}>{playing ? <Pause size={14}/> : <Play size={14}/>} {playing ? 'Pause' : 'Play'}</button>
      <button onClick={next} disabled={step === stages.length - 1}>Next<ArrowRight size={14}/></button>
      <button onClick={reset}><RotateCcw size={13}/>Reset</button>
      <label className="agent-loop-speed">Speed <select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>
    </div>
    <div className="agent-loop-parameters">
      <label><span>Maximum steps <strong>{maxSteps}</strong></span><input type="range" min="1" max="8" value={maxSteps} onChange={event => setMaxSteps(Number(event.target.value))}/><small>At 1, the agent cannot complete this two-tool task. More steps add headroom, not unlimited permission.</small></label>
      <label><span>Tool timeout <strong>{timeoutMs} ms</strong></span><input type="range" min="100" max="5000" step="100" value={timeoutMs} onChange={event => setTimeoutMs(Number(event.target.value))}/><small><Timer size={12}/> Affects the waiting budget; a remote side effect still needs service-side idempotency.</small></label>
      <label><span>Discount rate <strong>{discountPercent}%</strong></span><input type="range" min="0" max="50" value={discountPercent} onChange={event => setDiscountPercent(Number(event.target.value))}/><small>₹80 × (1 − {discountPercent}/100) = <b>₹{finalPrice.toFixed(2)}</b></small></label>
    </div>
    <p className="agent-loop-footnote">Educational simulation: the planner is deterministic so you can inspect control flow without an API key. In production, a model may propose actions, but the application still validates permissions, schemas, budgets and tool results.</p>
  </section>
}
