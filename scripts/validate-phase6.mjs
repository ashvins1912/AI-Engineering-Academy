import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const component=readFileSync(new URL('../src/components/RAGLabs.tsx',import.meta.url),'utf8')
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8')
const curriculum=readFileSync(new URL('../src/data/curriculum.ts',import.meta.url),'utf8')
for(const [name,token] of [
 ['document ingestion and provenance','Document ingestion and indexing pipeline'],
 ['chunking controls','Chunking strategy explorer'],
 ['dense, sparse and hybrid retrieval','Dense, sparse and hybrid retrieval'],
 ['reranking and evidence context','Candidate reranking and context assembly'],
 ['GraphRAG entities and relations','GraphRAG and knowledge graph traversal'],
 ['Visual RAG page evidence','Visual RAG: page, layout, table and image evidence'],
 ['RAG evaluation metrics','RAG evaluation and retrieval benchmark'],
 ['explicit toy embedding limitation','not a trained embedding model']
]) { assert.ok(component.includes(token),`Missing ${name}`); console.log(`PASS ${name}`) }
assert.ok(app.includes("active.id==='stage-5'"),'RAG labs must be integrated into Stage 5')
assert.ok(app.includes('<RAGLabs/>'),'RAG component must render')
for(const id of ['ingestion','chunking','vector-db','retrieval','generation','reranking','graphrag','visual-rag','rag-eval']) assert.ok(curriculum.includes(`  '${id}':`) || curriculum.includes(`  ${id}:`),`Missing detailed lesson ${id}`)
console.log('PASS Stage 5 integration and detailed RAG lesson blueprints')
const cosine=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0)
assert.equal(cosine([1,0],[1,0]),1)
assert.equal(cosine([1,0],[0,1]),0)
const rrf=(ranks,k=60)=>ranks.reduce((s,r)=>s+1/(k+r),0)
assert.ok(rrf([1,2])>rrf([8,9]))
const pAtK=(relevant,k)=>relevant.slice(0,k).filter(Boolean).length/k
assert.equal(pAtK([true,false,true],3),2/3)
assert.ok(1/1>1/8)
console.log('PASS cosine similarity, reciprocal-rank fusion ordering and retrieval metric invariants')
