import { readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const schema = JSON.parse(readFileSync(new URL('content/topic.schema.json', root), 'utf8'))
const example = JSON.parse(readFileSync(new URL('content/examples/attention-topic.json', root), 'utf8'))
const failures = []

function validate(value, shape, path = '$') {
  if (shape.const !== undefined && value !== shape.const) failures.push(`${path}: expected constant ${shape.const}`)
  if (shape.enum && !shape.enum.includes(value)) failures.push(`${path}: expected one of ${shape.enum.join(', ')}`)
  if (shape.pattern && typeof value === 'string' && !(new RegExp(shape.pattern).test(value))) failures.push(`${path}: does not match required pattern ${shape.pattern}`)
  if (shape.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { failures.push(`${path}: expected object`); return }
    for (const key of shape.required ?? []) if (!(key in value)) failures.push(`${path}.${key}: required field missing`)
    if (shape.additionalProperties === false) for (const key of Object.keys(value)) if (!(key in (shape.properties ?? {}))) failures.push(`${path}.${key}: unknown field`)
    for (const [key, child] of Object.entries(shape.properties ?? {})) if (key in value) validate(value[key], child, `${path}.${key}`)
  } else if (shape.type === 'array') {
    if (!Array.isArray(value)) { failures.push(`${path}: expected array`); return }
    if (shape.minItems !== undefined && value.length < shape.minItems) failures.push(`${path}: expected at least ${shape.minItems} items`)
    if (shape.maxItems !== undefined && value.length > shape.maxItems) failures.push(`${path}: expected at most ${shape.maxItems} items`)
    value.forEach((item, index) => validate(item, shape.items, `${path}[${index}]`))
  } else if (shape.type === 'string') {
    if (typeof value !== 'string') failures.push(`${path}: expected string`)
    else if (shape.minLength !== undefined && value.trim().length < shape.minLength) failures.push(`${path}: expected at least ${shape.minLength} characters`)
  } else if (shape.type === 'integer') {
    if (!Number.isInteger(value)) failures.push(`${path}: expected integer`)
    else if (shape.minimum !== undefined && value < shape.minimum) failures.push(`${path}: below minimum ${shape.minimum}`)
    else if (shape.maximum !== undefined && value > shape.maximum) failures.push(`${path}: above maximum ${shape.maximum}`)
  } else if (shape.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) failures.push(`${path}: expected finite number`)
    else if (shape.minimum !== undefined && value < shape.minimum) failures.push(`${path}: below minimum ${shape.minimum}`)
    else if (shape.maximum !== undefined && value > shape.maximum) failures.push(`${path}: above maximum ${shape.maximum}`)
  }
  if (shape.format === 'uri' && typeof value === 'string' && !/^https?:\/\//.test(value)) failures.push(`${path}: expected http(s) URL`)
  if (shape.format === 'date' && typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) failures.push(`${path}: expected YYYY-MM-DD date`)
}

validate(example, schema)

const artifactPaths = [
  example.architecture?.diagram,
  example.visual?.fixture,
  ...(example.implementations ?? []).flatMap(item => [item.path, item.testsPath])
].filter(Boolean)
for (const artifactPath of artifactPaths) {
  try { readFileSync(new URL(artifactPath, root)) }
  catch { failures.push(`artifact path does not exist: ${artifactPath}`) }
}
const rubricWeight = (example.assessment?.rubric ?? []).reduce((sum, item) => sum + item.weight, 0)
if (rubricWeight !== 100) failures.push(`assessment.rubric weights must total 100 (found ${rubricWeight})`)
if (failures.length) {
  console.error('FAIL valid topic example')
  failures.forEach(message => console.error(`  - ${message}`))
  process.exit(1)
}
console.log('PASS complete topic example satisfies the topic contract')

const incomplete = structuredClone(example)
delete incomplete.failures
delete incomplete.assessment
const before = failures.length
validate(incomplete, schema)
const rejected = failures.length > before && failures.some(message => message.includes('failures: required field missing')) && failures.some(message => message.includes('assessment: required field missing'))
if (!rejected) {
  console.error('FAIL incomplete topic was not rejected')
  process.exit(1)
}
console.log('PASS deliberately incomplete topic is rejected')
console.log('Topic contract checks passed.')
