from __future__ import annotations

import math
from collections.abc import Iterable, Sequence


def _relevant_set(relevant_ids: Iterable[str]) -> set[str]:
    relevant = {str(item) for item in relevant_ids}
    if not relevant:
        raise ValueError("at least one relevant document ID is required")
    return relevant


def recall_at_k(retrieved_ids: Sequence[str], relevant_ids: Iterable[str], k: int = 5) -> float:
    if k < 1:
        raise ValueError("k must be positive")
    relevant = _relevant_set(relevant_ids)
    found = {str(item) for item in retrieved_ids[:k]} & relevant
    return len(found) / len(relevant)


def reciprocal_rank(retrieved_ids: Sequence[str], relevant_ids: Iterable[str]) -> float:
    relevant = _relevant_set(relevant_ids)
    for rank, document_id in enumerate(retrieved_ids, start=1):
        if str(document_id) in relevant:
            return 1.0 / rank
    return 0.0


def ndcg_at_k(retrieved_ids: Sequence[str], relevant_ids: Iterable[str], k: int = 10) -> float:
    if k < 1:
        raise ValueError("k must be positive")
    relevant = _relevant_set(relevant_ids)
    gains = [1.0 if str(item) in relevant else 0.0 for item in retrieved_ids[:k]]
    dcg = sum(gain / math.log2(rank + 1) for rank, gain in enumerate(gains, start=1))
    ideal_count = min(len(relevant), k)
    ideal_dcg = sum(1.0 / math.log2(rank + 1) for rank in range(1, ideal_count + 1))
    return dcg / ideal_dcg if ideal_dcg else 0.0


def evaluate_retrieval(
    retrieved_by_query: dict[str, Sequence[str]],
    relevant_by_query: dict[str, Iterable[str]],
    *,
    recall_k: int = 5,
    ndcg_k: int = 10,
) -> dict[str, float]:
    if not retrieved_by_query or set(retrieved_by_query) != set(relevant_by_query):
        raise ValueError("retrieved and relevance datasets must contain the same non-empty query IDs")
    query_ids = sorted(retrieved_by_query)
    return {
        "query_count": float(len(query_ids)),
        f"recall@{recall_k}": sum(
            recall_at_k(retrieved_by_query[q], relevant_by_query[q], recall_k) for q in query_ids
        ) / len(query_ids),
        "mrr": sum(
            reciprocal_rank(retrieved_by_query[q], relevant_by_query[q]) for q in query_ids
        ) / len(query_ids),
        f"ndcg@{ndcg_k}": sum(
            ndcg_at_k(retrieved_by_query[q], relevant_by_query[q], ndcg_k) for q in query_ids
        ) / len(query_ids),
    }
