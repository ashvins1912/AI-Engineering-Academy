import { useEffect, useMemo, useState } from 'react'
import agentLoopLesson from '../../content/topics/agent-loop/lesson.json'
import agentLoopFixture from '../../examples/stage-06/fixtures/agent-loop.json'
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, ShieldCheck, Timer } from 'lucide-react'

const animation = agentLoopLesson.visual.animation
const stages = animation.stages
const unitPrice = agentLoopFixture.unitPrice
const simulatedCatalogLatencyMs = agentLoopFixture.simulatedCatalogLatencyMs
const initialControl = (name: string, fallback: number) =>
  animation.controls.find(control => control.name === name)?.defaultValue ?? fallback

export default function AgentLoopVisualizer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [maxSteps, setMaxSteps] = useState(() => initialControl('max_steps', 4))
  const [timeoutMs, setTimeoutMs] = useState(() => initialControl('tool_timeout_ms', 2000))
  const [discountPercent, setDiscountPercent] = useState(() => initialControl('discount_percent', 10))
  const finalPrice = useMemo(() => unitPrice * (1 - discountPercent / 100), [discountPercent])
  const catalogTimedOut = timeoutMs < simulatedCatalogLatencyMs
  const canComplete = maxSteps >= 2 && !catalogTimedOut
  const current = stages[step]

  useEffect(() => {
    if (!playing) return
    if (step >= stages.length - 1) {
      setPlaying(false)
      return
    }
    const timer = window.setTimeout(() => setStep(step + 1), 1800 / speed)
    return () => window.clearTimeout(timer)
  }, [playing, speed, step])

  const reset = () => { setPlaying(false); setStep(0) }
  const next = () => setStep(value => Math.min(stages.length - 1, value + 1))
  const previous = () => setStep(value => Math.max(0, value - 1))

  return <section className="agent-loop-lab" aria-labelledby="agent-loop-title">
    <div className="agent-loop-head">
      <div><span className="agent-loop-kicker"><ShieldCheck size={13}/> STAGE 06 · LIVE NUMERICAL TRACE</span><h3 id="agent-loop-title">Animate the agent control loop</h3><p>{animation.objective} All values update from the controls below.</p></div>
      <span className="agent-loop-count">STEP {step + 1} / {stages.length}</span>
    </div>
    <div className="agent-loop-progress" aria-label="Animation progress">{stages.map((item, index) => <button key={item.title} className={index === step ? 'active' : index < step ? 'visited' : ''} onClick={() => {setPlaying(false);setStep(index)}} aria-label={`Go to step ${index + 1}: ${item.title}`} />)}</div>
    <div className="agent-loop-stage" aria-live="polite">
      <div className="agent-loop-stage-title"><span>{String(step + 1).padStart(2, '0')}</span><div><h4>{current.title}</h4><p>{current.narration}</p></div></div>
      <div className="agent-loop-values">
        <div><small>INPUT</small><code>{current.input}</code></div>
        <div><small>TRANSFORMATION</small><code>{step === 3 ? `${unitPrice} × (1 − ${discountPercent}/100) = ${finalPrice.toFixed(2)}` : current.transformation}</code></div>
        <div><small>OUTPUT</small><code>{step === 3 ? (canComplete ? `status=completed; final_price=₹${finalPrice.toFixed(2)}; tool_calls=2` : catalogTimedOut ? `status=tool_timeout; final_price=not available; timeout_ms=${timeoutMs}` : 'status=step_limit; final_price=not available; only one tool call allowed') : step === 2 ? (catalogTimedOut ? `status=tool_timeout; timeout_ms=${timeoutMs}; product observation unavailable` : `product.unit_price=₹${unitPrice}; remaining_steps=${Math.max(0, maxSteps - 1)}`) : current.output}</code></div>
      </div>
      <div className="agent-loop-state"><span className="state-pulse"/>{step === 2 && catalogTimedOut ? `Catalog tool exceeded the ${timeoutMs} ms timeout; no observation was appended.` : step === 3 && !canComplete ? (catalogTimedOut ? 'The catalog observation is missing after timeout; the agent cannot calculate a price.' : 'Budget exhausted before the second tool: task remains incomplete.')  : current.visualState}</div>
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
      <label><span>Discount rate <strong>{discountPercent}%</strong></span><input type="range" min="0" max="50" value={discountPercent} onChange={event => setDiscountPercent(Number(event.target.value))}/><small>₹{unitPrice} × (1 − {discountPercent}/100) = <b>₹{finalPrice.toFixed(2)}</b></small></label>
    </div>
    <p className="agent-loop-footnote">Educational simulation: the planner is deterministic so you can inspect control flow without an API key. In production, a model may propose actions, but the application still validates permissions, schemas, budgets and tool results.</p>
  </section>
}
