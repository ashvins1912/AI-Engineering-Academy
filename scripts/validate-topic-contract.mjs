import { existsSync, readdirSync, readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const schema = JSON.parse(readFileSync(new URL('content/topic.schema.json', root), 'utf8'))
const example = JSON.parse(readFileSync(new URL('content/examples/attention-topic.json', root), 'utf8'))

function validate(value, shape, path, errors) {
  if (shape.const !== undefined && value !== shape.const) errors.push(`${path}: expected constant ${shape.const}`)
  if (shape.enum && !shape.enum.includes(value)) errors.push(`${path}: expected one of ${shape.enum.join(', ')}`)
  if (shape.pattern && typeof value === 'string' && !new RegExp(shape.pattern).test(value)) errors.push(`${path}: does not match required pattern ${shape.pattern}`)

  if (shape.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { errors.push(`${path}: expected object`); return }
    for (const key of shape.required ?? []) if (!(key in value)) errors.push(`${path}.${key}: required field missing`)
    if (shape.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!(key in (shape.properties ?? {}))) errors.push(`${path}.${key}: unknown field`)
    }
    for (const [key, child] of Object.entries(shape.properties ?? {})) {
      if (key in value) validate(value[key], child, `${path}.${key}`, errors)
    }
  } else if (shape.type === 'array') {
    if (!Array.isArray(value)) { errors.push(`${path}: expected array`); return }
    if (shape.minItems !== undefined && value.length < shape.minItems) errors.push(`${path}: expected at least ${shape.minItems} items`)
    if (shape.maxItems !== undefined && value.length > shape.maxItems) errors.push(`${path}: expected at most ${shape.maxItems} items`)
    value.forEach((item, index) => validate(item, shape.items, `${path}[${index}]`, errors))
  } else if (shape.type === 'string') {
    if (typeof value !== 'string') errors.push(`${path}: expected string`)
    else if (shape.minLength !== undefined && value.trim().length < shape.minLength) errors.push(`${path}: expected at least ${shape.minLength} characters`)
  } else if (shape.type === 'integer') {
    if (!Number.isInteger(value)) errors.push(`${path}: expected integer`)
    else if (shape.minimum !== undefined && value < shape.minimum) errors.push(`${path}: below minimum ${shape.minimum}`)
    else if (shape.maximum !== undefined && value > shape.maximum) errors.push(`${path}: above maximum ${shape.maximum}`)
  } else if (shape.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${path}: expected finite number`)
    else if (shape.minimum !== undefined && value < shape.minimum) errors.push(`${path}: below minimum ${shape.minimum}`)
    else if (shape.maximum !== undefined && value > shape.maximum) errors.push(`${path}: above maximum ${shape.maximum}`)
  }

  if (shape.format === 'uri' && typeof value === 'string' && !/^https?:\/\//.test(value)) errors.push(`${path}: expected http(s) URL`)
  if (shape.format === 'date' && typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    const date = match && new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    if (!date || date.toISOString().slice(0, 10) !== value) errors.push(`${path}: expected a real YYYY-MM-DD date`)
  }
}

function validateTopic(topic, label) {
  const errors = []
  validate(topic, schema, label, errors)
  const artifactPaths = [
    topic.architecture?.diagram,
    topic.visual?.fixture,
    ...(topic.implementations ?? []).flatMap(item => [item.path, item.testsPath])
  ].filter(Boolean)

  for (const artifactPath of artifactPaths) {
    if (artifactPath.startsWith('/') || artifactPath.split(/[\\/]/).includes('..')) {
      errors.push(`${label}: unsafe artifact path ${artifactPath}`)
      continue
    }
    try { readFileSync(new URL(artifactPath, root)) }
    catch { errors.push(`${label}: artifact path does not exist: ${artifactPath}`) }
  }

  const rubricWeight = (topic.assessment?.rubric ?? []).reduce((sum, item) => sum + item.weight, 0)
  if (rubricWeight !== 100) errors.push(`${label}: assessment rubric weights must total 100 (found ${rubricWeight})`)

  const roles = new Set((topic.implementations ?? []).map(item => item.role))
  if (!roles.has('from-scratch') || !roles.has('production')) {
    errors.push(`${label}: include both from-scratch and production implementations`)
  }
  const animation = topic.visual?.animation
  if (animation) {
    const steps = animation.stages ?? []
    if (steps.length < 3) errors.push(`${label}: animation must contain at least three synchronized stages`)
    for (const [index, control] of (animation.controls ?? []).entries()) {
      if (!(control.min <= control.defaultValue && control.defaultValue <= control.max)) {
        errors.push(`${label}: animation control ${index + 1} default must be within its bounds`)
      }
    }
    const playback = animation.playback ?? {}
    for (const capability of ['play', 'pause', 'reset', 'stepForward', 'stepBackward', 'adjustableSpeed']) {
      if (playback[capability] !== true) errors.push(`${label}: animation playback must support ${capability}`)
    }
  }
  return errors
}

const sampleErrors = validateTopic(example, 'reference example')
if (sampleErrors.length) {
  console.error('FAIL complete reference topic')
  sampleErrors.forEach(message => console.error(`  - ${message}`))
  process.exit(1)
}
console.log('PASS complete reference topic satisfies the topic contract')

const incomplete = structuredClone(example)
delete incomplete.failures
delete incomplete.assessment
const negativeErrors = validateTopic(incomplete, 'deliberately incomplete fixture')
if (!negativeErrors.some(message => message.includes('failures: required field missing')) ||
    !negativeErrors.some(message => message.includes('assessment: required field missing'))) {
  console.error('FAIL deliberately incomplete topic was not rejected')
  process.exit(1)
}
console.log('PASS deliberately incomplete topic is rejected')

const topicRoot = new URL('content/topics/', root)
let migratedCount = 0
if (existsSync(topicRoot)) {
  for (const entry of readdirSync(topicRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const recordUrl = new URL(`${entry.name}/lesson.json`, topicRoot)
    if (!existsSync(recordUrl)) continue
    let topic
    try { topic = JSON.parse(readFileSync(recordUrl, 'utf8')) }
    catch (error) {
      console.error(`FAIL ${entry.name}: invalid JSON (${error.message})`)
      process.exitCode = 1
      continue
    }
    const errors = validateTopic(topic, entry.name)
    if (topic.topic?.id !== entry.name) errors.push(`${entry.name}: topic.id must match its directory name`)
    if (errors.length) {
      console.error(`FAIL migrated topic ${entry.name}`)
      errors.forEach(message => console.error(`  - ${message}`))
      process.exitCode = 1
    } else {
      migratedCount += 1
      console.log(`PASS migrated topic ${entry.name}`)
    }
  }
}
if (process.exitCode) process.exit(1)
console.log(`Topic contract checks passed. ${migratedCount} canonical topic records validated.`)
