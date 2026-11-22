"""Offline hybrid retrieval and context-engineering reference implementation.

The engine uses synthetic precomputed vectors. It does not call an embedding
provider, vector database, network service or hosted model.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
import json
import math
import re
from typing import Iterable


TOKEN = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return TOKEN.findall(text.lower())


@dataclass(frozen=True)
class Principal:
    subject: str
    tenant_id: str
    groups: frozenset[str] = frozenset()
    policy_version: str = "1"


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    tenant_id: str
    document_id: str
    document_version: str
    text: str
    page: int
    start_char: int
    end_char: int
    embedding: tuple[float, ...]
    allowed_users: frozenset[str] = frozenset()
    allowed_groups: frozenset[str] = frozenset()
    parent_id: str | None = None
    source_uri: str = "synthetic://corpus"


@dataclass(frozen=True)
class Citation:
    chunk_id: str
    document_id: str
    document_version: str
    page: int
    start_char: int
    end_char: int
    quote: str


@dataclass(frozen=True)
class SearchHit:
    chunk: Chunk
    lexical_score: float
    dense_score: float
    fused_score: float
    parent_context: str | None = None


@dataclass(frozen=True)
class SearchResponse:
    hits: tuple[SearchHit, ...]
    citations: tuple[Citation, ...]
    context: str
    abstained: bool
    cache_hit: bool
    corpus_revision: str


def cosine_similarity(left: Iterable[float], right: Iterable[float]) -> float:
    a, b = tuple(left), tuple(right)
    if not a or len(a) != len(b):
        raise ValueError("EMBEDDING_DIMENSION_MISMATCH")
    norm_a = math.sqrt(sum(value * value for value in a))
    norm_b = math.sqrt(sum(value * value for value in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return sum(x * y for x, y in zip(a, b)) / (norm_a * norm_b)


def bm25_scores(query: str, chunks: list[Chunk], *, k1: float = 1.2, b: float = 0.75) -> dict[str, float]:
    """Small-corpus BM25 with deterministic tokenization and tie-breaking."""
    terms = tokenize(query)
    if not terms or not chunks:
        return {}
    tokenized = {chunk.chunk_id: tokenize(chunk.text) for chunk in chunks}
    lengths = [len(tokens) for tokens in tokenized.values()]
    average_length = sum(lengths) / len(lengths) if lengths else 0.0
    scores: dict[str, float] = {}
    for chunk in chunks:
        tokens = tokenized[chunk.chunk_id]
        length = len(tokens)
        score = 0.0
        for term in terms:
            frequency = tokens.count(term)
            if not frequency:
                continue
            document_frequency = sum(term in other for other in tokenized.values())
            idf = math.log(1 + (len(chunks) - document_frequency + 0.5) / (document_frequency + 0.5))
            denominator = frequency + k1 * (1 - b + b * length / (average_length or 1.0))
            score += idf * (frequency * (k1 + 1)) / denominator
        scores[chunk.chunk_id] = score
    return scores


def reciprocal_rank_fusion(rankings: list[list[str]], *, k: int = 60,
                            weights: tuple[float, ...] | None = None) -> dict[str, float]:
    if k <= 0:
        raise ValueError("RRF_K_MUST_BE_POSITIVE")
    if weights is None:
        weights = tuple(1.0 for _ in rankings)
    if len(weights) != len(rankings) or any(weight < 0 for weight in weights):
        raise ValueError("INVALID_RRF_WEIGHTS")
    fused: dict[str, float] = {}
    for ranking, weight in zip(rankings, weights):
        for rank, chunk_id in enumerate(ranking, start=1):
            fused[chunk_id] = fused.get(chunk_id, 0.0) + weight / (k + rank)
    return fused


class HybridRetriever:
    def __init__(self, chunks: list[Chunk], *, corpus_revision: str,
                 rrf_k: int = 60, lexical_weight: float = 1.0,
                 dense_weight: float = 1.0, min_fused_score: float = 0.0):
        self.chunks = tuple(chunks)
        self.corpus_revision = corpus_revision
        self.rrf_k = rrf_k
        self.weights = (lexical_weight, dense_weight)
        self.min_fused_score = min_fused_score
        self._by_id = {chunk.chunk_id: chunk for chunk in chunks}
        if len(self._by_id) != len(chunks):
            raise ValueError("DUPLICATE_CHUNK_ID")
        if rrf_k <= 0 or lexical_weight < 0 or dense_weight < 0:
            raise ValueError("INVALID_RETRIEVAL_CONFIGURATION")
        if any(chunk.page < 1 or chunk.start_char < 0 or chunk.end_char < chunk.start_char for chunk in chunks):
            raise ValueError("INVALID_SOURCE_OFFSETS")

    @staticmethod
    def _authorized(chunk: Chunk, principal: Principal) -> bool:
        if chunk.tenant_id != principal.tenant_id:
            return False
        if chunk.allowed_users and principal.subject not in chunk.allowed_users:
            return False
        if chunk.allowed_groups and not (chunk.allowed_groups & principal.groups):
            return False
        return True

    def _cache_key(self, principal: Principal, query: str, query_vector: tuple[float, ...],
                   top_k: int, context_budget: int) -> str:
        material = {
            "tenant": principal.tenant_id, "subject": principal.subject,
            "groups": sorted(principal.groups), "policy": principal.policy_version,
            "query": query, "vector": query_vector, "top_k": top_k,
            "budget": context_budget, "revision": self.corpus_revision,
        }
        return sha256(json.dumps(material, sort_keys=True).encode()).hexdigest()

    def search(self, principal: Principal, query: str, query_vector: Iterable[float],
               *, top_k: int = 5, context_budget: int = 180,
               cache: dict[str, SearchResponse] | None = None) -> SearchResponse:
        if not principal.subject or not principal.tenant_id:
            raise ValueError("VERIFIED_PRINCIPAL_REQUIRED")
        if not query.strip():
            raise ValueError("QUERY_REQUIRED")
        if not 1 <= top_k <= 20 or context_budget <= 0:
            raise ValueError("INVALID_RETRIEVAL_BUDGET")
        vector = tuple(float(value) for value in query_vector)
        key = self._cache_key(principal, query, vector, top_k, context_budget)
        if cache is not None and key in cache:
            prior = cache[key]
            return SearchResponse(prior.hits, prior.citations, prior.context,
                                  prior.abstained, True, self.corpus_revision)

        # Security invariant: unauthorized chunks are removed BEFORE either
        # lexical/dense candidate generation, scoring, ranking or top-k.
        authorized = [chunk for chunk in self.chunks if self._authorized(chunk, principal)]
        lexical = bm25_scores(query, authorized)
        dense = {chunk.chunk_id: cosine_similarity(vector, chunk.embedding) for chunk in authorized}
        lexical_rank = [chunk_id for chunk_id, score in sorted(lexical.items(), key=lambda item: (-item[1], item[0])) if score > 0]
        dense_rank = [chunk_id for chunk_id, score in sorted(dense.items(), key=lambda item: (-item[1], item[0]))]
        fused = reciprocal_rank_fusion([lexical_rank, dense_rank], k=self.rrf_k, weights=self.weights)

        ranked_ids = sorted(fused, key=lambda chunk_id: (-fused[chunk_id], chunk_id))
        hits: list[SearchHit] = []
        used_tokens = 0
        for chunk_id in ranked_ids:
            score = fused[chunk_id]
            if score < self.min_fused_score:
                continue
            chunk = self._by_id[chunk_id]
            parent = self._by_id.get(chunk.parent_id) if chunk.parent_id else None
            parent_text = parent.text if parent and self._authorized(parent, principal) else None
            text_for_budget = (parent_text + " " if parent_text else "") + chunk.text
            cost = len(tokenize(text_for_budget))
            if used_tokens + cost > context_budget and hits:
                continue
            if cost > context_budget:
                continue
            used_tokens += cost
            hits.append(SearchHit(chunk, lexical.get(chunk_id, 0.0),
                                  dense.get(chunk_id, 0.0), score, parent_text))
            if len(hits) >= top_k:
                break

        citations = tuple(Citation(hit.chunk.chunk_id, hit.chunk.document_id,
                                   hit.chunk.document_version, hit.chunk.page,
                                   hit.chunk.start_char, hit.chunk.end_char,
                                   hit.chunk.text[:240]) for hit in hits)
        context_parts = []
        for hit in hits:
            if hit.parent_context:
                context_parts.append(f"[parent {hit.chunk.parent_id}] {hit.parent_context}")
            context_parts.append(f"[{hit.chunk.chunk_id} p.{hit.chunk.page}] {hit.chunk.text}")
        response = SearchResponse(tuple(hits), citations, "\n".join(context_parts),
                                  not bool(hits), False, self.corpus_revision)
        if cache is not None:
            cache[key] = response
        return response


def decompose_query(query: str) -> list[str]:
    """Deterministic teaching heuristic; production decomposition needs evaluation."""
    parts = [part.strip() for part in re.split(r"\s+(?:and|also)\s+", query, flags=re.IGNORECASE) if part.strip()]
    return parts or [query.strip()]


def recall_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    return len(set(retrieved[:k]) & relevant) / len(relevant)


def reciprocal_rank(retrieved: list[str], relevant: set[str]) -> float:
    for rank, item in enumerate(retrieved, start=1):
        if item in relevant:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    dcg = sum((1.0 / math.log2(rank + 1)) for rank, item in enumerate(retrieved[:k], start=1) if item in relevant)
    ideal = sum(1.0 / math.log2(rank + 1) for rank in range(1, min(len(relevant), k) + 1))
    return dcg / ideal if ideal else 0.0


def demo() -> None:
    chunks = [
        Chunk("c1", "tenant-A", "policy", "v3", "retention policy keeps logs for thirty days", 2, 40, 88,
              (1.0, 0.0), frozenset({"alice"})),
        Chunk("c2", "tenant-A", "guide", "v1", "document access requires owner approval", 4, 10, 55,
              (0.7, 0.7), frozenset({"alice"})),
        Chunk("secret", "tenant-B", "internal", "v9", "retention policy super secret key", 1, 0, 40,
              (1.0, 0.0), frozenset({"bob"})),
    ]
    retriever = HybridRetriever(chunks, corpus_revision="demo-v1")
    response = retriever.search(Principal("alice", "tenant-A"), "retention policy",
                                (1.0, 0.0), top_k=3)
    print("abstained:", response.abstained)
    print("citations:", [citation.chunk_id for citation in response.citations])
    print("tenant-safe:", all(hit.chunk.tenant_id == "tenant-A" for hit in response.hits))


if __name__ == "__main__":
    demo()
