from __future__ import annotations

from typing import Mapping, Sequence


def pack_evidence(hits: Sequence[Mapping[str, object]], max_chars: int = 16000) -> list[dict[str, object]]:
    if max_chars < 1:
        raise ValueError("max_chars must be positive")
    packed = []
    remaining = max_chars
    for hit in hits:
        text = str(hit.get("text", hit.get("content", "")))
        if not text or remaining <= 0:
            break
        selected = text[:remaining]
        packed.append({
            "source_id": str(hit["source_id"]),
            "document_id": str(hit.get("document_id", "")),
            "page_number": hit.get("page_number"),
            "text": selected,
            "truncated": len(selected) < len(text),
        })
        remaining -= len(selected)
    return packed


def validate_citations(
    citations: Sequence[Mapping[str, object]],
    evidence: Sequence[Mapping[str, object]],
) -> dict[str, object]:
    """Resolve citations only to retrieved evidence and exact quote spans."""
    by_id = {str(item["source_id"]): item for item in evidence}
    valid, invalid, seen = [], [], set()
    for citation in citations:
        source_id = str(citation.get("source_id", ""))
        quote = str(citation.get("quote", "")).strip()
        if source_id in seen:
            invalid.append({"source_id": source_id, "reason": "duplicate_citation"})
            continue
        seen.add(source_id)
        source = by_id.get(source_id)
        if source is None:
            invalid.append({"source_id": source_id, "reason": "source_not_retrieved"})
            continue
        content = str(source.get("text", ""))
        if not quote or quote not in content:
            invalid.append({"source_id": source_id, "reason": "quote_not_found"})
            continue
        start = content.index(quote)
        valid.append({
            "source_id": source_id,
            "document_id": source.get("document_id"),
            "page_number": source.get("page_number"),
            "quote": quote,
            "start_char": start,
            "end_char": start + len(quote),
        })
    return {
        "valid": valid,
        "invalid": invalid,
        "precision": len(valid) / len(citations) if citations else 0.0,
        "all_valid": bool(citations) and not invalid and bool(valid),
    }
