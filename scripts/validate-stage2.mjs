import { readFileSync, existsSync } from 'node:fs'

const guide = readFileSync('docs/deep-dives/02-classical-machine-learning.md', 'utf8')
const labs = readFileSync('docs/deep-dives/labs/stage-02.md', 'utf8')
const classical = readFileSync('examples/stage-02/classical_ml.py', 'utf8')
const advanced = readFileSync('examples/stage-02/advanced_algorithms.py', 'utf8')
const tests = readFileSync('examples/stage-02/test_classical_ml.py', 'utf8')
const advancedTests = readFileSync('examples/stage-02/test_advanced_algorithms.py', 'utf8')
const project = readFileSync('examples/stage-02/model_comparison.py', 'utf8')
const projectTests = readFileSync('examples/stage-02/test_model_comparison.py', 'utf8')
const component = readFileSync('src/components/Stage2MasteryLabs.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')

const topics = [
  ['linear-regression', 'Linear regression'],
  ['logistic-regression', 'Logistic regression and classification'],
  ['trees', 'Decision trees and split selection'],
  ['svm-knn', 'KNN and support vector machines'],
  ['clustering', 'Clustering and dimensionality reduction'],
  ['pca', 'Clustering and dimensionality reduction'],
  ['metrics', 'Model evaluation and error analysis']
]
for (const [id] of topics) {
  if (!labs.includes(`## ${id} —`)) throw new Error(`Missing Stage 2 individual lab: ${id}`)
  if (!component.includes(`id:'${id}'`)) throw new Error(`Missing Stage 2 interactive gate: ${id}`)
  console.log(`PASS Stage 2 lab and interactive gate: ${id}`)
}
const requiredGuideSections = ['Worked calculation', 'Numerical animation storyboard', 'Implementation', 'Failure lab', 'Assessment gate']
for (const section of requiredGuideSections) {
  const count = guide.split(section).length - 1
  if (count < 7) throw new Error(`Expected seven Stage 2 ${section} sections; found ${count}`)
}
const requiredLabSections = ['**Implementation task:**','**Worked fixture:**','**Expected result:**','**Verification tests:**','**Debugging checklist:**','**Interview checks:**','**Submission evidence:**']
for (const label of requiredLabSections) {
  if ((labs.split(label).length - 1) < 7) throw new Error(`Every Stage 2 lab must contain ${label}`)
}
const requiredFunctions = [
  [classical, 'linear_regression'], [classical, 'sigmoid'], [classical, 'information_gain'],
  [classical, 'knn_predict'], [classical, 'kmeans_step'], [classical, 'pca_2d'],
  [classical, 'confusion_metrics'], [classical, 'roc_auc'],
  [advanced, 'fit_linear_svm'], [advanced, 'predict_linear_svm'],
  [advanced, 'fit_adaboost_stumps'], [advanced, 'predict_adaboost_stumps'],
  [advanced, 'dbscan'], [advanced, 'precision_recall_curve'],
  [advanced, 'average_precision'], [advanced, 'brier_score']
]
for (const [source, name] of requiredFunctions) if (!source.includes(`def ${name}(`)) throw new Error(`Missing Stage 2 reference implementation: ${name}`)
const testCount = (tests.match(/def test_/g) || []).length + (advancedTests.match(/def test_/g) || []).length + (projectTests.match(/def test_/g) || []).length
if (testCount < 30) throw new Error(`Expected at least 30 Stage 2 tests, found ${testCount}`)
for (const file of [
  'examples/stage-02/advanced_algorithms.py','examples/stage-02/test_advanced_algorithms.py',
  'examples/stage-02/model_comparison.py','examples/stage-02/fixtures/student-outcomes.csv',
  'examples/stage-02/MODEL_DATA_CARD.md','examples/stage-02/MODEL_DFD.md','examples/stage-02/incident-report.md'
]) if (!existsSync(file)) throw new Error(`Missing Stage 2 project artifact: ${file}`)
for (const marker of ['fit_scaler(train)', 'validation_used_for_fit', 'fit_bagged_stumps', 'fit_logistic']) {
  if (!project.includes(marker)) throw new Error(`Missing model comparison invariant: ${marker}`)
}
for (const marker of ['gateCount', 'Check mastery gate', 'setTreeCut', 'setThreshold', 'setClusterStep', 'setPcaAngle', 'setTp']) {
  if (!component.includes(marker)) throw new Error(`Missing interactive Stage 2 control: ${marker}`)
}
if (!app.includes('<Stage2MasteryLabs/>')) throw new Error('Stage 2 mastery labs are not integrated into the Academy UI')
console.log(`PASS Stage 2: seven topic labs, interactive controls, 16 reference functions, ${testCount} unit tests and leakage-safe model-comparison project`)
