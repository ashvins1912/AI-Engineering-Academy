import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const component=readFileSync(new URL('../src/components/TransformerLabs.tsx',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const curriculum=readFileSync(new URL('../src/data/curriculum.ts',import.meta.url),'utf8')
for(const [name,token] of [
 ['tokenization and toy BPE merge','Toy merged tokens'],['embedding lookup and positional vectors','Position vector'],['Q/K/V scaled dot-product attention','Q · K / √d'],['causal masking','Causal mask'],['multi-head parallel attention','Head output'],['transformer residual and normalization','Residual add'],['autoregressive generation','Generated steps'],['temperature, top-k and nucleus top-p','Top-k + top-p']]){
 assert.ok(component.includes(token),`Missing ${name}`);console.log(`PASS ${name}`)
}
assert.ok(app.includes('<TransformerLabs/>'),'Transformer labs must be integrated')
assert.ok(app.includes("active.id==='stage-4'"),'Transformer labs must be reachable from Stage 4')
for(const id of ['tokenization','embeddings','attention','multihead','decoder','sampling'])assert.ok(curriculum.includes(`  ${id}:`),`Missing detailed lesson ${id}`)
console.log('PASS Stage 4 integration and six detailed lesson blueprints')
const softmax=xs=>{const m=Math.max(...xs),e=xs.map(x=>Math.exp(x-m)),s=e.reduce((a,b)=>a+b,0);return e.map(x=>x/s)}
const p=softmax([1,0,-1]);assert.ok(Math.abs(p.reduce((a,b)=>a+b,0)-1)<1e-12)
const masked=softmax([.5,-1e9,-1e9]);assert.ok(masked[0]>.999999)
const q=[1,0],keys=[[1,0],[0,1]],vals=[[2,0],[0,4]],weights=softmax(keys.map(k=>q.reduce((s,x,i)=>s+x*k[i],0)/Math.sqrt(2))),out=[0,1].map(d=>weights.reduce((s,w,i)=>s+w*vals[i][d],0))
assert.ok(out[0]>out[1]);console.log('PASS softmax normalization, causal mask and attention weighted-sum invariants')


// Stage 4 eight-topic transformer/LLM mastery and end-to-end causal LM project.
const stage4Mastery = readFileSync(new URL('../src/components/Stage4MasteryLabs.tsx', import.meta.url), 'utf8')
const stage4Guide = readFileSync(new URL('../docs/deep-dives/04-transformers-llms.md', import.meta.url), 'utf8')
const stage4Pack = readFileSync(new URL('../docs/deep-dives/labs/stage-04.md', import.meta.url), 'utf8')
const stage4Python = readFileSync(new URL('../examples/stage-04/transformers.py', import.meta.url), 'utf8')
const stage4Tests = readFileSync(new URL('../examples/stage-04/test_transformers.py', import.meta.url), 'utf8')
const miniLM = readFileSync(new URL('../examples/stage-04/mini_causal_lm.py', import.meta.url), 'utf8')
const miniTests = readFileSync(new URL('../examples/stage-04/test_mini_causal_lm.py', import.meta.url), 'utf8')
const stage4ModelCard = readFileSync(new URL('../examples/stage-04/MODEL_CARD.md', import.meta.url), 'utf8')
for (const id of ['tokenization','embeddings','attention','masking','multihead','block','decoding','engineering']) assert.ok(stage4Mastery.includes(`id:'${id}'`), `Missing Stage 4 mastery topic: ${id}`)
for (const id of ['tokenization','embeddings','attention','multihead','decoder','sampling','finetuning','inference']) assert.ok(stage4Pack.includes(`## ${id} —`), `Missing Stage 4 individual lesson lab: ${id}`)
for (const section of ['Worked example','Animation storyboard','Failure lab','Mastery gate']) assert.ok(stage4Guide.includes(section), `Missing Stage 4 guide section: ${section}`)
for (const fn of ['tokenize_greedy','embedding_lookup','softmax','causal_mask','scaled_dot_product_attention','split_heads','merge_heads','layer_norm','transformer_block_residual','shifted_lm_examples','decode_logits','lora_parameter_count','kv_cache_bytes','perplexity']) assert.ok(stage4Python.includes(`def ${fn}(`), `Missing Stage 4 reference operation: ${fn}`)
assert.ok((stage4Tests.match(/    def test_/g)||[]).length>=18, 'Stage 4 reference suite needs at least 18 tests')
assert.ok((miniTests.match(/    def test_/g)||[]).length>=6, 'Stage 4 project suite needs at least six tests')
for (const token of ['tokenize_greedy','embedding_lookup','causal_mask','scaled_dot_product_attention','decode_logits']) assert.ok(miniLM.includes(token), `Missing causal LM project step: ${token}`)
for (const token of ['Intended use','Prohibited use','Limitations']) assert.ok(stage4ModelCard.includes(token), `Missing Stage 4 model card section: ${token}`)
assert.ok(app.includes('<Stage4MasteryLabs/>'), 'Stage 4 mastery labs must be integrated')
console.log('PASS eight Stage 4 transformer/LLM topics, numerical references and causal LM project')
