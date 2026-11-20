import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/data/curriculum.ts', import.meta.url), 'utf8')
const stageIds = [...source.matchAll(/id:\s*'stage-\d+'/g)].map(match => match[0])
const lessonIds = [...source.matchAll(/lesson\('([^']+)'/g)].map(match => match[1])
const required = ['vectors', 'calculus', 'linear-regression', 'attention', 'chunking', 'visual-rag', 'agent-loop', 'mcp-architecture', 'a2a', 'ibm-acp', 'client-acp', 'capstone-design']
const missing = required.filter(id => !lessonIds.includes(id))
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const practice = readFileSync(new URL('../src/components/LessonPractice.tsx', import.meta.url), 'utf8')
const deepDiveFiles = [
  '01-mathematics-python-data.md', '02-classical-machine-learning.md', '03-deep-learning.md',
  '04-transformers-llms-generative-ai.md', '05-rag-visual-rag-knowledge-systems.md',
  '06-ai-agents.md', '07-mcp-a2a-acp-tool-ecosystems.md', '08-automation-workflow-orchestration.md',
  '09-mlops-llmops-ai-devops.md', '10-security-observability-production.md', '11-enterprise-capstone.md'
]
const missingGuides = deepDiveFiles.filter(file => {
  try { readFileSync(new URL(`../docs/deep-dives/${file}`, import.meta.url)); return false }
  catch { return true }
})

const checks = [
  ['11 learning stages', stageIds.length === 11],
  ['at least 80 lesson blueprints', lessonIds.length >= 80],
  ['stage-namespaced progress identifiers', source.includes('id: `${stage.id}:${item.id}`')],
  ['required deep-dive topics', missing.length === 0],
  ['practice workbench integrated into every lesson detail', app.includes('<LessonPractice lesson={selectedLesson}/>')],
  ['interactive workflow and step navigation', practice.includes('practice-flow-node') && practice.includes('setStep')],
  ['environment setup and starter code', practice.includes('ENVIRONMENT SETUP') && practice.includes('STARTER IMPLEMENTATION')],
  ['debugging and production checklists', practice.includes('Debug deliberately') && practice.includes('Production engineering checklist')],
  ['official references and practice criteria', practice.includes('Primary references') && practice.includes('YOUR SUBMISSION')],
  ['complete deep-dive guides for all 11 stages', missingGuides.length === 0],
  ['lesson workbench links to stage deep-dive guide', practice.includes('Complete stage guide') && practice.includes('docs/deep-dives/')]
]
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`)
if (missing.length) console.error(`Missing lesson identifiers: ${missing.join(', ')}`)
if (missingGuides.length) console.error(`Missing deep-dive guides: ${missingGuides.join(', ')}`)
if (checks.some(([, passed]) => !passed)) process.exit(1)
console.log(`Validated ${stageIds.length} stages and ${lessonIds.length} lesson blueprints.`)
