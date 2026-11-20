"""Dependency-free, provenance-first RAG algorithms for Stage 5 education and regression tests."""
from __future__ import annotations

from collections import Counter, defaultdict, deque
from dataclasses import dataclass
import math
import re
from typing import Callable, Mapping, Sequence


@dataclass(frozen=True)
class ChunkRecord:
    chunk_id: str
    source_id: str
    parent_id: str
    text: str
    start_char: int
    end_char: int
    page_number: int | None = None


def chunk_text(
    text: str,
    source_id: str,
    max_chars: int = 240,
    overlap_chars: int = 40,
    parent_id: str | None = None,
    page_number: int | None = None,
    strategy: str = "fixed",
) -> list[ChunkRecord]:
    """Split text while retaining exact character offsets and source/page provenance."""
    if not text.strip() or not source_id:
        raise ValueError("non-empty text and source_id are required")
    if max_chars < 1 or overlap_chars < 0 or overlap_chars >= max_chars:
        raise ValueError("max_chars must be positive and overlap must be in [0, max_chars)")
    if strategy not in {"fixed", "sentence"}:
        raise ValueError("strategy must be fixed or sentence")
    parent = parent_id or source_id
    spans: list[tuple[int, int]] = []
    if strategy == "fixed":
        start = 0
        while start < len(text):
            end = min(start + max_chars, len(text))
            left, right = start, end
            while left < right and text[left].isspace():
                left += 1
            while right > left and text[right - 1].isspace():
                right -= 1
            if right > left:
                spans.append((left, right))
            if end >= len(text):
                break
            start = max(start + 1, end - overlap_chars)
    else:
        sentence_spans = [(match.start(), match.end()) for match in
                          re.finditer(r"[^.!?\\n]+[.!?]?(?:\\s+|$)", text) if match.group().strip()]
        current_start: int | None = None
        current_end: int | None = None
        for sentence_start, sentence_end in sentence_spans:
            if sentence_end - sentence_start > max_chars:
                if current_start is not None and current_end is not None:
                    spans.append((current_start, current_end))
                    current_start = current_end = None
                cursor = sentence_start
                while cursor < sentence_end:
                    chunk_end = min(cursor + max_chars, sentence_end)
                    spans.append((cursor, chunk_end))
                    if chunk_end >= sentence_end:
                        break
                    cursor = max(cursor + 1, chunk_end - overlap_chars)
                continue
            if current_start is None:
                current_start, current_end = sentence_start, sentence_end
            elif sentence_end - current_start <= max_chars:
                current_end = sentence_end
            else:
                spans.append((current_start, current_end))
                current_start = max(current_start, current_end - overlap_chars)
                current_end = sentence_end
        if current_start is not None and current_end is not None:
            spans.append((current_start, current_end))
        spans = [(left, right) for left, right in spans if text[left:right].strip()]
    records = []
    for index, (left, right) in enumerate(spans):
        records.append(ChunkRecord(
            chunk_id=f"{source_id}:{index}", source_id=source_id, parent_id=parent,
            text=text[left:right], start_char=left, end_char=right, page_number=page_number,
        ))
    return records


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    if not left or len(left) != len(right):
        raise ValueError("vectors must be non-empty and have equal dimensions")
    if any(not math.isfinite(float(x)) for x in [*left, *right]):
        raise ValueError("vector values must be finite")
    left_norm = math.sqrt(sum(float(x) ** 2 for x in left))
    right_norm = math.sqrt(sum(float(x) ** 2 for x in right))
    if left_norm == 0 or right_norm == 0:
        raise ValueError("zero vectors have undefined cosine similarity")
    return sum(float(a) * float(b) for a, b in zip(left, right)) / (left_norm * right_norm)


def dense_search(query_vector: Sequence[float], documents: Sequence[Mapping[str, object]], top_k: int = 5) -> list[dict[str, object]]:
    if top_k < 1:
        raise ValueError("top_k must be positive")
    ranked = [
        {"id": str(doc["id"]), "score": cosine_similarity(query_vector, doc["vector"])}
        for doc in documents
    ]
    return sorted(ranked, key=lambda row: (-float(row["score"]), str(row["id"])))[:top_k]


def _terms(text: str) -> list[str]:
    return re.findall(r"[\w-]+", text.lower(), flags=re.UNICODE)


def bm25_scores(
    query: str,
    documents: Sequence[Mapping[str, object]],
    k1: float = 1.2,
    b: float = 0.75,
) -> list[dict[str, object]]:
    if not query.strip() or not documents or k1 <= 0 or not 0 <= b <= 1:
        raise ValueError("query, documents, positive k1 and b in [0,1] are required")
    tokenized = [_terms(str(doc["text"])) for doc in documents]
    avgdl = sum(map(len, tokenized)) / len(tokenized) or 1.0
    query_terms = list(dict.fromkeys(_terms(query)))
    scores = []
    for doc, tokens in zip(documents, tokenized):
        counts = Counter(tokens)
        score = 0.0
        for term in query_terms:
            df = sum(1 for row in tokenized if term in row)
            if not df or term not in counts:
                continue
            idf = math.log(1 + (len(documents) - df + 0.5) / (df + 0.5))
            tf = counts[term]
            denominator = tf + k1 * (1 - b + b * len(tokens) / avgdl)
            score += idf * (tf * (k1 + 1)) / denominator
        scores.append({"id": str(doc["id"]), "score": score})
    return sorted(scores, key=lambda row: (-float(row["score"]), str(row["id"])))


def reciprocal_rank_fusion(
    rankings: Sequence[Sequence[str]],
    k: int = 60,
    weights: Sequence[float] | None = None,
) -> list[dict[str, object]]:
    if k < 0 or not rankings:
        raise ValueError("rankings must be non-empty and k non-negative")
    if weights is not None and (len(weights) != len(rankings) or any(w < 0 for w in weights)):
        raise ValueError("weights must be non-negative and align with rankings")
    scores: dict[str, float] = defaultdict(float)
    for index, ranking in enumerate(rankings):
        weight = 1.0 if weights is None else float(weights[index])
        for rank, identifier in enumerate(ranking, start=1):
            scores[str(identifier)] += weight / (k + rank)
    return [{"id": identifier, "score": score} for identifier, score in
            sorted(scores.items(), key=lambda item: (-item[1], item[0]))]


def hybrid_search(
    query: str,
    query_vector: Sequence[float],
    documents: Sequence[Mapping[str, object]],
    top_k: int = 5,
    dense_candidates: int = 20,
    sparse_candidates: int = 20,
) -> list[dict[str, object]]:
    dense = dense_search(query_vector, documents, min(dense_candidates, len(documents)))
    sparse = bm25_scores(query, documents)[:min(sparse_candidates, len(documents))]
    fused = reciprocal_rank_fusion([[str(row["id"]) for row in dense], [str(row["id"]) for row in sparse]])
    by_id = {str(doc["id"]): doc for doc in documents}
    return [{**by_id[str(row["id"])], "hybrid_score": row["score"]} for row in fused[:top_k]]


def rerank_by_scores(candidates: Sequence[Mapping[str, object]], scores: Mapping[str, float], top_k: int = 5) -> list[dict[str, object]]:
    if top_k < 1:
        raise ValueError("top_k must be positive")
    ranked = [{**candidate, "rerank_score": float(scores.get(str(candidate["id"]), float("-inf")))}
              for candidate in candidates]
    return sorted(ranked, key=lambda row: (-float(row["rerank_score"]), str(row["id"])))[:top_k]


def validate_citations(
    citations: Sequence[Mapping[str, object]],
    evidence: Mapping[str, Mapping[str, object]],
) -> dict[str, object]:
    """Validate source IDs and exact quoted spans against the retrieved evidence set."""
    valid, invalid = [], []
    for citation in citations:
        source_id = str(citation.get("source_id", ""))
        quote = str(citation.get("quote", ""))
        source = evidence.get(source_id)
        if source is None:
            invalid.append({"citation": dict(citation), "reason": "source_not_retrieved"})
            continue
        content = str(source.get("text", ""))
        if not quote or quote not in content:
            invalid.append({"citation": dict(citation), "reason": "quote_not_found"})
            continue
        valid.append({"source_id": source_id, "quote": quote,
                      "page_number": source.get("page_number"),
                      "start_char": content.index(quote), "end_char": content.index(quote) + len(quote)})
    return {"valid": valid, "invalid": invalid,
            "precision": len(valid) / len(citations) if citations else 0.0,
            "all_valid": bool(citations) and not invalid}


def recall_at_k(retrieved: Sequence[str], relevant: set[str], k: int) -> float:
    if k < 1 or not relevant:
        raise ValueError("k and relevant set must be non-empty")
    return len(set(retrieved[:k]) & relevant) / len(relevant)


def precision_at_k(retrieved: Sequence[str], relevant: set[str], k: int) -> float:
    if k < 1:
        raise ValueError("k must be positive")
    return len(set(retrieved[:k]) & relevant) / k


def mean_reciprocal_rank(rankings: Sequence[Sequence[str]], relevant: Sequence[set[str]]) -> float:
    if not rankings or len(rankings) != len(relevant):
        raise ValueError("rankings and relevant sets must be non-empty and aligned")
    values = []
    for ranking, expected in zip(rankings, relevant):
        rank = next((i for i, item in enumerate(ranking, 1) if item in expected), None)
        values.append(0.0 if rank is None else 1.0 / rank)
    return sum(values) / len(values)


def ndcg_at_k(retrieved: Sequence[str], relevance: Mapping[str, float], k: int) -> float:
    if k < 1:
        raise ValueError("k must be positive")
    dcg = sum((2 ** max(0.0, float(relevance.get(item, 0.0))) - 1) / math.log2(index + 2)
              for index, item in enumerate(retrieved[:k]))
    ideal = sorted((max(0.0, float(score)) for score in relevance.values()), reverse=True)[:k]
    idcg = sum((2 ** score - 1) / math.log2(index + 2) for index, score in enumerate(ideal))
    return dcg / idcg if idcg else 0.0


def bounded_adaptive_retrieval(
    initial_query: str,
    search: Callable[[str], Sequence[str]],
    coverage: Callable[[Sequence[str]], float],
    rewrite: Callable[[str, Sequence[str]], str],
    max_rounds: int = 2,
    threshold: float = 0.8,
) -> dict[str, object]:
    if max_rounds < 1 or max_rounds > 3 or not 0 <= threshold <= 1:
        raise ValueError("max_rounds must be in [1,3] and threshold in [0,1]")
    query = initial_query
    all_results: list[str] = []
    traces = []
    for round_number in range(1, max_rounds + 1):
        found = list(search(query))
        all_results.extend(item for item in found if item not in all_results)
        score = float(coverage(all_results))
        traces.append({"round": round_number, "query": query, "new_results": found, "coverage": score})
        if score >= threshold:
            break
        if round_number < max_rounds:
            query = rewrite(query, all_results)
    return {"results": all_results, "trace": traces,
            "stop_reason": "coverage_met" if traces[-1]["coverage"] >= threshold else "max_rounds"}


def bounded_graph_traversal(
    edges: Sequence[Mapping[str, object]],
    seeds: Sequence[str],
    max_hops: int = 2,
    max_nodes: int = 25,
    min_confidence: float = 0.0,
) -> dict[str, object]:
    if max_hops < 0 or max_nodes < 1 or not 0 <= min_confidence <= 1:
        raise ValueError("invalid graph traversal bounds")
    adjacency: dict[str, list[Mapping[str, object]]] = defaultdict(list)
    for edge in edges:
        if float(edge.get("confidence", 1.0)) >= min_confidence:
            adjacency[str(edge["source"])].append(edge)
    queue = deque((str(seed), 0) for seed in seeds)
    visited = set(str(seed) for seed in seeds)
    traversed = []
    while queue and len(visited) <= max_nodes:
        node, depth = queue.popleft()
        if depth >= max_hops:
            continue
        for edge in adjacency[node]:
            target = str(edge["target"])
            traversed.append(dict(edge))
            if target not in visited and len(visited) < max_nodes:
                visited.add(target)
                queue.append((target, depth + 1))
    return {"nodes": sorted(visited), "edges": traversed,
            "truncated": bool(queue) or len(visited) >= max_nodes}


def validate_visual_regions(
    regions: Sequence[Mapping[str, object]],
    page_width: int,
    page_height: int,
) -> list[dict[str, object]]:
    if page_width < 1 or page_height < 1:
        raise ValueError("page dimensions must be positive")
    validated = []
    for region in regions:
        x0, y0, x1, y1 = (float(region[key]) for key in ("x0", "y0", "x1", "y1"))
        if not (0 <= x0 < x1 <= page_width and 0 <= y0 < y1 <= page_height):
            raise ValueError("region bounding box is outside page bounds")
        confidence = float(region.get("confidence", 0.0))
        if not 0 <= confidence <= 1:
            raise ValueError("OCR confidence must be in [0,1]")
        validated.append({**region, "bbox": [x0, y0, x1, y1], "confidence": confidence})
    return validated


def align_media_timeline(
    transcript_segments: Sequence[Mapping[str, object]],
    keyframes: Sequence[Mapping[str, object]],
    max_gap_ms: int = 1500,
) -> list[dict[str, object]]:
    if max_gap_ms < 0:
        raise ValueError("max_gap_ms must be non-negative")
    aligned = []
    for segment in transcript_segments:
        start, end = int(segment["start_ms"]), int(segment["end_ms"])
        if end < start:
            raise ValueError("transcript end must be >= start")
        nearest = min(keyframes, key=lambda frame: min(abs(int(frame["timestamp_ms"]) - start),
                                                        abs(int(frame["timestamp_ms"]) - end)), default=None)
        frame_time = None if nearest is None else int(nearest["timestamp_ms"])
        gap = None if frame_time is None else min(abs(frame_time - start), abs(frame_time - end))
        aligned.append({"segment": dict(segment), "keyframe": None if gap is None or gap > max_gap_ms else dict(nearest),
                        "gap_ms": gap})
    return aligned
