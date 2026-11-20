from uuid import UUID
from pydantic import BaseModel, Field

class DocumentOut(BaseModel):
    id: UUID
    title: str
    media_type: str
    status: str
    visibility: str = 'private'
    page_count: int
    chunks: int

class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)

class SearchHit(BaseModel):
    document_id: UUID
    title: str
    chunk_id: UUID
    content: str
    page_number: int | None
    dense_score: float
    bm25_score: float
    hybrid_score: float


class IngestionJobOut(BaseModel):
    id: UUID
    filename: str
    status: str
    attempts: int
    document_id: UUID | None = None
    error_code: str | None = None
    created_at: str | None = None
    completed_at: str | None = None
