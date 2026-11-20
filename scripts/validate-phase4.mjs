import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const component = readFileSync(new URL('../src/components/MLLabs.tsx', import.meta.url), 'utf8')
const advanced = readFileSync(new URL('../src/components/AdvancedDeepLearningLabs.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const curriculum = readFileSync(new URL('../src/data/curriculum.ts', import.meta.url), 'utf8')
const required = [
  ['linear regression', 'Mean squared error'],
  ['logistic regression', 'Binary cross-entropy'],
  ['decision tree impurity', 'Information gain'],
  ['KNN classifier', 'K nearest neighbors'],
  ['linear SVM training', 'hinge-loss subgradient updates'],
  ['K-means clustering', 'Run assignment + update'],
  ['neural network forward pass', 'Pre-activation z'],
  ['backpropagation', 'Backpropagate one update'],
  ['multilayer 2-2-1 network trace', 'Two-layer network: 2 → 2 → 1'],
  ['hidden-layer chain rule', 'hiddenDelta1'],
  ['optimizer comparison', 'Run 30 training steps']
]
for (const [label, token] of required) {
  assert.ok(component.includes(token), `Missing ${label}`)
  console.log(`PASS ${label}`)
}
for (const [label, token] of [
  ['CNN convolution and feature maps', 'Convolution, activation and pooling'],
  ['CNN kernel selector', 'Vertical edge'],
  ['stepwise convolution animation', 'Next convolution step'],
  ['max pooling', '2×2 max-pooling'],
  ['vanilla RNN recurrence', 'Vanilla RNN'],
  ['LSTM gated state', 'Forget gate f'],
  ['dropout and L2 regularization', 'Dropout probability'],
  ['batch normalization', 'Batch normalization'],
  ['softmax multiclass', 'Softmax, cross-entropy and confusion matrix'],
  ['per-class precision recall F1', 'Class ${i} · P / R / F1'],
  ['generalization experiment', 'Underfitting versus overfitting'],
  ['early stopping checkpoint', 'Early-stop checkpoint']
]) {
  assert.ok(advanced.includes(token), `Missing ${label}`)
  console.log(`PASS ${label}`)
}
assert.ok(component.includes('<AdvancedDeepLearningLabs/>'), 'Advanced labs must be integrated into the workbench')
assert.ok(app.includes('<MLLabs/>'), 'ML workbench must be reachable from Stage 2')
assert.ok(app.includes("active.id==='stage-2'"), 'ML workbench must be attached to Stage 2')
assert.ok(app.includes("active.id==='stage-3'"), 'Neural network lab must be reachable from Stage 3')
for (const topic of ['logistic-regression','trees','svm-knn','clustering','perceptron','forward','backprop','optimizers','cnn','sequence','metrics','training']) assert.ok(curriculum.includes(`'${topic}'`) || curriculum.includes(`  ${topic}:`), `Missing detailed lesson override: ${topic}`)
console.log('PASS Stage 2/3 integration and 12 detailed lesson overrides')

// Neural network gradient sanity check.
const sigmoid = z => 1/(1+Math.exp(-z))
let w=.4,b=.1
const x=.8,target=1
const before=.5*(sigmoid(x*w+b)-target)**2
for(let i=0;i<100;i++){const y=sigmoid(x*w+b),g=(y-target)*y*(1-y)*x,gb=(y-target)*y*(1-y);w-=.5*g;b-=.5*gb}
const after=.5*(sigmoid(x*w+b)-target)**2
assert.ok(after<before, `Neuron gradient updates should lower loss (${before} -> ${after})`)
console.log('PASS neural network gradient updates reduce loss')

// Decision tree impurity reduction.
const H=p=>p===0||p===1?0:-p*Math.log2(p)-(1-p)*Math.log2(1-p)
assert.ok(H(3/6)-(3/6)*H(0)-(3/6)*H(1)>0)
console.log('PASS decision-tree information gain sanity check')

// Linear SVM should separate the deterministic toy dataset.
let wx=0,wy=0,bias=0
const svmRows=[{x:1,y:1.2,label:-1},{x:1.5,y:1.8,label:-1},{x:2,y:1.1,label:-1},{x:2.2,y:2.3,label:-1},{x:2.8,y:1.7,label:-1},{x:3.2,y:3.5,label:1},{x:3.8,y:3.1,label:1},{x:4.2,y:4.1,label:1},{x:4.8,y:3.6,label:1},{x:5.2,y:4.8,label:1},{x:1.2,y:2.5,label:-1},{x:4.5,y:2.8,label:1}]
for(let epoch=0;epoch<700;epoch++){let gx=wx,gy=wy,gb=0;for(const p of svmRows){if(p.label*(wx*p.x+wy*p.y+bias)<1){gx-=p.label*p.x;gy-=p.label*p.y;gb-=p.label}}wx-=.01*gx;wy-=.01*gy;bias-=.01*gb}
assert.ok(svmRows.every(p=>p.label*(wx*p.x+wy*p.y+bias)>0))
console.log('PASS linear SVM learns a separating hyperplane')

// Convolution dimensions/value, softmax normalization, and multiclass metrics.
const input=[[1,0,1,0,1],[0,1,1,1,0],[1,1,1,0,0],[0,1,0,1,1],[1,0,0,1,0]]
const kernel=[[1,0,-1],[1,0,-1],[1,0,-1]]
const conv=Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>kernel.reduce((sum,row,ri)=>sum+row.reduce((s,v,ci)=>s+v*input[r+ri][c+ci],0),0)))
assert.equal(conv.length,3);assert.equal(conv[0].length,3);assert.equal(conv[0][0],-1)
const logits=[1.2,.3,-.4],exps=logits.map(x=>Math.exp(x-Math.max(...logits))),probs=exps.map(x=>x/exps.reduce((a,b)=>a+b,0))
assert.ok(Math.abs(probs.reduce((a,b)=>a+b,0)-1)<1e-12)
const tp=8,fp=2,fn=4,precision=tp/(tp+fp),recall=tp/(tp+fn),f1=2*precision*recall/(precision+recall)
assert.ok(Math.abs(precision-.8)<1e-12 && Math.abs(recall-2/3)<1e-12 && f1>.72 && f1<.73)
console.log('PASS CNN convolution dimensions/value, softmax normalization and precision/recall/F1')


// Stage 2 classical ML mastery and model-comparison project contracts.
const stage2Mastery = readFileSync(new URL('../src/components/Stage2MasteryLabs.tsx', import.meta.url), 'utf8')
const stage2Guide = readFileSync(new URL('../docs/deep-dives/02-classical-machine-learning.md', import.meta.url), 'utf8')
const stage2Pack = readFileSync(new URL('../docs/deep-dives/labs/stage-02.md', import.meta.url), 'utf8')
const stage2Python = readFileSync(new URL('../examples/stage-02/classical_ml.py', import.meta.url), 'utf8')
const stage2Tests = readFileSync(new URL('../examples/stage-02/test_classical_ml.py', import.meta.url), 'utf8')
const modelProject = readFileSync(new URL('../examples/stage-02/model_comparison.py', import.meta.url), 'utf8')
const modelTests = readFileSync(new URL('../examples/stage-02/test_model_comparison.py', import.meta.url), 'utf8')
for (const id of ['linear-regression','logistic-regression','trees','svm-knn','clustering','pca','metrics']) {
  assert.ok(stage2Mastery.includes(`id:'${id}'`), `Missing Stage 2 interactive topic: ${id}`)
  assert.ok(stage2Pack.includes(`## ${id} —`), `Missing Stage 2 lab pack topic: ${id}`)
}
for (const section of ['Worked calculation','Numerical animation storyboard','Failure lab','Assessment gate']) {
  assert.ok(stage2Guide.includes(section), `Missing Stage 2 guide section: ${section}`)
}
for (const fn of ['linear_regression','sigmoid','binary_cross_entropy','information_gain','majority_vote','knn_predict','kmeans_step','pca_2d','confusion_metrics','roc_auc']) {
  assert.ok(stage2Python.includes(`def ${fn}(`), `Missing Stage 2 reference algorithm: ${fn}`)
}
assert.ok((stage2Tests.match(/    def test_/g)||[]).length>=15, 'Stage 2 algorithm suite needs at least 15 tests')
assert.ok((modelTests.match(/    def test_/g)||[]).length>=5, 'Stage 2 project suite needs at least five tests')
for (const token of ['stratified_folds','fit_scaler','fit_logistic','fit_bagged_stumps','validation_used_for_fit']) assert.ok(modelProject.includes(token), `Missing model comparison invariant: ${token}`)

const modelCard = readFileSync(new URL('../examples/stage-02/MODEL_CARD.md', import.meta.url), 'utf8')
for (const token of ['Intended use','Prohibited use','Limitations','rollback']) assert.ok(modelCard.includes(token), `Missing model-card section: ${token}`)
for (const token of ['Information gain','Bagging vote experiment','Nearest neighbors','Variance decomposition','Required evidence','Mastery gate passed']) assert.ok(stage2Mastery.includes(token), `Missing Stage 2 workbench feature: ${token}`)
assert.ok(app.includes('<Stage2MasteryLabs/>'), 'Stage 2 mastery labs must be integrated into the learning path')
console.log('PASS seven Stage 2 mastery topics, ten reference algorithms and cross-validated model-comparison project')


// Stage 3's seven deep-learning mastery gates must be reachable and evidence-based.
const stage3Mastery = readFileSync(new URL('../src/components/Stage3MasteryLabs.tsx', import.meta.url), 'utf8')
for (const id of ['perceptron','forward','backprop','optimizers','cnn','sequence','training']) assert.ok(stage3Mastery.includes(`id:'${id}'`), `Missing Stage 3 mastery topic: ${id}`)
for (const token of ['Gradient check','LSTM gate state','Train vs validation curves','Required evidence','Mastery gate passed']) assert.ok(stage3Mastery.includes(token), `Missing Stage 3 mastery feature: ${token}`)
assert.ok(app.includes('<Stage3MasteryLabs/>'), 'Stage 3 mastery labs must be integrated into the learning path')
console.log('PASS seven evidence-gated Stage 3 deep-learning topics')


// Stage 3 deep-learning mastery, numerical references and checkpointed project.
const stage3Mastery = readFileSync(new URL('../src/components/Stage3MasteryLabs.tsx', import.meta.url), 'utf8')
const stage3Guide = readFileSync(new URL('../docs/deep-dives/03-deep-learning.md', import.meta.url), 'utf8')
const stage3Pack = readFileSync(new URL('../docs/deep-dives/labs/stage-03.md', import.meta.url), 'utf8')
const stage3Python = readFileSync(new URL('../examples/stage-03/deep_learning.py', import.meta.url), 'utf8')
const stage3Tests = readFileSync(new URL('../examples/stage-03/test_deep_learning.py', import.meta.url), 'utf8')
const trainingProject = readFileSync(new URL('../examples/stage-03/training_project.py', import.meta.url), 'utf8')
const trainingTests = readFileSync(new URL('../examples/stage-03/test_training_project.py', import.meta.url), 'utf8')
const stage3ModelCard = readFileSync(new URL('../examples/stage-03/MODEL_CARD.md', import.meta.url), 'utf8')
for (const id of ['perceptron','forward','backprop','optimizers','cnn','sequence','training']) {
  assert.ok(stage3Mastery.includes(`id:'${id}'`), `Missing Stage 3 interactive topic: ${id}`)
  assert.ok(stage3Pack.includes(`## ${id} —`), `Missing Stage 3 lab pack topic: ${id}`)
}
for (const section of ['Worked example','Animation storyboard','Failure lab','Mastery gate']) assert.ok(stage3Guide.includes(section), `Missing Stage 3 guide section: ${section}`)
for (const fn of ['neuron_forward','neuron_loss_gradient','finite_difference','forward_2_2_1','conv2d_valid','max_pool2d','rnn_sequence','lstm_step','dropout','batch_norm','optimizer_step','early_stopping']) assert.ok(stage3Python.includes(`def ${fn}(`), `Missing Stage 3 reference operation: ${fn}`)
assert.ok((stage3Tests.match(/    def test_/g)||[]).length>=15, 'Stage 3 reference suite needs at least 15 tests')
assert.ok((trainingTests.match(/    def test_/g)||[]).length>=7, 'Stage 3 project suite needs at least seven tests')
for (const token of ['train_epoch','best_validation_loss','patience_count','save_checkpoint','load_checkpoint']) assert.ok(trainingProject.includes(token), `Missing checkpointed training behavior: ${token}`)
for (const token of ['Intended use','Prohibited use','Limitations']) assert.ok(stage3ModelCard.includes(token), `Missing Stage 3 model card section: ${token}`)
assert.ok(app.includes('<Stage3MasteryLabs/>'), 'Stage 3 mastery labs must be integrated into the learning path')
console.log('PASS seven Stage 3 mastery topics, deep-learning reference operations and checkpointed classifier project')
