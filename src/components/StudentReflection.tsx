import { useState } from 'react'
import { Save, BookOpenCheck } from 'lucide-react'
import type { Lesson } from '../data/curriculum'

type ReflectionRecord = {
  readability: number
  ease: number
  concept: number
  implementation: number
  visual: number
  difficulty: number
  proficiency: number
  runEvidence: string
  notes: string
  challenges: string
  nextAction: string
  updatedAt: string
}

const KEY = 'ai-academy.reflections.v1'
const blank: ReflectionRecord = {
  readability: 3, ease: 3, concept: 0, implementation: 0, visual: 3, difficulty: 3, proficiency: 0,
  runEvidence: '', notes: '', challenges: '', nextAction: 'revisit', updatedAt: ''
}
const actions = new Set(['revisit', 'visual', 'rebuild', 'debug', 'extend', 'teach'])
const boundedNumber = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback
const boundedText = (value: unknown, max: number) =>
  typeof value === 'string' ? value.slice(0, max) : ''

function readRecord(id: string): ReflectionRecord {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...blank }
    const candidate = (parsed as Record<string, unknown>)[id]
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return { ...blank }
    const value = candidate as Record<string, unknown>
    return {
      readability: boundedNumber(value.readability, 1, 5, blank.readability),
      ease: boundedNumber(value.ease, 1, 5, blank.ease),
      concept: boundedNumber(value.concept, 0, 5, blank.concept),
      implementation: boundedNumber(value.implementation, 0, 5, blank.implementation),
      visual: boundedNumber(value.visual, 1, 5, blank.visual),
      difficulty: boundedNumber(value.difficulty, 1, 5, blank.difficulty),
      proficiency: boundedNumber(value.proficiency, 0, 7, blank.proficiency),
      runEvidence: boundedText(value.runEvidence, 5000),
      notes: boundedText(value.notes, 5000),
      challenges: boundedText(value.challenges, 5000),
      nextAction: typeof value.nextAction === 'string' && actions.has(value.nextAction) ? value.nextAction : blank.nextAction,
      updatedAt: boundedText(value.updatedAt, 40)
    }
  } catch { return { ...blank } }
}

const scale = (name: string, value: number, onChange: (value: number) => void, labels: string[], min = 1) => (
  <label className="reflection-field">
    <span>{name}</span>
    <select value={value} onChange={event => onChange(Number(event.target.value))}>
      {labels.map((label, index) => <option key={index} value={index + min}>{index + min} · {label}</option>)}
    </select>
  </label>
)

export default function StudentReflection({ lesson }: { lesson: Lesson }) {
  const [record, setRecord] = useState<ReflectionRecord>(() => readRecord(lesson.id))
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const update = <K extends keyof ReflectionRecord>(key: K, value: ReflectionRecord[K]) => {
    setRecord(current => ({ ...current, [key]: value }))
    setSaved(false)
    setSaveError(false)
  }
  const save = () => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || '{}')
      const all = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {}
      const updated = { ...record, updatedAt: new Date().toISOString() }
      localStorage.setItem(KEY, JSON.stringify({ ...all, [lesson.id]: updated }))
      setRecord(updated)
      setSaved(true)
      setSaveError(false)
    } catch {
      setSaved(false)
      setSaveError(true)
    }
  }

  return <section className="student-reflection">
    <div className="reflection-heading">
      <div><span className="reflection-kicker"><BookOpenCheck size={13}/> LEARNER SELF-REVIEW</span><h3>Rate your learning after practice</h3></div>
      <span className="reflection-local">Local-only reflection</span>
    </div>
    <p className="reflection-intro">Be honest. Confidence is your own feeling; mastery is earned through code, tests and real implementation evidence. Your ratings help identify what needs another explanation.</p>
    <div className="reflection-ratings">
      {scale('Readability', record.readability, v => update('readability', v), ['Very hard','Hard','Okay','Easy','Very easy'])}
      {scale('Ease of learning', record.ease, v => update('ease', v), ['Very hard','Hard','Okay','Easy','Very easy'])}
      {scale('Concept understanding', record.concept, v => update('concept', v), ['Not yet','Recognize it','Explain with help','Explain independently','Teach it'], 0)}
      {scale('Implementation confidence', record.implementation, v => update('implementation', v), ['No confidence','Need full guidance','Can follow a tutorial','Can build independently','Can adapt for production'], 0)}
      {scale('Visual / DFD usefulness', record.visual, v => update('visual', v), ['Not useful','Slightly useful','Somewhat clear','Clear','Very clear'])}
      {scale('Practice difficulty', record.difficulty, v => update('difficulty', v), ['Very easy','Easy','Balanced','Hard','Very hard'])}
    </div>
    <div className="reflection-proficiency">
      <label className="reflection-field"><span>Current level — zero to expertise</span>
        <select value={record.proficiency} onChange={e => update('proficiency', Number(e.target.value))}>
          {['0 · Not started','1 · Aware','2 · Understands','3 · Guided builder','4 · Independent builder','5 · Production practitioner','6 · Advanced practitioner','7 · Expert / architect'].map((v,i)=><option key={i} value={i}>{v}</option>)}
        </select>
      </label>
      <p>Choose the highest level you can demonstrate today—not the level you hope to reach.</p>
    </div>
    <div className="reflection-notes">
      <label><span>Implementation notes and evidence</span><textarea maxLength={5000} value={record.runEvidence} onChange={e=>update('runEvidence',e.target.value)} placeholder="What did you build? Include command, output, tests passed and design decisions." /></label>
      <label><span>Challenges faced — symptom, root cause and fix</span><textarea maxLength={5000} value={record.challenges} onChange={e=>update('challenges',e.target.value)} placeholder="What failed? What error did you see? What was the root cause and how did you fix it?" /></label>
      <label><span>My learning notes</span><textarea maxLength={5000} value={record.notes} onChange={e=>update('notes',e.target.value)} placeholder="Explain the concept in your own words. What is still confusing?" /></label>
      <label className="reflection-field"><span>Next action</span>
        <select value={record.nextAction} onChange={e=>update('nextAction',e.target.value)}>
          <option value="revisit">Re-read the concept</option><option value="visual">Repeat the visual walkthrough</option><option value="rebuild">Rebuild without looking</option><option value="debug">Repeat the failure challenge</option><option value="extend">Try the expert extension</option><option value="teach">Explain / teach this topic</option>
        </select>
      </label>
    </div>
    <div className="reflection-actions"><button onClick={save}><Save size={14}/>{saved ? 'Saved' : 'Save reflection'}</button><span role="status">{saved ? 'Reflection saved for this topic on this device.' : saveError ? 'Browser storage is unavailable or full. Your current edits remain on screen but were not saved.' : 'Save after completing your practice.'}</span></div>
  </section>
}
