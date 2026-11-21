import { useState } from 'react'
import { BookOpen, Bug, CheckCircle2, Code2, Lightbulb, Target } from 'lucide-react'
import lesson from '../../content/topics/agent-loop/lesson.json'

export default function AgentLoopLessonDetails() {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)
  const quiz = lesson.practice.scenarioQuiz
  const score = quiz.filter((item, index) => answers[index] === item.correctIndex).length

  return <section className="agent-topic-content">
    <div className="agent-topic-section">
      <span className="agent-topic-kicker"><BookOpen size={13}/> FIRST PRINCIPLES</span>
      <h3>Understand the agent loop</h3>
      {lesson.explanation.plainLanguage.split('\n\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      <div className="agent-topic-callout"><strong>Everyday analogy</strong><p>{lesson.explanation.everydayAnalogy}</p></div>
      <div className="agent-topic-grid">
        <article><h4><Lightbulb size={14}/> Math made simple</h4><p>{lesson.explanation.mathMadeSimple}</p></article>
        <article><h4><Target size={14}/> Production impact</h4><p>{lesson.explanation.productionImpact}</p></article>
      </div>
    </div>

    <div className="agent-topic-section">
      <span className="agent-topic-kicker">WORKED NUMERICAL TRACE</span>
      <h3>{lesson.workedExample.problem}</h3>
      <p className="agent-topic-input">{lesson.workedExample.input}</p>
      <ol className="agent-topic-steps">{lesson.workedExample.steps.map((item, index) => <li key={index}><strong>{item.operation}</strong><p>{item.reasoning}</p><code>{item.result}</code></li>)}</ol>
      <div className="agent-topic-result"><small>EXPECTED OUTPUT</small><p>{lesson.workedExample.expectedOutput}</p></div>
    </div>

    <div className="agent-topic-section">
      <span className="agent-topic-kicker"><Bug size={13}/> PRODUCTION FAILURE LABS</span>
      <h3>How agent loops fail in real systems</h3>
      <div className="agent-topic-failures">{lesson.failures.map((item, index) => <article key={item.name}><h4>{index + 1}. {item.name}</h4><p><b>Symptom:</b> {item.symptom}</p><p><b>Root cause:</b> {item.rootCause}</p><p><b>Exact fix:</b> {item.recovery}</p><p><b>Regression test:</b> {item.regressionTest}</p></article>)}</div>
    </div>

    <div className="agent-topic-section">
      <span className="agent-topic-kicker"><Code2 size={13}/> CODE WALKTHROUGH</span>
      <h3>Read the important lines</h3>
      {lesson.codeWalkthrough.map((item, index) => <article className="agent-topic-code-line" key={index}><code>{item.lines}</code><p>{item.explanation}</p></article>)}
      <div className="agent-topic-practice">
        <h4>{lesson.practice.guidedExercise.title}</h4>
        <p>{lesson.practice.guidedExercise.instructions}</p>
        <small>STARTER CODE</small><pre>{lesson.practice.guidedExercise.starterCode}</pre>
        <small>SOLUTION</small><pre>{lesson.practice.guidedExercise.solutionCode}</pre>
        <small>UNIT TESTS</small><pre>{lesson.practice.guidedExercise.unitTests}</pre>
      </div>
    </div>

    <div className="agent-topic-section">
      <span className="agent-topic-kicker">MINI-APP INTEGRATION</span>
      <h3>{lesson.practice.miniAppIntegration.projectGoal}</h3>
      <ol>{lesson.practice.miniAppIntegration.steps.map((item, index) => <li key={index}>{item}</li>)}</ol>
    </div>

    <div className="agent-topic-section agent-topic-quiz">
      <span className="agent-topic-kicker">ENGINEERING DECISION CHECK</span>
      <h3>Scenario quiz</h3>
      {quiz.map((item, index) => <article className="agent-topic-question" key={index}>
        <strong>{index + 1}. {item.question}</strong>
        <div>{item.options.map((option, optionIndex) => <label key={optionIndex}><input type="radio" name={`agent-loop-quiz-${index}`} checked={answers[index] === optionIndex} onChange={() => {setAnswers(old => ({...old,[index]:optionIndex}));setChecked(false)}}/><span>{option}</span></label>)}</div>
        {checked && <p className={answers[index] === item.correctIndex ? 'correct' : 'incorrect'}>{answers[index] === item.correctIndex ? 'Correct. ' : `Correct answer: ${item.options[item.correctIndex]}. `}{item.explanation}</p>}
      </article>)}
      <button className="agent-topic-check" onClick={() => setChecked(true)} disabled={Object.keys(answers).length !== quiz.length}>Check answers</button>
      {checked && <strong className="agent-topic-score">Score: {score} / {quiz.length}</strong>}
    </div>
  </section>
}
