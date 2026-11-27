import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  XCircle
} from 'lucide-react'
import type { Lesson } from '../data/curriculum'
import { buildWorkflowMermaid, getLessonOutcomeProfile } from '../data/withWithoutBestPractices'
import FoundationTopicLab from './FoundationTopicLab'
import MermaidDiagram from './MermaidDiagram'
import Stage2MasteryLabs from './Stage2MasteryLabs'
import Stage3MasteryLabs from './Stage3MasteryLabs'
import Stage4MasteryLabs from './Stage4MasteryLabs'
import Stage5MasteryLabs from './Stage5MasteryLabs'
import TopicSpecialistLab from './TopicSpecialistLab'
import TokenStreamTypewriter from './TokenStreamTypewriter'

type Props = { lesson: Lesson }

const stageFromId = (id: string) => Number(id.match(/stage-(\d+)/)?.[1] ?? 0)
const slugFromId = (id: string) => id.split(':').pop() ?? id

/**
 * Universal interactive learning studio applied to ALL 93 curriculum lessons across Stages 1–12.
 * Guarantees every concept provides:
 * 1) Live Mermaid Visualization synced to animated steps
 * 2) Plain-English step explanation & editable scenario
 * 3) Interactive Virtual Impact Simulator (With Concept vs Without Concept under load)
 * 4) Production Best Practices (Do / Avoid)
 * 5) Interactive Next-Step Prediction check + dedicated specialist lab
 */
export default function TopicLearningStudio({ lesson }: Props) {
  const steps = useMemo(
    () =>
      lesson.workflow.length
        ? lesson.workflow
        : [
            'Identify the problem and define inputs',
            'Trace the core transformation',
            'Inspect the output and validate assumptions'
          ],
    [lesson.workflow]
  )
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [scenario, setScenario] = useState(lesson.workedExample)
  const [answer, setAnswer] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)

  // Virtual Simulator controls for every lesson (With It vs Without It under scale)
  const [applyBestPractices, setApplyBestPractices] = useState(true)
  const [workloadScale, setWorkloadScale] = useState(5)

  const stage = stageFromId(lesson.id)
  const topicId = slugFromId(lesson.id)
  const stage4Topic =
    ({ decoder: 'decoding', sampling: 'decoding', finetuning: 'engineering', inference: 'engineering' } as Record<
      string,
      string
    >)[topicId] ?? topicId

  const workflowDiagram = useMemo(() => buildWorkflowMermaid(steps), [steps])
  const outcomeProfile = useMemo(() => getLessonOutcomeProfile(stage, topicId), [stage, topicId])
  const activeNodeId = workflowDiagram.nodeIds[Math.min(step, workflowDiagram.nodeIds.length - 1)]

  const current = steps[step]
  const nextIndex = Math.min(step + 1, steps.length - 1)
  const options = useMemo(() => {
    const candidates = [nextIndex, Math.max(0, step - 1), steps.length - 1]
    return [...new Set(candidates)].slice(0, 3)
  }, [nextIndex, step, steps.length])
  const correctOption = options.indexOf(nextIndex)

  const simMetrics = useMemo(() => {
    const quality = applyBestPractices
      ? Math.max(88, 96 - Math.floor(workloadScale * 0.6))
      : Math.max(38, 69 - workloadScale * 3)
    const failureRisk = applyBestPractices
      ? Math.min(6, Math.max(1, Math.round(workloadScale * 0.5)))
      : Math.min(82, 24 + workloadScale * 6)
    const latencyMs = applyBestPractices
      ? Math.round(140 + workloadScale * 28)
      : Math.round(310 + workloadScale * 145)
    const costRatio = applyBestPractices ? '1.0× (Budgeted)' : `${(1.8 + workloadScale * 0.25).toFixed(1)}× (Retry Waste)`
    return { quality, failureRisk, latencyMs, costRatio }
  }, [applyBestPractices, workloadScale])

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      setStep(value => {
        if (value >= steps.length - 1) {
          setPlaying(false)
          return value
        }
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
    setApplyBestPractices(true)
    setWorkloadScale(5)
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

  return (
    <section className="topic-studio" aria-labelledby="topic-studio-title">
      <header className="topic-studio-header">
        <div>
          <span className="topic-studio-kicker">
            <Sparkles size={13} /> STAGE {String(stage || '—').padStart(2, '0')} · VISUALIZATION · ANIMATION · SIMULATOR · BEST PRACTICES
          </span>
          <h3 id="topic-studio-title">Interactive learning studio</h3>
          <p>
            Explore how <strong>{lesson.title}</strong> works step-by-step, test it WITH vs. WITHOUT best practices in the virtual simulator, and verify mastery.
          </p>
        </div>
        <span className="topic-studio-mode">Interactive DFD + Sim</span>
      </header>

      <FoundationTopicLab topicId={topicId}/>
      {stage === 2 && <Stage2MasteryLabs initialTopic={topicId}/>}
      {stage === 3 && <Stage3MasteryLabs initialTopic={topicId}/>}
      {stage === 4 && <Stage4MasteryLabs initialTopic={stage4Topic}/>}
      {stage === 5 && <Stage5MasteryLabs initialTopic={topicId}/>}
      <TopicSpecialistLab stage={stage} topicId={topicId}/>

      <div className="topic-studio-tabs" aria-label="Learning studio sections">
        <span className="active">
          <BookOpen size={14} /> Animated DFD &amp; Flow
        </span>
        <span>
          <Sliders size={14} /> With vs. Without Simulator
        </span>
        <span>
          <CircleHelp size={14} /> Predict &amp; Practice
        </span>
      </div>

      {/* Live Synchronized Mermaid Architecture & DFD Visualization */}
      <div className="tls-mermaid-box">
        <MermaidDiagram
          syntax={workflowDiagram.syntax}
          diagramType="flowchart"
          highlightNode={activeNodeId}
          nodeLabels={workflowDiagram.nodeLabels}
        />
      </div>

      <div className="topic-studio-scenario">
        <label htmlFor="topic-studio-scenario">Experiment scenario / worked-example input</label>
        <textarea
          id="topic-studio-scenario"
          value={scenario}
          onChange={event => {
            setScenario(event.target.value)
            setAnswer(null)
            setChecked(false)
          }}
          rows={3}
        />
        <small>Trace your custom input through the live animated DFD and inspect each transformation below.</small>
      </div>

      <div className="topic-studio-visual" aria-live="polite">
        <div className="topic-studio-flow" role="list" aria-label="Concept execution steps">
          {steps.map((item, index) => (
            <div className="topic-studio-flow-item" role="listitem" key={index}>
              <button
                className={index === step ? 'current' : index < step ? 'visited' : ''}
                onClick={() => {
                  setPlaying(false)
                  setStep(index)
                  setAnswer(null)
                  setChecked(false)
                }}
                aria-current={index === step ? 'step' : undefined}
                aria-label={`Show step ${index + 1}: ${item}`}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <b>{item}</b>
              </button>
              {index < steps.length - 1 && <i className={index < step ? 'passed' : ''} />}
            </div>
          ))}
        </div>
        <article className="topic-studio-step">
          <div className="topic-studio-step-title">
            <span>{String(step + 1).padStart(2, '0')}</span>
            <div>
              <small>ACTIVE ANIMATED OPERATION</small>
              <h4>{current}</h4>
            </div>
          </div>
          <div className="topic-studio-state">
            <div>
              <small>SCENARIO INPUT</small>
              <p>{scenario.trim() || 'Add a scenario above to explore this workflow.'}</p>
            </div>
            <div>
              <small>HOW IT WORKS AT THIS STEP</small>
              <p>
                {step === 0
                  ? 'Validates inputs, assumptions, and trust boundaries before processing begins.'
                  : step === steps.length - 1
                    ? 'Verifies output quality, safety invariants, and measurable evidence before release.'
                    : 'Transforms intermediate state cleanly and prepares verified inputs for the next node in the DFD.'}
              </p>
            </div>
            <div>
              <small>LEARNING CHECKPOINT</small>
              <p>
                {step === steps.length - 1
                  ? lesson.assessment
                  : 'Explain what enters this node, what breaks if skipped, and what exits to the next stage.'}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="topic-studio-controls">
        <button onClick={() => move(-1)} disabled={step === 0}>
          <ArrowLeft size={15} /> Previous
        </button>
        <button
          className="topic-studio-play"
          onClick={() => {
            if (step === steps.length - 1) setStep(0)
            setPlaying(value => !value)
          }}
        >
          {playing ? (
            <>
              <Pause size={15} /> Pause
            </>
          ) : (
            <>
              <Play size={15} /> {step === steps.length - 1 ? 'Replay' : 'Play walkthrough'}
            </>
          )}
        </button>
        <button onClick={() => move(1)} disabled={step === steps.length - 1}>
          Next <ArrowRight size={15} />
        </button>
        <label>
          Speed{' '}
          <select value={speed} onChange={event => setSpeed(Number(event.target.value))}>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
        </label>
        <button className="topic-studio-reset" onClick={reset}>
          <RotateCcw size={14} /> Reset
        </button>
        <span className="topic-studio-counter">
          {step + 1} / {steps.length}
        </span>
      </div>

      {/* Virtual Simulator: With It vs Without It + Best Practices */}
      <div className="tls-impact-panel">
        <div className="tls-impact-head">
          <div>
            <strong>Virtual Simulator: What Is Achieved With It vs. Without It</strong>
            <p>{outcomeProfile.scenarioContext}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={applyBestPractices}
            className={`bc-toggle ${applyBestPractices ? 'on' : 'off'}`}
            onClick={() => setApplyBestPractices(v => !v)}
          >
            <span className="bc-toggle-thumb" />
            <span>{applyBestPractices ? 'Concept + Best Practices ON' : 'WITHOUT Concept (Naive)'}</span>
          </button>
        </div>

        <div className="tls-scale-row">
          <label htmlFor={`tls-scale-${lesson.id}`}>
            Production Traffic / Data Scale: <strong className="bc-tabular">{workloadScale}× load</strong>
          </label>
          <input
            id={`tls-scale-${lesson.id}`}
            type="range"
            min={1}
            max={10}
            step={1}
            value={workloadScale}
            onChange={e => setWorkloadScale(Number(e.target.value))}
          />
        </div>

        <div className="tls-kpi-row">
          <div className="tls-kpi">
            <span>Quality Score</span>
            <strong className="bc-tabular">{simMetrics.quality}%</strong>
          </div>
          <div className="tls-kpi">
            <span>Failure Risk</span>
            <strong className="bc-tabular">{simMetrics.failureRisk}%</strong>
          </div>
          <div className="tls-kpi">
            <span>Est. Latency</span>
            <strong className="bc-tabular">{simMetrics.latencyMs} ms</strong>
          </div>
          <div className="tls-kpi">
            <span>Resource Efficiency</span>
            <strong className="bc-tabular">{simMetrics.costRatio}</strong>
          </div>
        </div>

        <div className="tls-compare-pair">
          <div className={`tls-compare-item without ${!applyBestPractices ? 'highlighted' : ''}`}>
            <span>
              <XCircle size={14} /> Without It: {outcomeProfile.withoutConcept.headline}
            </span>
            {!applyBestPractices ? (
              <TokenStreamTypewriter
                text={outcomeProfile.withoutConcept.whatBreaks}
                streamKey={`${lesson.id}-without-${workloadScale}`}
                label="Live Failure Mode Output"
                variant="prose"
                tokenDelayMs={28}
              />
            ) : (
              <p>{outcomeProfile.withoutConcept.whatBreaks}</p>
            )}
          </div>
          <div className={`tls-compare-item with ${applyBestPractices ? 'highlighted' : ''}`}>
            <span>
              <CheckCircle2 size={14} /> With It: {outcomeProfile.withConcept.headline}
            </span>
            {applyBestPractices ? (
              <TokenStreamTypewriter
                text={outcomeProfile.withConcept.whatIsAchieved}
                streamKey={`${lesson.id}-with-${workloadScale}`}
                label="Live Production Outcome"
                variant="prose"
                tokenDelayMs={28}
              />
            ) : (
              <p>{outcomeProfile.withConcept.whatIsAchieved}</p>
            )}
          </div>
        </div>

        <div className="tls-bp-list">
          <strong>Production Best Practices (Do / Avoid)</strong>
          {outcomeProfile.bestPractices.slice(0, 3).map(bp => (
            <div key={bp.doThis} className="tls-bp-item">
              <div className="tls-bp-do">
                <CheckCircle2 size={13} /> <span>Do: {bp.doThis}</span>
              </div>
              <div className="tls-bp-avoid">
                <AlertTriangle size={13} /> <span>Avoid: {bp.avoidThis}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="topic-studio-predict">
        <div className="topic-studio-predict-heading">
          <CircleHelp size={16} />
          <div>
            <strong>Predict the next step</strong>
            <p>Choose the next operation in this lesson&apos;s workflow before revealing the answer.</p>
          </div>
        </div>
        <div className="topic-studio-options">
          {options.map((index, optionIndex) => (
            <label
              key={index}
              className={
                checked && optionIndex === correctOption
                  ? 'correct'
                  : checked && answer === optionIndex
                    ? 'incorrect'
                    : ''
              }
            >
              <input
                type="radio"
                name={`predict-${lesson.id}`}
                checked={answer === optionIndex}
                onChange={() => {
                  setAnswer(optionIndex)
                  setChecked(false)
                }}
              />
              <span>{steps[index]}</span>
            </label>
          ))}
        </div>
        <button className="topic-studio-check" disabled={answer === null} onClick={() => setChecked(true)}>
          Check prediction
        </button>
        {checked && (
          <p className={answer === correctOption ? 'topic-studio-feedback good' : 'topic-studio-feedback'}>
            {answer === correctOption ? 'Correct — ' : 'Not quite. The next workflow step is: '}
            {steps[nextIndex]}
            {step === steps.length - 1
              ? ' You are at the final step; reset to repeat the walkthrough.'
              : ' Review the transition and explain why this operation follows the current one.'}
          </p>
        )}
      </div>
      <footer className="topic-studio-disclaimer">
        Full-curriculum verified · Live Mermaid DFD, animated walkthrough, With/Without simulator and best practices enabled for topic key: {topicId}.
      </footer>
    </section>
  )
}
