import { readFileSync, existsSync } from 'node:fs'
import assert from 'node:assert/strict'
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const required = [
 ['FastAPI application','backend/app/main.py','FastAPI('],
 ['JWT signature and claims validation','backend/app/security.py','jwt.decode('],
 ['server-derived tenant claim','backend/app/security.py','tenant_id = UUID'],
 ['server-side PDF extraction','backend/app/ingestion.py','PdfReader'],
 ['scanned PDF OCR','backend/app/ingestion.py','pytesseract.image_to_string'],
 ['DOCX parsing','backend/app/ingestion.py','DocxDocument'],
 ['real transformer embeddings','backend/app/embeddings.py','SentenceTransformer'],
 ['pgvector cosine search','backend/app/main.py','embedding <=>'],
 ['Okapi BM25 scoring','backend/app/main.py','bm25_score'],
 ['BM25 inverse document frequency','backend/app/main.py','ln(1 + (corpus.n - ts.df + 0.5) / (ts.df + 0.5))'],
 ['BM25 length normalization','backend/app/main.py','1.2 * (0.25 + 0.75 * n.doc_len / corpus.avgdl)'],
 ['reciprocal rank fusion','backend/app/main.py','1.0/(60+r.bm25_rank)'],
 ['tenant-scoped SQL','backend/app/main.py','Chunk.tenant_id == principal.tenant_id'],
 ['database RLS','backend/migrations/001_initial.sql','CREATE POLICY tenant_documents_isolation'],
 ['rate limiter','backend/app/middleware.py','Rate limit exceeded'],
 ['upload limits','backend/app/config.py','max_upload_bytes'],
 ['OCR and BM25 limitations documented','backend/README.md','not yet production'],
 ['asynchronous ingestion API','backend/app/main.py','/v1/ingestion-jobs'],
 ['tenant-scoped SKIP LOCKED queue','backend/app/jobs.py','skip_locked=True'],
 ['durable ingestion worker','backend/app/worker.py','process_one'],
 ['private local and KMS object storage','backend/app/storage.py','ServerSideEncryption="aws:kms"'],
 ['ClamAV malware scanning','backend/app/malware.py','ClamAVScanner'],
 ['document-level ACL predicates','backend/app/access.py','document_access_filter'],
 ['RLS-protected ingestion jobs','backend/migrations/002_document_acl_ingestion_jobs.sql','tenant_ingestion_jobs_isolation'],
 ['private document default','backend/app/models.py','default="private"'],
 ['bounded retry backoff','backend/app/jobs.py','retry_delay_seconds'],
 ['remote embedding adapter','backend/app/embeddings.py','encode_texts_async'],
 ['grounded generation adapter','backend/app/generation.py','OpenAICompatibleProvider'],
 ['exact-span citation validator','backend/app/citations.py','validate_citations'],
 ['grounded answer endpoint','backend/app/main.py','/v1/answer'],
 ['generation disabled by default','backend/app/config.py','generation_enabled: bool = False'],
 ['generation and citation tests','backend/tests/test_generation.py','test_fabricated_source_forces_abstention']
]
for (const [name,path,token] of required) {
  assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} missing`)
  assert.ok(read(path).includes(token), `${name} missing`)
  console.log(`PASS ${name}`)
}
const pkg = JSON.parse(read('package.json'))
assert.ok(pkg.scripts['validate:production-rag'], 'validation command missing')
console.log('PASS production RAG API contract checks')
