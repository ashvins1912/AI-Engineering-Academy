"""Offline advanced retrieval and context-engineering reference implementation."""
from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
import json
import math
import re
from typing import Iterable


def terms(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


@dataclass(frozen=True)
class Chunk:
    chunk_id: str
    doc_id: str
    tenant_id: str
    version: str
    text: str
    page: int
    start_offset: int
    end_offset: int
    allowed_subjects: frozenset[str] = frozenset()
    allowed_roles: frozenset[str] = frozenset()
    valid_from: str = "2020-01-01"
    expires_at: str | None = None
    vector: tuple[float, ...] = ()
    token_vectors: tuple[tuple[float, ...], ...] = ()


@dataclass(frozen=True)
class AccessContext:
    tenant_id: str
    subject: str
    roles: frozenset[str]
    allowed_doc_ids: frozenset[str]
    as_of: str


@dataclass(frozen=True)
class Query:
    text: str
    vector: tuple[float, ...] = ()
    token_vectors: tuple[tuple[float, ...], ...] = ()


@dataclass(frozen=True)
class GraphEdge:
    source_id: str
    relation: str
    target_id: str
    evidence_chunk_id: str


@dataclass(frozen=True)
class RetrievalHit:
    chunk: Chunk
    score: float
    strategy: str


@dataclass(frozen=True)
class QueryPlan:
    subqueries: tuple[str, ...]
    strategy: str
    require_fresh: bool
    graph_expansion: bool


@dataclass(frozen=True)
class Citation:
    doc_id: str
    version: str
    page: int
    start_offset: int
    end_offset: int
    chunk_id: str


@dataclass(frozen=True)
class Evidence:
    text: str
    citation: Citation
    score: float


def plan_query(text: str) -> QueryPlan:
    normalized = text.strip()
    if not normalized:
        raise ValueError("QUERY_EMPTY")
    subqueries = tuple(part.strip() for part in re.split(r"\s+and\s+", normalized, flags=re.I) if part.strip())
    lower = normalized.lower()
    return QueryPlan(
        subqueries=subqueries or (normalized,),
        strategy="hybrid",
        require_fresh=any(word in lower for word in ("current", "latest", "as of", "effective")),
        graph_expansion=any(word in lower for word in ("relationship", "connected", "depends on", "covered by")),
    )


def authorized(chunk: Chunk, access: AccessContext) -> bool:
    if chunk.tenant_id != access.tenant_id:
        return False
    if chunk.doc_id not in access.allowed_doc_ids:
        return False
    if chunk.valid_from > access.as_of:
        return False
    if chunk.expires_at is not None and access.as_of >= chunk.expires_at:
        return False
    if chunk.allowed_subjects or chunk.allowed_roles:
        return access.subject in chunk.allowed_subjects or bool(access.roles & chunk.allowed_roles)
    return True


def filter_before_ranking(chunks: Iterable[Chunk], access: AccessContext) -> tuple[list[Chunk], int]:
    candidates = list(chunks)
    eligible = [chunk for chunk in candidates if authorized(chunk, access)]
    return eligible, len(candidates) - len(eligible)


def lexical_score(query: str, text: str) -> float:
    query_terms = set(terms(query))
    document_terms = terms(text)
    if not query_terms or not document_terms:
        return 0.0
    counts = {term: document_terms.count(term) for term in query_terms}
    matched = sum(count > 0 for count in counts.values())
    tf = sum(counts.values())
    return (matched / len(query_terms)) + 0.05 * math.log1p(tf)


def cosine(left: tuple[float, ...], right: tuple[float, ...]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    denominator = math.sqrt(sum(x * x for x in left) * sum(y * y for y in right))
    return sum(x * y for x, y in zip(left, right)) / denominator if denominator else 0.0


def late_interaction_score(query_vectors: tuple[tuple[float, ...], ...],
                           document_vectors: tuple[tuple[float, ...], ...]) -> float:
    if not query_vectors or not document_vectors:
        return 0.0
    return sum(max(cosine(q, d) for d in document_vectors) for q in query_vectors) / len(query_vectors)


def reciprocal_rank_fusion(rankings: list[list[str]], k0: int = 60) -> dict[str, float]:
    if k0 <= 0:
        raise ValueError("RRF_K0_MUST_BE_POSITIVE")
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, chunk_id in enumerate(ranking, start=1):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k0 + rank)
    return scores


class Retriever:
    def __init__(self):
        self.last_ranked_candidates: tuple[str, ...] = ()

    def retrieve(self, query: Query, chunks: Iterable[Chunk], access: AccessContext,
                 strategy: str = "hybrid", top_k: int = 5) -> tuple[list[RetrievalHit], int]:
        if top_k < 1:
            raise ValueError("TOP_K_MUST_BE_POSITIVE")
        # Security boundary: unauthorized and stale chunks are removed before any scoring.
        candidates, rejected = filter_before_ranking(chunks, access)
        self.last_ranked_candidates = tuple(chunk.chunk_id for chunk in candidates)
        if strategy == "lexical":
            scores = {c.chunk_id: lexical_score(query.text, c.text) for c in candidates}
        elif strategy == "dense":
            scores = {c.chunk_id: cosine(query.vector, c.vector) for c in candidates}
        elif strategy == "late-interaction":
            scores = {c.chunk_id: late_interaction_score(query.token_vectors, c.token_vectors) for c in candidates}
        elif strategy == "hybrid":
            lexical_order = sorted(candidates, key=lambda c: (-lexical_score(query.text, c.text), c.chunk_id))
            dense_order = sorted(candidates, key=lambda c: (-cosine(query.vector, c.vector), c.chunk_id))
            fused = reciprocal_rank_fusion([
                [c.chunk_id for c in lexical_order],
                [c.chunk_id for c in dense_order],
            ])
            scores = fused
        else:
            raise ValueError("UNKNOWN_RETRIEVAL_STRATEGY")
        by_id = {chunk.chunk_id: chunk for chunk in candidates}
        ranked = sorted(scores, key=lambda chunk_id: (-scores[chunk_id], chunk_id))[:top_k]
        return [RetrievalHit(by_id[chunk_id], scores[chunk_id], strategy) for chunk_id in ranked], rejected

    @staticmethod
    def rerank(query: Query, hits: list[RetrievalHit], top_k: int = 5) -> list[RetrievalHit]:
        query_terms = set(terms(query.text))
        reranked = []
        for hit in hits:
            text_terms = set(terms(hit.chunk.text))
            exact_phrase = 0.25 if query.text.lower() in hit.chunk.text.lower() else 0.0
            overlap = len(query_terms & text_terms) / max(1, len(query_terms))
            reranked.append(RetrievalHit(hit.chunk, hit.score + overlap + exact_phrase, "reranked"))
        return sorted(reranked, key=lambda hit: (-hit.score, hit.chunk.chunk_id))[:top_k]


def graph_expand(seed_hits: list[RetrievalHit], edges: Iterable[GraphEdge],
                 chunks_by_id: dict[str, Chunk], access: AccessContext,
                 max_hops: int = 1) -> list[RetrievalHit]:
    if max_hops < 0 or max_hops > 3:
        raise ValueError("GRAPH_HOPS_OUT_OF_RANGE")
    included = {hit.chunk.chunk_id for hit in seed_hits}
    frontier = set(included)
    expanded = list(seed_hits)
    for hop in range(max_hops):
        next_frontier = set()
        for edge in edges:
            if edge.source_id not in frontier:
                continue
            evidence = chunks_by_id.get(edge.evidence_chunk_id)
            if evidence is None or not authorized(evidence, access):
                continue
            if evidence.chunk_id not in included:
                included.add(evidence.chunk_id)
                next_frontier.add(edge.target_id)
                expanded.append(RetrievalHit(evidence, 1.0 / (hop + 2), "graph"))
        frontier = next_frontier
        if not frontier:
            break
    return expanded


def compress_evidence(hit: RetrievalHit, query: Query, token_budget: int) -> Evidence | None:
    if token_budget < 1:
        raise ValueError("TOKEN_BUDGET_MUST_BE_POSITIVE")
    query_terms = set(terms(query.text))
    sentences = re.split(r"(?<=[.!?])\s+", hit.chunk.text.strip())
    selected = []
    used = 0
    for sentence in sentences:
        sentence_terms = set(terms(sentence))
        if not (sentence_terms & query_terms):
            continue
        count = len(terms(sentence))
        if used + count > token_budget:
            continue
        selected.append(sentence)
        used += count
    if not selected:
        return None
    citation = Citation(hit.chunk.doc_id, hit.chunk.version, hit.chunk.page,
                        hit.chunk.start_offset, hit.chunk.end_offset, hit.chunk.chunk_id)
    return Evidence(" ".join(selected), citation, hit.score)


def assemble_context(hits: list[RetrievalHit], query: Query, token_budget: int) -> list[Evidence]:
    remaining = token_budget
    evidence = []
    for hit in hits:
        item = compress_evidence(hit, query, remaining)
        if item is None:
            continue
        used = len(terms(item.text))
        evidence.append(item)
        remaining -= used
        if remaining <= 0:
            break
    return evidence


def retrieval_cache_key(query: Query, access: AccessContext, *, model_version: str,
                        embedding_version: str, index_version: str, policy_version: str) -> str:
    material = {
        "query": " ".join(terms(query.text)),
        "tenant": access.tenant_id,
        "subject": access.subject,
        "roles": sorted(access.roles),
        "docs": sorted(access.allowed_doc_ids),
        "as_of": access.as_of,
        "model": model_version,
        "embedding": embedding_version,
        "index": index_version,
        "policy": policy_version,
    }
    return sha256(json.dumps(material, sort_keys=True).encode()).hexdigest()


class IndexMigration:
    def __init__(self, current_version: str, candidate_version: str, min_overlap: float = 0.8):
        if not 0 <= min_overlap <= 1:
            raise ValueError("OVERLAP_THRESHOLD_INVALID")
        self.current_version = current_version
        self.candidate_version = candidate_version
        self.min_overlap = min_overlap
        self.overlaps: list[float] = []
        self.state = "shadow"

    def observe(self, current_ids: Iterable[str], candidate_ids: Iterable[str]) -> float:
        current, candidate = set(current_ids), set(candidate_ids)
        union = current | candidate
        overlap = len(current & candidate) / len(union) if union else 1.0
        self.overlaps.append(overlap)
        return overlap

    def promote(self) -> str:
        if self.state != "shadow" or not self.overlaps or min(self.overlaps) < self.min_overlap:
            raise ValueError("INDEX_MIGRATION_QUALITY_GATE_FAILED")
        self.state = "promoted"
        return self.candidate_version

    def rollback(self) -> str:
        if self.state != "promoted":
            raise ValueError("INDEX_MIGRATION_NOT_PROMOTED")
        self.state = "rolled_back"
        return self.current_version


def recall_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 1.0
    return len(set(retrieved[:k]) & relevant) / len(relevant)


def mean_reciprocal_rank(rankings: list[list[str]], relevant_sets: list[set[str]]) -> float:
    if not rankings or len(rankings) != len(relevant_sets):
        raise ValueError("RANKING_GOLD_SET_MISMATCH")
    reciprocal = []
    for ranking, relevant in zip(rankings, relevant_sets):
        reciprocal.append(next((1.0 / rank for rank, item in enumerate(ranking, 1) if item in relevant), 0.0))
    return sum(reciprocal) / len(reciprocal)


def demo() -> None:
    chunks = [
        Chunk("a-1", "policy-A", "tenant-A", "v3",
              "The current retention policy keeps records for 90 days. Access requires approval.",
              4, 120, 210, frozenset({"user-A"}), vector=(1.0, 0.0)),
        Chunk("b-1", "policy-B", "tenant-B", "v1",
              "The current retention policy keeps records for 900 days.", 2, 10, 80,
              frozenset({"user-B"}), vector=(0.9, 0.1)),
    ]
    access = AccessContext("tenant-A", "user-A", frozenset(), frozenset({"policy-A"}), "2026-11-22")
    query = Query("current retention policy", vector=(1.0, 0.0))
    hits, rejected = Retriever().retrieve(query, chunks, access, "hybrid", 3)
    print(f"hits={[hit.chunk.chunk_id for hit in hits]} rejected_before_ranking={rejected}")


if __name__ == "__main__":
    demo()
