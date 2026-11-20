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

function readRecord(id: string): ReflectionRecord {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, ReflectionRecord>
    return { ...blank, ...(all[id] || {}) }
  } catch { return blank }
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
  const update = <K extends keyof ReflectionRecord>(key: K, value: ReflectionRecord[K]) => {
    setRecord(current => ({ ...current, [key]: value }))
    setSaved(false)
  }
  const save = () => {
    try {
      const all = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, ReflectionRecord>
      localStorage.setItem(KEY, JSON.stringify({ ...all, [lesson.id]: { ...record, updatedAt: new Date().toISOString() } }))
      setSaved(true)
    } catch { setSaved(false) }
  }

  return <section className="student-reflection">
    <div className="reflection-heading">
      <div><span className="reflection-kicker"><BookOpenCheck size={13}/> LEARNER SELF-REVIEW</span><h3>Rate your learning after practice</h3></div>
      <span className="reflection-local">Saved in this browser</span>
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
      <label><span>Implementation notes and evidence</span><textarea value={record.runEvidence} onChange={e=>update('runEvidence',e.target.value)} placeholder="What did you build? Include command, output, tests passed and design decisions." /></label>
      <label><span>Challenges faced — symptom, root cause and fix</span><textarea value={record.challenges} onChange={e=>update('challenges',e.target.value)} placeholder="What failed? What error did you see? What was the root cause and how did you fix it?" /></label>
      <label><span>My learning notes</span><textarea value={record.notes} onChange={e=>update('notes',e.target.value)} placeholder="Explain the concept in your own words. What is still confusing?" /></label>
      <label className="reflection-field"><span>Next action</span>
        <select value={record.nextAction} onChange={e=>update('nextAction',e.target.value)}>
          <option value="revisit">Re-read the concept</option><option value="visual">Repeat the visual walkthrough</option><option value="rebuild">Rebuild without looking</option><option value="debug">Repeat the failure challenge</option><option value="extend">Try the expert extension</option><option value="teach">Explain / teach this topic</option>
        </select>
      </label>
    </div>
    <div className="reflection-actions"><button onClick={save}><Save size={14}/>{saved ? 'Saved' : 'Save reflection'}</button><span>{saved ? 'Reflection saved for this topic on this device.' : 'Save after completing your practice.'}</span></div>
  </section>
}
