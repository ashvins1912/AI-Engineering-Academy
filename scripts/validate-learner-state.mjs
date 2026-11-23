import { readFileSync } from 'node:fs'

const assessment = readFileSync('src/components/AssessmentEngine.tsx', 'utf8')
const reflection = readFileSync('src/components/StudentReflection.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')

const checks = [
  ['assessment reloads the saved attempt when the lesson changes', assessment.includes('setAttempt(readAttempt(lesson.id))') && assessment.includes('}, [lesson.id])')],
  ['assessment clears answers, rubric and submitted state between lessons', assessment.includes('setAnswers({})') && assessment.includes('setRubric([false, false, false, false])') && assessment.includes('setSubmitted(false)')],
  ['assessment rejects malformed persisted attempts', assessment.includes('Number.isInteger(attempt.score)') && assessment.includes('attempt.score > attempt.total') && assessment.includes('attempt.rubric > 4')],
  ['reflection is keyed by lesson identity in the application', app.includes('<StudentReflection key={selectedLesson.id}')],
  ['reflection validates stored records before rendering', reflection.includes('boundedNumber(value.readability') && reflection.includes('boundedText(value.runEvidence, 5000)')],
  ['reflection input size is bounded', reflection.includes('maxLength={5000}')],
  ['reflection reports browser-storage failures accessibly', reflection.includes('setSaveError(true)') && reflection.includes('role="status"') && reflection.includes('were not saved')],
  ['reflection storage errors do not crash the learner view', reflection.includes('} catch {') && reflection.includes('setSaved(false)') && reflection.includes('setSaveError(true)')],
]

const failed = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failed.length) process.exit(1)
