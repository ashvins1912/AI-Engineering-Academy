import { readFileSync, existsSync } from 'node:fs'

const guide = readFileSync('docs/deep-dives/03-deep-learning.md', 'utf8')
const labs = readFileSync('docs/deep-dives/labs/stage-03.md', 'utf8')
const base = readFileSync('examples/stage-03/deep_learning.py', 'utf8')
const advanced = readFileSync('examples/stage-03/advanced_deep_learning.py', 'utf8')
const baseTests = readFileSync('examples/stage-03/test_deep_learning.py', 'utf8')
const advancedTests = readFileSync('examples/stage-03/test_advanced_deep_learning.py', 'utf8')
const project = readFileSync('examples/stage-03/training_project.py', 'utf8')
const projectTests = readFileSync('examples/stage-03/test_training_project.py', 'utf8')
const component = readFileSync('src/components/Stage3MasteryLabs.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')

const topics = ['perceptron','forward','backprop','optimizers','cnn','sequence','training']
for (const id of topics) {
  if (!labs.includes(`## ${id} —`)) throw new Error(`Missing Stage 3 individual lab: ${id}`)
  if (!component.includes(`id:'${id}'`)) throw new Error(`Missing Stage 3 interactive gate: ${id}`)
}
for (const section of ['**Worked example:**','**Animation storyboard:**','**Implementation:**','**Failure lab:**','**Mastery gate:**']) {
  if (guide.split(section).length - 1 < 7) throw new Error(`Expected seven Stage 3 guide sections: ${section}`)
}
for (const section of ['**Implementation task:**','**Worked fixture:**','**Expected result:**','**Verification tests:**','**Debugging checklist:**','**Interview checks:**','**Submission evidence:**']) {
  if (labs.split(section).length - 1 < 7) throw new Error(`Every Stage 3 lab must contain ${section}`)
}
const functions = [
  [base,'neuron_loss_gradient'],[base,'forward_2_2_1'],[base,'conv2d_valid'],[base,'max_pool2d'],
  [base,'rnn_sequence'],[base,'lstm_step'],[base,'optimizer_step'],[base,'dropout'],
  [base,'batch_norm'],[base,'early_stopping'],[advanced,'mlp_forward'],
  [advanced,'mlp_binary_loss_gradients'],[advanced,'rnn_bptt_gradients'],[advanced,'regularization_penalty']
]
for (const [source,name] of functions) if (!source.includes(`def ${name}(`)) throw new Error(`Missing Stage 3 implementation: ${name}`)
const testCount = [baseTests,advancedTests,projectTests].reduce((n,s)=>n+(s.match(/def test_/g)||[]).length,0)
if (testCount < 30) throw new Error(`Expected at least 30 Stage 3 tests; found ${testCount}`)
for (const file of [
  'examples/stage-03/advanced_deep_learning.py','examples/stage-03/test_advanced_deep_learning.py',
  'examples/stage-03/training_project.py','examples/stage-03/test_training_project.py',
  'examples/stage-03/PROJECT_DATA_CARD.md','examples/stage-03/PROJECT_DFD.md',
  'examples/stage-03/MODEL_CARD.md','examples/stage-03/incident-report.md'
]) if (!existsSync(file)) throw new Error(`Missing Stage 3 project artifact: ${file}`)
for (const state of ['optimizer_state','scheduler_state','rng_state','data_position','best_validation_loss','best_epoch']) {
  if (!project.includes(state)) throw new Error(`Checkpoint is missing persisted training state: ${state}`)
}
for (const control of ['gatePassed','Check mastery gate','finiteDiff','setConvStep','setSequenceStep','setLearningRate','setRegularization']) {
  if (!component.includes(control)) throw new Error(`Missing Stage 3 interactive control: ${control}`)
}
if (!app.includes('<Stage3MasteryLabs/>')) throw new Error('Stage 3 mastery labs are not integrated into the Academy UI')
console.log(`PASS Stage 3: seven topic labs, interactive mastery controls, 14 numerical references, ${testCount} tests and checkpoint/resume project`)
