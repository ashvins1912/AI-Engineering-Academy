import { existsSync, readFileSync } from 'node:fs'

const curriculum = readFileSync(new URL('../src/data/curriculum.ts', import.meta.url), 'utf8')
const stageMatches = [...curriculum.matchAll(/id:\s*'stage-(\d+)'/g)]
const lessonMatches = [...curriculum.matchAll(/lesson\('([^']+)'\s*,\s*'([^']+)'/g)]
const topics = lessonMatches.map(match => {
  const stage = stageMatches.filter(item => item.index < match.index).at(-1)
  return { id: match[1], title: match[2], stage: Number(stage?.[1] ?? 0) }
})
const duplicateIds = topics.map(topic => topic.id).filter((id, index, all) => all.indexOf(id) !== index)
if (duplicateIds.length) {
  console.error(`FAIL duplicate curriculum topic IDs: ${[...new Set(duplicateIds)].join(', ')}`)
  process.exit(1)
}
if (topics.length !== 84) {
  console.error(`FAIL expected the reviewed baseline of 84 topics, found ${topics.length}`)
  process.exit(1)
}

const stageCounts = new Map()
let migrated = 0
for (const topic of topics) {
  const path = new URL(`../content/topics/${topic.id}/lesson.json`, import.meta.url)
  const present = existsSync(path)
  if (present) migrated += 1
  stageCounts.set(topic.stage, (stageCounts.get(topic.stage) ?? 0) + 1)
}
console.log(`PASS curriculum migration inventory: ${topics.length} unique topics across ${stageCounts.size} stages`)
for (const [stage, count] of [...stageCounts.entries()].sort((a, b) => a[0] - b[0])) {
  const stageTopics = topics.filter(topic => topic.stage === stage)
  const stageMigrated = stageTopics.filter(topic => existsSync(new URL(`../content/topics/${topic.id}/lesson.json`, import.meta.url))).length
  console.log(`Stage ${String(stage).padStart(2, '0')}: ${stageMigrated}/${count} canonical topic artifacts`)
}
console.log(`Migration coverage: ${migrated}/${topics.length} (${Math.round(migrated / topics.length * 100)}%). Legacy lessons remain supported during staged migration.`)
