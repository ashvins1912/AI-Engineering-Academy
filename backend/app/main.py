from contextlib import asynccontextmanager
from threading import Lock
from uuid import UUID
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sentence_transformers import SentenceTransformer
from .config import get_settings
from .db import engine, get_session, set_tenant_context
from .ingestion import IngestionError, chunk_pages, extract_document
from .models import Chunk, Document
from .schemas import DocumentOut, SearchHit, SearchRequest
from .security import Principal, current_principal, require_admin
from .middleware import SimpleRateLimitMiddleware

cfg = get_settings()
_model: SentenceTransformer | None = None
_model_lock = Lock()

def encode_texts(texts: list[str]):
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = SentenceTransformer(cfg.embedding_model, device=cfg.embedding_device)
    return _model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema creation is intentionally not automatic in production; run migrations first.
    yield
    await engine.dispose()

app = FastAPI(title="AI Engineering Academy Ingestion API", version="0.2.0", lifespan=lifespan)
origins = [origin.strip() for origin in cfg.cors_origins.split(",") if origin.strip()]
app.add_middleware(SimpleRateLimitMiddleware)
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["GET", "POST", "DELETE"], allow_headers=["Authorization", "Content-Type", "Idempotency-Key"])

@app.get("/health/live")
async def live():
    return {"status": "ok"}

@app.get("/health/ready")
async def ready(session: AsyncSession = Depends(get_session)):
    try:
        await session.execute(text("SELECT 1"))
        return {"status": "ready", "database": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable") from None

@app.post("/v1/documents", response_model=DocumentOut, status_code=201)
async def ingest_document(
    file: UploadFile = File(...),
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(get_session),
):
    if not file.filename:
        raise HTTPException(400, "Filename required")
    data = await file.read(cfg.max_upload_bytes + 1)
    try:
        extracted = await run_in_threadpool(extract_document, file.filename, file.content_type or "", data)
    except IngestionError as exc:
        raise HTTPException(422, str(exc)) from exc
    chunks = chunk_pages(extracted.pages)
    vectors = await run_in_threadpool(encode_texts, [content for _, content in chunks])
    await set_tenant_context(session, str(principal.tenant_id))
    existing = await session.scalar(select(Document).where(Document.tenant_id == principal.tenant_id, Document.sha256 == extracted.sha256))
    if existing:
        count = await session.scalar(select(func.count(Chunk.id)).where(Chunk.tenant_id == principal.tenant_id, Chunk.document_id == existing.id))
        return DocumentOut(id=existing.id,title=existing.title,media_type=existing.media_type,status=existing.status,page_count=existing.page_count,chunks=count or 0)
    document = Document(tenant_id=principal.tenant_id, owner_id=principal.user_id, title=extracted.title, media_type=extracted.media_type, sha256=extracted.sha256, status="indexing", page_count=len(extracted.pages))
    session.add(document)
    await session.flush()
    for idx, ((page_number, content), vector) in enumerate(zip(chunks, vectors, strict=True)):
        session.add(Chunk(tenant_id=principal.tenant_id, document_id=document.id, chunk_index=idx, page_number=page_number, content=content, embedding=vector.tolist()))
    document.status = "ready"
    await session.commit()
    return DocumentOut(id=document.id,title=document.title,media_type=document.media_type,status=document.status,page_count=document.page_count,chunks=len(chunks))

@app.get("/v1/documents", response_model=list[DocumentOut])
async def list_documents(principal: Principal = Depends(current_principal), session: AsyncSession = Depends(get_session)):
    await set_tenant_context(session, str(principal.tenant_id))
    query = select(Document, func.count(Chunk.id)).outerjoin(Chunk, (Chunk.document_id == Document.id) & (Chunk.tenant_id == principal.tenant_id)).where(Document.tenant_id == principal.tenant_id).group_by(Document.id).order_by(Document.created_at.desc())
    rows = (await session.execute(query)).all()
    return [DocumentOut(id=d.id,title=d.title,media_type=d.media_type,status=d.status,page_count=d.page_count,chunks=count) for d,count in rows]

@app.delete("/v1/documents/{document_id}", status_code=204)
async def delete_document(document_id: UUID, principal: Principal = Depends(current_principal), session: AsyncSession = Depends(get_session)):
    await set_tenant_context(session, str(principal.tenant_id))
    owner_scope = (Document.owner_id == principal.user_id)
    if "tenant_admin" in principal.roles:
        owner_scope = (Document.tenant_id == principal.tenant_id)
    doc = await session.scalar(select(Document).where(Document.id == document_id, Document.tenant_id == principal.tenant_id, owner_scope))
    if not doc:
        raise HTTPException(404, "Document not found")
    await session.delete(doc)
    await session.commit()

@app.post("/v1/search", response_model=list[SearchHit])
async def search_documents(body: SearchRequest, principal: Principal = Depends(current_principal), session: AsyncSession = Depends(get_session)):
    await set_tenant_context(session, str(principal.tenant_id))
    query_vector = (await run_in_threadpool(encode_texts, [body.query]))[0].tolist()
    # Okapi BM25: tenant-local N, average document length, term frequency and document frequency.
    # Query terms are lowercased alphanumeric tokens; k1=1.2 and b=0.75.
    statement = text("""
      WITH
      normalized AS (
        SELECT c.id AS chunk_id, c.document_id, c.content, c.page_number,
          regexp_replace(lower(c.content), '[^[:alnum:]]+', ' ', 'g') AS body,
          cardinality(regexp_split_to_array(trim(regexp_replace(lower(c.content), '[^[:alnum:]]+', ' ', 'g')), ' ')) AS doc_len
        FROM document_chunks c JOIN documents d ON d.id=c.document_id AND d.tenant_id=c.tenant_id
        WHERE c.tenant_id=:tenant_id AND d.status='ready'
      ),
      query_terms AS (
        SELECT DISTINCT q.term FROM regexp_split_to_table(lower(:query), '[^[:alnum:]]+') AS q(term) WHERE length(q.term)>1
      ),
      corpus AS (SELECT count(*)::float AS n, greatest(avg(doc_len),1)::float AS avgdl FROM normalized),
      term_stats AS (
        SELECT qt.term, count(*)::float AS df
        FROM query_terms qt CROSS JOIN normalized n
        WHERE (' ' || n.body || ' ') LIKE ('% ' || qt.term || ' %')
        GROUP BY qt.term
      ),
      bm25 AS (
        SELECT n.chunk_id,
          sum(ln(1 + (corpus.n - ts.df + 0.5) / (ts.df + 0.5)) *
            ((tf.tf * 2.2) / (tf.tf + 1.2 * (0.25 + 0.75 * n.doc_len / corpus.avgdl))))::float AS bm25_score
        FROM normalized n CROSS JOIN term_stats ts CROSS JOIN corpus
        CROSS JOIN LATERAL (SELECT cardinality(array_positions(string_to_array(trim(n.body), ' '), ts.term))::float AS tf) tf
        WHERE tf.tf > 0
        GROUP BY n.chunk_id
      ),
      dense AS (
        SELECT c.id AS chunk_id, 1 - (c.embedding <=> CAST(:embedding AS vector)) AS dense_score
        FROM document_chunks c JOIN documents d ON d.id=c.document_id AND d.tenant_id=c.tenant_id
        WHERE c.tenant_id=:tenant_id AND d.status='ready'
        ORDER BY c.embedding <=> CAST(:embedding AS vector) LIMIT 100
      ),
      lexical AS (SELECT chunk_id, bm25_score FROM bm25 ORDER BY bm25_score DESC LIMIT 100),
      candidates AS (SELECT chunk_id FROM dense UNION SELECT chunk_id FROM lexical),
      ranked AS (
        SELECT x.chunk_id, dense.dense_score, lexical.bm25_score,
          row_number() OVER (ORDER BY dense.dense_score DESC NULLS LAST) AS dense_rank,
          row_number() OVER (ORDER BY lexical.bm25_score DESC NULLS LAST) AS bm25_rank
        FROM candidates x LEFT JOIN dense ON dense.chunk_id=x.chunk_id LEFT JOIN lexical ON lexical.chunk_id=x.chunk_id
      )
      SELECT c.document_id, d.title, c.id AS chunk_id, c.content, c.page_number,
        COALESCE(r.dense_score,0)::float AS dense_score,
        COALESCE(r.bm25_score,0)::float AS bm25_score,
        (CASE WHEN r.dense_score IS NULL THEN 0 ELSE 1.0/(60+r.dense_rank) END +
         CASE WHEN r.bm25_score IS NULL THEN 0 ELSE 1.0/(60+r.bm25_rank) END)::float AS hybrid_score
      FROM ranked r JOIN document_chunks c ON c.id=r.chunk_id AND c.tenant_id=:tenant_id
      JOIN documents d ON d.id=c.document_id AND d.tenant_id=:tenant_id
      ORDER BY hybrid_score DESC LIMIT :top_k
    """)
    rows = (await session.execute(statement, {"embedding": str(query_vector), "tenant_id": str(principal.tenant_id), "query": body.query, "top_k": body.top_k})).mappings().all()
    return [SearchHit(**row) for row in rows]

@app.get("/v1/admin/tenant-health")
async def tenant_health(principal: Principal = Depends(require_admin), session: AsyncSession = Depends(get_session)):
    await set_tenant_context(session, str(principal.tenant_id))
    docs = await session.scalar(select(func.count(Document.id)).where(Document.tenant_id == principal.tenant_id))
    chunks = await session.scalar(select(func.count(Chunk.id)).where(Chunk.tenant_id == principal.tenant_id))
    return {"tenant_id": str(principal.tenant_id), "documents": docs or 0, "chunks": chunks or 0}
