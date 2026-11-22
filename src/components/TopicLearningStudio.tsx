import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CircleHelp, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import type { Lesson } from '../data/curriculum'

type Props = { lesson: Lesson }

const stageFromId = (id: string) => Number(id.match(/stage-(\d+)/)?.[1] ?? 0)
const slugFromId = (id: string) => id.split(':').pop() ?? id

/**
 * Universal conceptual playground. It visualizes the learner-authored lesson
 * workflow and scenario; it deliberately does not claim to execute lesson code.
 * Topic-specific numerical simulators remain mounted alongside this common studio.
 */
export default function TopicLearningStudio({ lesson }: Props) {
  const steps = useMemo(() => lesson.workflow.length ? lesson.workflow : [
    'Identify the problem and define inputs',
    'Trace the core transformation',
    'Inspect the output and validate assumptions'
  ], [lesson.workflow])
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [scenario, setScenario] = useState(lesson.workedExample)
  const [answer, setAnswer] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const stage = stageFromId(lesson.id)
  const topicId = slugFromId(lesson.id)
  const current = steps[step]
  const nextIndex = Math.min(step + 1, steps.length - 1)
  const options = useMemo(() => {
    const candidates = [nextIndex, Math.max(0, step - 1), steps.length - 1]
    return [...new Set(candidates)].slice(0, 3)
  }, [nextIndex, step, steps.length])
  const correctOption = options.indexOf(nextIndex)

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      setStep(value => {
        if (value >= steps.length - 1) { setPlaying(false); return value }
        return value + 1
      })
    }, 2200 / speed)
    return () => window.clearTimeout(timer)
  }, [playing, step, speed, steps.length])

  useEffect(() => {
    setStep(0)
    setPlaying(false)
    setScenario(lesson.workedExample)
    setAnswer(null)
    setChecked(false)
  }, [lesson.id, lesson.workedExample])

  const move = (delta: number) => {
    setPlaying(false)
    setStep(value => Math.max(0, Math.min(steps.length - 1, value + delta)))
    setAnswer(null)
    setChecked(false)
  }
  const reset = () => {
    setPlaying(false)
    setStep(0)
    setScenario(lesson.workedExample)
    setAnswer(null)
    setChecked(false)
  }

  return <section className="topic-studio" aria-labelledby="topic-studio-title">
    <header className="topic-studio-header">
      <div>
        <span className="topic-studio-kicker"><Sparkles size={13}/> STAGE {String(stage || '—').padStart(2, '0')} · TOPIC PLAYGROUND</span>
        <h3 id="topic-studio-title">Interactive learning studio</h3>
        <p>Explore the learning sequence for <strong>{lesson.title}</strong>, change the scenario and test your understanding.</p>
      </div>
      <span className="topic-studio-mode">Concept simulation</span>
    </header>

    <div className="topic-studio-tabs" aria-label="Learning studio sections">
      <span className="active"><BookOpen size={14}/> Explore</span>
      <span><CircleHelp size={14}/> Predict & check</span>
    </div>

    <div className="topic-studio-scenario">
      <label htmlFor="topic-studio-scenario">Experiment scenario / worked-example input</label>
      <textarea id="topic-studio-scenario" value={scenario} onChange={event => { setScenario(event.target.value); setAnswer(null); setChecked(false) }} rows={3}/>
      <small>This edits the scenario displayed through the conceptual flow. It does not execute code or recalculate an algorithm.</small>
    </div>

    <div className="topic-studio-visual" aria-live="polite">
      <div className="topic-studio-flow" role="list" aria-label="Concept execution steps">
        {steps.map((item, index) => <div className="topic-studio-flow-item" role="listitem" key={index}>
          <button className={index === step ? 'current' : index < step ? 'visited' : ''} onClick={() => { setPlaying(false); setStep(index); setAnswer(null); setChecked(false) }} aria-current={index === step ? 'step' : undefined} aria-label={`Show step ${index + 1}: ${item}`}>
            <span>{String(index + 1).padStart(2, '0')}</span><b>{item}</b>
          </button>
          {index < steps.length - 1 && <i className={index < step ? 'passed' : ''}/>}
        </div>)}
      </div>
      <article className="topic-studio-step">
        <div className="topic-studio-step-title"><span>{String(step + 1).padStart(2, '0')}</span><div><small>CURRENT OPERATION</small><h4>{current}</h4></div></div>
        <div className="topic-studio-state">
          <div><small>SCENARIO INPUT</small><p>{scenario.trim() || 'Add a scenario above to explore this workflow.'}</p></div>
          <div><small>WHAT TO INSPECT</small><p>{step === 0 ? 'Identify the assumptions, input contract and expected outcome before proceeding.' : step === steps.length - 1 ? 'Check the result against the expected output, tests and stated limitations.' : 'Trace the intermediate state, explain why this operation is needed and predict what changes next.'}</p></div>
          <div><small>LEARNING CHECKPOINT</small><p>{step === steps.length - 1 ? lesson.assessment : 'Before moving on, explain what this step consumes and what it should produce.'}</p></div>
        </div>
      </article>
    </div>

    <div className="topic-studio-controls">
      <button onClick={() => move(-1)} disabled={step === 0}><ArrowLeft size={15}/> Previous</button>
      <button className="topic-studio-play" onClick={() => { if (step === steps.length - 1) setStep(0); setPlaying(value => !value) }}>{playing ? <><Pause size={15}/> Pause</> : <><Play size={15}/> {step === steps.length - 1 ? 'Replay' : 'Play walkthrough'}</>}</button>
      <button onClick={() => move(1)} disabled={step === steps.length - 1}>Next <ArrowRight size={15}/></button>
      <label>Speed <select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>
      <button className="topic-studio-reset" onClick={reset}><RotateCcw size={14}/> Reset</button>
      <span className="topic-studio-counter">{step + 1} / {steps.length}</span>
    </div>

    <div className="topic-studio-predict">
      <div className="topic-studio-predict-heading"><CircleHelp size={16}/><div><strong>Predict the next step</strong><p>Choose the next operation in this lesson's workflow before revealing the answer.</p></div></div>
      <div className="topic-studio-options">
        {options.map((index, optionIndex) => <label key={index} className={checked && optionIndex === correctOption ? 'correct' : checked && answer === optionIndex ? 'incorrect' : ''}>
          <input type="radio" name={`predict-${lesson.id}`} checked={answer === optionIndex} onChange={() => { setAnswer(optionIndex); setChecked(false) }}/>
          <span>{steps[index]}</span>
        </label>)}
      </div>
      <button className="topic-studio-check" disabled={answer === null} onClick={() => setChecked(true)}>Check prediction</button>
      {checked && <p className={answer === correctOption ? 'topic-studio-feedback good' : 'topic-studio-feedback'}>{answer === correctOption ? 'Correct — ' : 'Not quite. The next workflow step is: '}{steps[nextIndex]}{step === steps.length - 1 ? ' You are at the final step; reset to repeat the walkthrough.' : ' Review the transition and explain why this operation follows the current one.'}</p>}
    </div>
    <footer className="topic-studio-disclaimer">Learning aid only · This shared conceptual simulator visualizes the lesson workflow. Use the topic's dedicated numerical lab or code workbench for actual algorithm execution. Topic key: {topicId}.</footer>
  </section>
}
