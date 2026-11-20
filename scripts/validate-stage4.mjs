import { readFileSync, existsSync } from 'node:fs'

const guide = readFileSync('docs/deep-dives/04-transformers-llms-generative-ai.md', 'utf8')
const labs = readFileSync('docs/deep-dives/labs/stage-04.md', 'utf8')
const base = readFileSync('examples/stage-04/transformers.py', 'utf8')
const advanced = readFileSync('examples/stage-04/advanced_transformers.py', 'utf8')
const baseTests = readFileSync('examples/stage-04/test_transformers.py', 'utf8')
const advancedTests = readFileSync('examples/stage-04/test_advanced_transformers.py', 'utf8')
const project = readFileSync('examples/stage-04/mini_causal_lm.py', 'utf8')
const projectTests = readFileSync('examples/stage-04/test_mini_causal_lm.py', 'utf8')
const component = readFileSync('src/components/Stage4MasteryLabs.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')

const lessonIds = ['tokenization','embeddings','attention','multihead','decoder','sampling','finetuning','inference']
const uiIds = ['tokenization','embeddings','attention','masking','multihead','block','decoding','engineering']
for (const id of lessonIds) if (!labs.includes(`## ${id} —`)) throw new Error(`Missing Stage 4 individual lesson lab: ${id}`)
for (const id of uiIds) if (!component.includes(`id:'${id}'`)) throw new Error(`Missing Stage 4 interactive mastery gate: ${id}`)
for (const section of ['**Worked calculation:**','**Numerical animation storyboard:**','**Implementation:**','**Failure lab:**','**Assessment gate:**']) {
  if (guide.split(section).length - 1 < 8) throw new Error(`Expected eight Stage 4 guide sections: ${section}`)
}
for (const section of ['**Implementation task:**','**Worked fixture:**','**Expected result:**','**Verification tests:**','**Debugging checklist:**','**Interview checks:**','**Submission evidence:**']) {
  if (labs.split(section).length - 1 < 8) throw new Error(`Every Stage 4 lesson lab must contain ${section}`)
}
const functions = [
  [base,'tokenize_greedy'],[base,'embedding_lookup'],[base,'scaled_dot_product_attention'],
  [base,'causal_mask'],[base,'decode_logits'],[base,'lora_parameter_count'],
  [base,'kv_cache_bytes'],[base,'perplexity'],
  [advanced,'tokenize_bpe'],[advanced,'apply_rope'],[advanced,'multi_head_attention'],
  [advanced,'transformer_block'],[advanced,'generate_autoregressive'],[advanced,'estimate_inference_memory']
]
for (const [source,name] of functions) if (!source.includes(`def ${name}(`)) throw new Error(`Missing Stage 4 reference implementation: ${name}`)
const testCount = [baseTests,advancedTests,projectTests].reduce((n,s)=>n+(s.match(/def test_/g)||[]).length,0)
if (testCount < 35) throw new Error(`Expected at least 35 Stage 4 tests; found ${testCount}`)
for (const file of [
  'examples/stage-04/advanced_transformers.py','examples/stage-04/test_advanced_transformers.py',
  'examples/stage-04/mini_causal_lm.py','examples/stage-04/test_mini_causal_lm.py',
  'examples/stage-04/MODEL_CARD.md','examples/stage-04/PROJECT_DFD.md','examples/stage-04/incident-report.md'
]) if (!existsSync(file)) throw new Error(`Missing Stage 4 project artifact: ${file}`)
for (const marker of ['apply_rope','multi_head_attention','transformer_block','generate_autoregressive','estimate_inference_memory','tokenize_bpe']) {
  if (!project.includes(marker)) throw new Error(`Integrated project is missing Stage 4 operation: ${marker}`)
}
for (const marker of ['gateCount','Check mastery gate','setTemperature','setTopK','setTopP','setRank','setLayers','setContext']) {
  if (!component.includes(marker)) throw new Error(`Missing Stage 4 interactive control: ${marker}`)
}
if (!app.includes('<Stage4MasteryLabs/>')) throw new Error('Stage 4 mastery labs are not integrated into the Academy UI')
console.log(`PASS Stage 4: eight lesson labs, eight interactive gates, 14 numerical references, ${testCount} tests and integrated causal-transformer project`)
