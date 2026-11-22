import { useMemo, useState } from 'react'
import { Award, CheckCircle2, RotateCcw, Target } from 'lucide-react'
import type { Lesson } from '../data/curriculum'

type Props = { lesson: Lesson }
type Attempt = { score: number; total: number; rubric: number; completedAt: string }
const rubricLabels = [
  'I can explain the mechanism without relying on copied wording.',
  'I can reproduce the worked example and explain intermediate values.',
  'I can implement or trace the core operation and test an edge case.',
  'I can identify a realistic failure mode and a production trade-off.'
]
const readAttempt = (id: string): Attempt | null => {
  try {
    const raw = localStorage.getItem(`ai-academy.assessment.v1.${id}`)
    return raw ? JSON.parse(raw) as Attempt : null
  } catch { return null }
}

export default function AssessmentEngine({ lesson }: Props) {
  const questions = useMemo(() => {
    const steps = lesson.workflow
    return [0, Math.floor((steps.length - 1) / 2), Math.max(0, steps.length - 2)]
      .filter((value, index, all) => index === 0 || value !== all[index - 1])
      .map((stepIndex, index) => {
        const correct = Math.min(stepIndex + 1, steps.length - 1)
        const candidates = [...new Set([correct, Math.max(0, correct - 1), Math.min(steps.length - 1, correct + 1), steps.length - 1])]
          .filter(value => value !== stepIndex)
        const choices = candidates.slice(0, 3)
        if (!choices.includes(correct)) choices[0] = correct
        return {
          id: `${lesson.id}-q${index}`,
          prompt: `In the “${steps[stepIndex]}” phase, which operation should follow in this lesson's workflow?`,
          choices,
          correct: choices.indexOf(correct),
          explanation: `The next documented operation is “${steps[correct]}”. Follow the sequence so each stage has the inputs and evidence it needs.`
        }
      })
  }, [lesson.id, lesson.workflow])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [rubric, setRubric] = useState<boolean[]>([false, false, false, false])
  const [submitted, setSubmitted] = useState(false)
  const [attempt, setAttempt] = useState<Attempt | null>(() => readAttempt(lesson.id))
  const score = questions.filter(question => answers[question.id] === question.correct).length
  const rubricScore = rubric.filter(Boolean).length
  const passed = score === questions.length && rubricScore >= 3

  const submit = () => {
    if (Object.keys(answers).length !== questions.length) return
    const result = { score, total: questions.length, rubric: rubricScore, completedAt: new Date().toISOString() }
    setAttempt(result)
    setSubmitted(true)
    try { localStorage.setItem(`ai-academy.assessment.v1.${lesson.id}`, JSON.stringify(result)) } catch { /* storage may be disabled */ }
  }
  const reset = () => { setAnswers({}); setRubric([false, false, false, false]); setSubmitted(false) }

  return <section className="assessment-engine" aria-labelledby="assessment-engine-title">
    <header className="assessment-engine-header">
      <div><span className="assessment-engine-kicker"><Target size={13}/> MASTERY CHECK</span><h3 id="assessment-engine-title">Topic assessment</h3><p>Check workflow understanding, then rate your ability to explain, reproduce, implement and diagnose the topic.</p></div>
      {attempt && <span className={attempt.score === attempt.total && attempt.rubric >= 3 ? 'assessment-engine-status passed' : 'assessment-engine-status'}>{attempt.score}/{attempt.total} quiz · {attempt.rubric}/4 rubric</span>}
    </header>
    <div className="assessment-engine-questions">
      {questions.map((question, index) => <fieldset className="assessment-question" key={question.id} disabled={submitted}>
        <legend><span>Q{index + 1}</span>{question.prompt}</legend>
        {question.choices.map((choice, choiceIndex) => <label key={choice}><input type="radio" name={question.id} checked={answers[question.id] === choiceIndex} onChange={() => setAnswers(current => ({ ...current, [question.id]: choiceIndex }))}/><span>{lesson.workflow[choice]}</span></label>)}
        {submitted && <p className={answers[question.id] === question.correct ? 'assessment-explanation correct' : 'assessment-explanation'}>{answers[question.id] === question.correct ? 'Correct. ' : 'Review this transition. '}{question.explanation}</p>}
      </fieldset>)}
    </div>
    <div className="assessment-rubric"><h4>Self-assessment rubric</h4><p>Tick each statement only when you can demonstrate it without looking at the lesson.</p>
      {rubricLabels.map((label, index) => <label key={label}><input type="checkbox" checked={rubric[index]} disabled={submitted} onChange={event => setRubric(current => current.map((value, item) => item === index ? event.target.checked : value))}/><span>{label}</span></label>)}
    </div>
    {!submitted ? <button className="assessment-submit" disabled={Object.keys(answers).length !== questions.length} onClick={submit}>Submit assessment</button> : <div className={passed ? 'assessment-result passed' : 'assessment-result'} role="status"><Award size={18}/><div><strong>{passed ? 'Topic checkpoint passed' : 'Review and try again'}</strong><p>Quiz: {score}/{questions.length}. Self-assessment: {rubricScore}/4. A pass requires a perfect workflow quiz and at least 3 rubric checks. This is a learning checkpoint, not a proctored certification.</p></div><button onClick={reset}><RotateCcw size={14}/> Retake</button></div>}
    {attempt && !submitted && <p className="assessment-previous"><CheckCircle2 size={13}/> Previous saved attempt: {attempt.score}/{attempt.total} quiz and {attempt.rubric}/4 self-assessment.</p>}
  </section>
}
