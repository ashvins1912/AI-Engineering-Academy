import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/data/curriculum.ts', import.meta.url), 'utf8')
const stageIds = [...source.matchAll(/id:\s*'stage-\d+'/g)].map(match => match[0])
const lessonIds = [...source.matchAll(/lesson\('([^']+)'/g)].map(match => match[1])
const required = ['vectors', 'calculus', 'linear-regression', 'attention', 'chunking', 'visual-rag', 'agent-loop', 'mcp-architecture', 'a2a', 'ibm-acp', 'client-acp', 'capstone-design']
const missing = required.filter(id => !lessonIds.includes(id))
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')\nconst practice = readFileSync(new URL('../src/components/LessonPractice.tsx', import.meta.url), 'utf8')\nconst checks = [
  ['11 learning stages', stageIds.length === 11],
  ['at least 80 lesson blueprints', lessonIds.length >= 80],
  ['stage-namespaced progress identifiers', source.includes('id: `${stage.id}:${item.id}`')],
  ['required deep-dive topics', missing.length === 0]
]
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`)
if (missing.length) console.error(`Missing lesson identifiers: ${missing.join(', ')}`)
if (checks.some(([, passed]) => !passed)) process.exit(1)
console.log(`Validated ${stageIds.length} stages and ${lessonIds.length} lesson blueprints.`)
