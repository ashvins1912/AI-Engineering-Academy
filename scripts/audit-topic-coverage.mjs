import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')
const curriculum = read('src/data/curriculum.ts')
const app = read('src/App.tsx')
const practice = read('src/components/LessonPractice.tsx')
const studio = read('src/components/TopicLearningStudio.tsx')
const foundationLab = read('src/components/FoundationTopicLab.tsx')
const requiredFoundationLabs = ['vectors','probability','calculus','optimization','python-core','numpy-pandas','data-quality']
const stageMatches = [...curriculum.matchAll(/id:\s*'stage-(\d+)'/g)]
const lessons = [...curriculum.matchAll(/lesson\('([^']+)'\s*,\s*'([^']+)'/g)].map(match => {
  const stage = stageMatches.filter(item => item.index < match.index).at(-1)
  return { id: match[1], title: match[2], stage: Number(stage?.[1] ?? 0) }
})
const duplicates = lessons.map(x => x.id).filter((id, i, all) => all.indexOf(id) !== i)
if (duplicates.length) {
  console.error('FAIL duplicate topic IDs: ' + [...new Set(duplicates)].join(', '))
  process.exit(1)
}
const stageGuides = [
  '01-mathematics-python-data.md','02-classical-machine-learning.md','03-deep-learning.md',
  '04-transformers-llms-generative-ai.md','05-rag-visual-rag-knowledge-systems.md','06-ai-agents.md',
  '07-mcp-a2a-acp-tool-ecosystems.md','08-automation-workflow-orchestration.md','09-mlops-llmops-ai-devops.md',
  '10-security-observability-production.md','11-enterprise-capstone.md','12-advanced-ai-engineering.md'
]
const guideExists = stage => existsSync(new URL('docs/deep-dives/' + stageGuides[stage-1], root))
const labPack = stage => {
  const path = new URL('docs/deep-dives/labs/stage-' + String(stage).padStart(2,'0') + '.md', root)
  return existsSync(path) ? readFileSync(path,'utf8') : ''
}
const requiredLabSections = ['**Implementation task:**','**Worked fixture:**','**Expected result:**','**Verification tests:**','**Debugging checklist:**','**Interview checks:**','**Submission evidence:**']
const practiceSpec = id => practice.includes("'" + id + "': {") || practice.includes(id + ': {')
const rows = lessons.map(topic => {
  const pack = labPack(topic.stage)
  const section = pack.split(/\n(?=## [\w-]+ — )/).find(block => block.startsWith('## ' + topic.id + ' —')) ?? ''
  const content = existsSync(new URL('content/topics/' + topic.id + '/lesson.json', root))
  const studioWired = app.includes("import TopicLearningStudio from './components/TopicLearningStudio'") && app.includes('<TopicLearningStudio lesson={selectedLesson}/>')
  const workflow = curriculum.slice(curriculum.indexOf("lesson('" + topic.id + "'"), curriculum.indexOf("lesson('" + topic.id + "'") + 5000)
  return {
    ...topic,
    topicJson: content,
    stageGuide: guideExists(topic.stage),
    labPack: Boolean(section),
    completeLabSections: Boolean(section) && requiredLabSections.every(label => section.includes(label)),
    tailoredPracticeCode: practiceSpec(topic.id),
    sharedStudio: studioWired && studio.includes('lesson.workflow'),
    workflowSteps: (workflow.match(/'[^']{8,}'/g) ?? []).length
  }
})
const stageSummary = [...new Set(lessons.map(x=>x.stage))].sort((a,b)=>a-b).map(stage => {
  const items=rows.filter(x=>x.stage===stage)
  const count=key=>items.filter(x=>x[key]).length
  return {stage,topics:items.length,lessonJson:count('topicJson'),labPack:count('labPack'),completeLab:count('completeLabSections'),tailoredCode:count('tailoredPracticeCode'),sharedStudio:count('sharedStudio')}
})
console.log('AI ENGINEERING ACADEMY TOPIC COVERAGE')
console.log('Topics: '+lessons.length+' | Stages: '+new Set(lessons.map(x=>x.stage)).size+' | Unique IDs: '+(duplicates.length===0))
console.table(stageSummary)
const gaps=rows.filter(x=>!x.topicJson||!x.labPack||!x.completeLabSections||!x.tailoredPracticeCode||!x.sharedStudio)
console.log('Topics with at least one artifact gap: '+gaps.length+'/'+rows.length)
for(const x of gaps) console.log([
  x.id+' (stage '+x.stage+')',
  !x.topicJson?'missing topic JSON':'',
  !x.labPack?'missing lab pack':'',
  x.labPack&&!x.completeLabSections?'incomplete lab sections':'',
  !x.tailoredPracticeCode?'no dedicated code override (generic starter may apply)':'',
  !x.sharedStudio?'shared studio not wired':''
].filter(Boolean).join(' | '))
if(lessons.length!==93) { console.error('FAIL expected 93 curriculum topics; found '+lessons.length); process.exit(1) }
if(!app.includes('<TopicLearningStudio lesson={selectedLesson}/>')||!studio.includes('lesson.workflow')) { console.error('FAIL universal topic studio is not wired to lesson workflow'); process.exit(1) }
if(stageGuides.some((_,i)=>!guideExists(i+1))) { console.error('FAIL one or more stage deep-dive guides are missing'); process.exit(1) }
const missingFoundationLabs = requiredFoundationLabs.filter(id => !foundationLab.includes("topicId==='" + id + "'"))
if(missingFoundationLabs.length) { console.error('FAIL missing Stage 1 numerical/data simulators: ' + missingFoundationLabs.join(', ')); process.exit(1) }

const specialistRouter = read('src/components/TopicSpecialistLab.tsx')
const productionLab = read('src/components/ProductionTopicLab.tsx')
const capstoneLab = read('src/components/CapstoneTopicLab.tsx')
const requiredStageRoutes = [
  [6, ['agent-loop','planning','memory','state','human-loop','patterns','langgraph','frameworks','agent-eval']],
  [7, ['mcp-architecture','mcp-primitives','mcp-advanced','mcp-transport','mcp-security','a2a','ibm-acp','client-acp','tooling']],
  [8, ['workflow-patterns','event-driven','durable','automation-tools']],
  [9, ['experiment','registry','eval-ci','data-pipeline','containers','cicd','infra','kubernetes','serving','rollouts']],
  [10, ['prompt-injection','tool-security','tenant-security','supply-chain','tracing','slos','cost','incidents']],
  [11, ['capstone-design','capstone-build','capstone-delivery']],
  [12, ['agent-orchestration','protocol-interop','advanced-retrieval','evaluation-scale','ai-red-team','inference-performance','multimodal-systems','enterprise-governance','advanced-practicum']]
]
if(!studio.includes("stage === 2 && <Stage2MasteryLabs initialTopic={topicId}/>") || !studio.includes("stage === 3 && <Stage3MasteryLabs initialTopic={topicId}/>") || !studio.includes("stage === 4 && <Stage4MasteryLabs initialTopic={stage4Topic}/>") || !studio.includes("stage === 5 && <Stage5MasteryLabs initialTopic={topicId}/>") || !studio.includes('<TopicSpecialistLab stage={stage} topicId={topicId}/>')) { console.error('FAIL stage 2–8 lesson lab routing is incomplete'); process.exit(1) }
const requiredProductionTopics = ['kubernetes','serving','rollouts','prompt-injection','tool-security','tenant-security','supply-chain','tracing','slos','cost','incidents']
const requiredCapstoneTopics = [[11,['capstone-design','capstone-build','capstone-delivery']],[12,['agent-orchestration','protocol-interop','advanced-retrieval','evaluation-scale','ai-red-team','inference-performance','multimodal-systems','enterprise-governance','advanced-practicum']]]
const missingProduction = requiredProductionTopics.filter(id => !productionLab.includes("topicId==='" + id + "'"))
const missingCapstone = requiredCapstoneTopics.flatMap(([stage,ids]) => ids.filter(id => !capstoneLab.includes('stage===' + stage + "&&topicId==='" + id + "'")).map(id => 'stage ' + stage + ': ' + id))
if(missingProduction.length || missingCapstone.length) { console.error('FAIL production/capstone topic simulators missing: ' + [...missingProduction,...missingCapstone].join(', ')); process.exit(1) }
const missingRoutes = requiredStageRoutes.flatMap(([stage, ids]) => ids.filter(id => !specialistRouter.includes("'" + id + "'")).map(id => 'stage ' + stage + ': ' + id))
if(missingRoutes.length) { console.error('FAIL missing specialist lesson routes: ' + missingRoutes.join(', ')); process.exit(1) }

console.log('PASS 93-topic inventory, Stage 1–12 lesson lab routing, universal studio wiring and stage guide presence. Artifact gaps above are reported for staged remediation, not hidden.')
