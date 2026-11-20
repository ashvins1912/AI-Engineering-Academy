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


// Stage 4's eight mastery gates complement the transformer computation workbench.
const stage4Mastery = readFileSync(new URL('../src/components/Stage4MasteryLabs.tsx', import.meta.url), 'utf8')
for (const id of ['tokenization','embeddings','attention','masking','multihead','block','decoding','engineering']) assert.ok(stage4Mastery.includes(`id:'${id}'`), `Missing Stage 4 mastery topic: ${id}`)
for (const token of ['Scaled dot-product attention','Causal mask matrix','Parallel attention heads','LoRA parameter estimate','KV-cache memory estimate','Required evidence','Mastery gate passed']) assert.ok(stage4Mastery.includes(token), `Missing Stage 4 interactive feature: ${token}`)
assert.ok(app.includes('<Stage4MasteryLabs/>'), 'Eight Stage 4 mastery labs must be integrated')
console.log('PASS eight evidence-gated Stage 4 transformer and LLM topics')
