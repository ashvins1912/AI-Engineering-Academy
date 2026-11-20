"""Run a deterministic BM25 baseline over the versioned synthetic RAG golden set."""
from __future__ import annotations

import json
from pathlib import Path

from rag_algorithms import bm25_scores, mean_reciprocal_rank, ndcg_at_k, precision_at_k, recall_at_k


ROOT = Path(__file__).parent
CORPUS_PATH = ROOT / "fixtures" / "rag_corpus.json"
GOLDEN_PATH = ROOT / "fixtures" / "golden_queries.json"


def evaluate_golden_set(top_k: int = 3) -> dict[str, object]:
    if top_k < 1:
        raise ValueError("top_k must be positive")
    corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
    golden = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
    answerable = [row for row in golden["queries"] if row["answerable"]]
    recall, precision, reciprocal, ndcg = [], [], [], []
    for row in answerable:
        ranked = bm25_scores(row["question"], corpus)
        ids = [item["id"] for item in ranked]
        relevant = set(row["expected_evidence_ids"])
        recall.append(recall_at_k(ids, relevant, top_k))
        precision.append(precision_at_k(ids, relevant, top_k))
        reciprocal.append(mean_reciprocal_rank([ids], [relevant]))
        grades = {doc_id: 1.0 for doc_id in relevant}
        ndcg.append(ndcg_at_k(ids, grades, top_k))
    unanswerable = [row for row in golden["queries"] if not row["answerable"]]
    return {
        "dataset_version": golden["version"],
        "query_count": len(golden["queries"]),
        "answerable_count": len(answerable),
        "unanswerable_count": len(unanswerable),
        "top_k": top_k,
        "macro_recall_at_k": sum(recall) / len(recall) if recall else 0.0,
        "macro_precision_at_k": sum(precision) / len(precision) if precision else 0.0,
        "mean_reciprocal_rank": sum(reciprocal) / len(reciprocal) if reciprocal else 0.0,
        "mean_ndcg_at_k": sum(ndcg) / len(ndcg) if ndcg else 0.0,
        "benchmark_note": "Synthetic lexical baseline only; do not report as production relevance performance.",
    }


def main() -> None:
    print(json.dumps(evaluate_golden_set(), indent=2))


if __name__ == "__main__":
    main()
