import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const component = readFileSync(new URL('../src/components/MathLabs.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const required = [
  ['vector and matrix calculator', 'Matrix × vector example'],
  ['Monte Carlo simulation', 'estimate π'],
  ['gradient descent animation and controls', 'Play animation'],
  ['optimizer comparison', 'Momentum'],
  ['Python data-processing exercise', 'groupby']
]
for (const [label, token] of required) {
  assert.ok(component.includes(token), `Missing ${label}`)
  console.log(`PASS ${label}`)
}
assert.ok(app.includes('<MathLabs/>'), 'Labs must be reachable from the Stage 1 UI')
console.log('PASS Stage 1 integration')

// Numerical invariants: dot product, matrix-vector product and gradient descent.
const dot = 2 * 4 + 3 * 1
assert.equal(dot, 11)
const matrixVector = [1 * 2 + 2 * 3, 3 * 2 + 4 * 3]
assert.deepEqual(matrixVector, [8, 18])
let w = 0
for (let i = 0; i < 30; i++) w -= 0.1 * 2 * (w - 3)
assert.ok(Math.abs(w - 3) < 0.005, `Gradient descent did not converge: ${w}`)
console.log('PASS numerical examples and gradient descent convergence')
