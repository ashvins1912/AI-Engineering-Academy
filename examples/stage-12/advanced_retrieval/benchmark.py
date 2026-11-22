"""Reproducible retrieval benchmark over the synthetic Stage 12 corpus."""
from __future__ import annotations

import json
from pathlib import Path

from retrieval_engine import (
    Chunk, HybridRetriever, Principal, ndcg_at_k, recall_at_k, reciprocal_rank,
)


def main() -> None:
    fixture = json.loads((Path(__file__).parent / "scenarios.json").read_text(encoding="utf-8"))
    chunks = [
        Chunk(
            chunk_id=item["chunk_id"], tenant_id=item["tenant_id"],
            document_id=item["document_id"], document_version=item["document_version"],
            text=item["text"], page=item["page"], start_char=item["start_char"],
            end_char=item["end_char"], embedding=tuple(item["embedding"]),
            allowed_users=frozenset(item.get("allowed_users", [])),
            allowed_groups=frozenset(item.get("allowed_groups", [])),
            parent_id=item.get("parent_id"),
        )
        for item in fixture["chunks"]
    ]
    principal = Principal(
        fixture["query"]["principal"]["subject"],
        fixture["query"]["principal"]["tenant_id"],
        frozenset(fixture["query"]["principal"]["groups"]),
    )
    retriever = HybridRetriever(chunks, corpus_revision=fixture["corpusRevision"])
    cases = [
        ("retention policy", (1.0, 0.0, 0.0), {"a-retention"}),
        ("archived records owner approval", (0.7, 0.5, 0.0), {"a-access"}),
        ("vector embeddings semantic meaning", (0.0, 1.0, 0.0), {"a-embedding"}),
    ]
    rows = []
    for query, vector, relevant in cases:
        result = retriever.search(principal, query, vector, top_k=4, context_budget=180)
        ranked = [hit.chunk.chunk_id for hit in result.hits]
        rows.append({
            "query": query,
            "ranked": ranked,
            "relevant": sorted(relevant),
            "recall_at_4": round(recall_at_k(ranked, relevant, 4), 4),
            "mrr": round(reciprocal_rank(ranked, relevant), 4),
            "ndcg_at_4": round(ndcg_at_k(ranked, relevant, 4), 4),
            "abstained": result.abstained,
        })
    averages = {
        metric: round(sum(row[metric] for row in rows) / len(rows), 4)
        for metric in ("recall_at_4", "mrr", "ndcg_at_4")
    }
    report = {"corpus_revision": fixture["corpusRevision"], "queries": rows, "macro_average": averages}
    print(json.dumps(report, indent=2, sort_keys=True))
    if any(row["abstained"] for row in rows):
        raise SystemExit("BENCHMARK_FAILED_EXPECTED_EVIDENCE_MISSING")


if __name__ == "__main__":
    main()
