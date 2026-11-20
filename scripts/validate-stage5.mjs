import { readFileSync, existsSync } from 'node:fs'

const guide = readFileSync('docs/deep-dives/05-rag-visual-rag-knowledge-systems.md', 'utf8')
const labs = readFileSync('docs/deep-dives/labs/stage-05.md', 'utf8')
const algorithms = readFileSync('examples/stage-05/rag_algorithms.py', 'utf8')
const algorithmTests = readFileSync('examples/stage-05/test_rag_algorithms.py', 'utf8')
const evaluator = readFileSync('examples/stage-05/evaluate_golden_set.py', 'utf8')
const evaluationTests = readFileSync('examples/stage-05/test_evaluate_golden_set.py', 'utf8')
const mastery = readFileSync('src/components/Stage5MasteryLabs.tsx', 'utf8')
const workbench = readFileSync('src/components/RAGLabs.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const golden = JSON.parse(readFileSync('examples/stage-05/fixtures/golden_queries.json', 'utf8'))
const corpus = JSON.parse(readFileSync('examples/stage-05/fixtures/rag_corpus.json', 'utf8'))

const lessonIds = ['ingestion','chunking','rag-embeddings','vector-db','retrieval','generation','reranking','agentic-rag','graphrag','visual-rag','multimodal-rag','rag-eval']
for (const id of lessonIds) {
  if (!labs.includes(`## ${id} —`)) throw new Error(`Missing Stage 5 lesson lab: ${id}`)
  if (!mastery.includes(`id:'${id}'`)) throw new Error(`Missing Stage 5 interactive mastery gate: ${id}`)
}
for (const section of ['**Worked calculation:**','**Numerical animation storyboard:**','**Implementation:**','**Failure lab:**','**Assessment gate:**']) {
  if (guide.split(section).length - 1 < 12) throw new Error(`Expected 12 Stage 5 guide sections: ${section}`)
}
for (const section of ['**Implementation task:**','**Worked fixture:**','**Expected result:**','**Verification tests:**','**Debugging checklist:**','**Interview checks:**','**Submission evidence:**']) {
  if (labs.split(section).length - 1 < 12) throw new Error(`Every Stage 5 lab must contain ${section}`)
}
const requiredFunctions = [
  'chunk_text','cosine_similarity','dense_search','bm25_scores','reciprocal_rank_fusion',
  'hybrid_search','rerank_by_scores','validate_citations','recall_at_k','precision_at_k',
  'mean_reciprocal_rank','ndcg_at_k','bounded_adaptive_retrieval','bounded_graph_traversal',
  'validate_visual_regions','align_media_timeline'
]
for (const name of requiredFunctions) if (!algorithms.includes(`def ${name}(`)) throw new Error(`Missing RAG reference function: ${name}`)
const testCount = (algorithmTests.match(/def test_/g)||[]).length + (evaluationTests.match(/def test_/g)||[]).length
if (testCount < 25) throw new Error(`Expected at least 25 Stage 5 tests; found ${testCount}`)
if (golden.queries.length < 30) throw new Error(`Golden evaluation set must contain 30+ queries; found ${golden.queries.length}`)
if (!golden.queries.some(row=>!row.answerable) || !golden.queries.some(row=>row.answerable)) throw new Error('Golden set must include answerable and no-answer cases')
if (new Set(corpus.map(row=>row.id)).size !== corpus.length) throw new Error('RAG corpus IDs must be unique')
for (const file of [
  'examples/stage-05/rag_algorithms.py','examples/stage-05/test_rag_algorithms.py',
  'examples/stage-05/evaluate_golden_set.py','examples/stage-05/test_evaluate_golden_set.py',
  'examples/stage-05/fixtures/rag_corpus.json','examples/stage-05/fixtures/golden_queries.json',
  'docs/production-playbooks/01-production-rag-qdrant-langsmith.md'
]) if (!existsSync(file)) throw new Error(`Missing Stage 5 artifact: ${file}`)
for (const marker of ['Document ingestion and indexing pipeline','Chunking strategy explorer','Dense, sparse and hybrid retrieval','Candidate reranking and context assembly','GraphRAG and knowledge graph traversal','Visual RAG: page, layout, table and image evidence','RAG evaluation and retrieval benchmark']) {
  if (!workbench.includes(marker)) throw new Error(`Missing RAG engineering workbench: ${marker}`)
}
for (const marker of ['stage-5','<Stage5MasteryLabs/>','<RAGLabs/>']) if (!app.includes(marker)) throw new Error(`Stage 5 UI integration missing: ${marker}`)
console.log(`PASS Stage 5: 12 detailed lesson labs, 12 interactive mastery gates, 16 RAG algorithms, ${testCount} tests and ${golden.queries.length}-query golden set`)
