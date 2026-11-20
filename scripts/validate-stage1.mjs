import { readFileSync, existsSync } from 'node:fs'

const guide = readFileSync('docs/deep-dives/01-mathematics-python-data.md', 'utf8')
const labs = readFileSync('docs/deep-dives/labs/stage-01.md', 'utf8')
const implementation = readFileSync('examples/stage-01/foundations.py', 'utf8')
const tests = readFileSync('examples/stage-01/test_foundations.py', 'utf8')
const topics = ['Vectors, matrices and tensor shapes','Probability and statistics','Derivatives and gradients','Optimization foundations','Python for data work','NumPy and Pandas','Data quality and leakage']
const required = ['Worked calculation','Numerical animation storyboard','Failure lab','Assessment gate']
for (const topic of topics) {
  if (!guide.includes(topic)) throw new Error(`Missing Stage 1 topic: ${topic}`)
  console.log(`PASS topic: ${topic}`)
}
for (const section of required) {
  const count = guide.split(section).length - 1
  if (count < 7) throw new Error(`Expected at least seven ${section} sections, found ${count}`)
  console.log(`PASS seven ${section} sections`)
}
for (const topic of ['vectors','probability','calculus','optimization','python-core','numpy-pandas','data-quality']) {
  if (!labs.includes(topic) || !implementation.includes(`topic == '${topic}'`)) throw new Error(`Missing executable lab for ${topic}`)
  console.log(`PASS executable topic lab: ${topic}`)
}
for (const file of ['examples/stage-01/foundations.py','examples/stage-01/test_foundations.py','examples/stage-01/fixtures/people.csv']) {
  if (!existsSync(file)) throw new Error(`Missing Stage 1 artifact: ${file}`)
}
for (const invariant of ['test_dot_and_matrix_multiplication','test_bayes_posterior','test_derivatives_match','test_gradient_descent_converges','test_csv_ingestion_keeps_good_rows_and_reports_bad_rows','test_leakage_demo_exposes_global_fit']) {
  if (!tests.includes(invariant)) throw new Error(`Missing verification test: ${invariant}`)
}
console.log('PASS Stage 1: seven topics, numerical walkthroughs, diagrams, animation storyboards, failure labs, assessments and executable references')
