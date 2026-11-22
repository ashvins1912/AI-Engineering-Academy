"""Offline multimodal evidence normalization, alignment and retrieval lab."""
from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any, Iterable


WORD = re.compile(r"[a-z0-9']+")


def tokens(text: str) -> list[str]:
    return WORD.findall(text.lower())


def _edit_distance(left: list[str], right: list[str]) -> int:
    previous = list(range(len(right) + 1))
    for i, a in enumerate(left, start=1):
        current = [i]
        for j, b in enumerate(right, start=1):
            current.append(min(current[-1] + 1, previous[j] + 1, previous[j - 1] + (a != b)))
        previous = current
    return previous[-1]


def word_error_rate(reference: str, hypothesis: str) -> float:
    ref, hyp = tokens(reference), tokens(hypothesis)
    if not ref:
        return 0.0 if not hyp else 1.0
    return _edit_distance(ref, hyp) / len(ref)


def character_error_rate(reference: str, hypothesis: str) -> float:
    ref = list(reference.strip().lower())
    hyp = list(hypothesis.strip().lower())
    if not ref:
        return 0.0 if not hyp else 1.0
    return _edit_distance(ref, hyp) / len(ref)


def normalize_ocr_blocks(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for block in blocks:
        page = int(block["page"])
        bbox = tuple(float(value) for value in block["bbox"])
        confidence = float(block["confidence"])
        text = str(block["text"]).strip()
        if page < 1 or len(bbox) != 4 or not text or not 0 <= confidence <= 1:
            raise ValueError("OCR_BLOCK_INVALID")
        x0, y0, x1, y1 = bbox
        if x1 <= x0 or y1 <= y0:
            raise ValueError("OCR_BBOX_INVALID")
        normalized.append({**block, "page": page, "bbox": bbox,
                           "confidence": confidence, "text": text})
    return sorted(normalized, key=lambda item: (item["page"], item["bbox"][1], item["bbox"][0]))


def table_to_markdown(headers: list[str], rows: list[list[str]]) -> str:
    if not headers or any(len(row) != len(headers) for row in rows):
        raise ValueError("TABLE_SHAPE_INVALID")
    clean = lambda value: str(value).replace("|", "\\|").replace("\n", " ").strip()
    lines = ["| " + " | ".join(clean(value) for value in headers) + " |",
             "| " + " | ".join("---" for _ in headers) + " |"]
    lines.extend("| " + " | ".join(clean(value) for value in row) + " |" for row in rows)
    return "\n".join(lines)


def normalize_audio_segments(segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for segment in segments:
        start, end = int(segment["start_ms"]), int(segment["end_ms"])
        text = str(segment["text"]).strip()
        confidence = float(segment.get("confidence", 1.0))
        if start < 0 or end <= start or not text or not 0 <= confidence <= 1:
            raise ValueError("AUDIO_SEGMENT_INVALID")
        normalized.append({**segment, "start_ms": start, "end_ms": end,
                           "text": text, "confidence": confidence,
                           "speaker": str(segment.get("speaker", "unknown"))})
    return sorted(normalized, key=lambda item: (item["start_ms"], item["end_ms"]))


def sample_video_frames(frames: list[dict[str, Any]], interval_ms: int = 1000) -> list[dict[str, Any]]:
    if interval_ms <= 0:
        raise ValueError("FRAME_INTERVAL_INVALID")
    ordered = sorted(frames, key=lambda item: int(item["timestamp_ms"]))
    selected = []
    last = -interval_ms
    for frame in ordered:
        timestamp = int(frame["timestamp_ms"])
        if timestamp < 0:
            raise ValueError("FRAME_TIMESTAMP_INVALID")
        if timestamp - last >= interval_ms:
            selected.append({**frame, "timestamp_ms": timestamp})
            last = timestamp
    return selected


def align_audio_video(segments: list[dict[str, Any]], frames: list[dict[str, Any]],
                      tolerance_ms: int = 500) -> list[dict[str, Any]]:
    if tolerance_ms < 0:
        raise ValueError("ALIGNMENT_TOLERANCE_INVALID")
    aligned = []
    for segment in segments:
        midpoint = (segment["start_ms"] + segment["end_ms"]) // 2
        nearest = min(frames, key=lambda frame: abs(frame["timestamp_ms"] - midpoint), default=None)
        delta = abs(nearest["timestamp_ms"] - midpoint) if nearest else None
        aligned.append({
            "segment_start_ms": segment["start_ms"],
            "segment_end_ms": segment["end_ms"],
            "speaker": segment.get("speaker", "unknown"),
            "frame_id": nearest.get("frame_id") if nearest and delta <= tolerance_ms else None,
            "alignment_delta_ms": delta if nearest and delta <= tolerance_ms else None,
        })
    return aligned


@dataclass(frozen=True)
class Principal:
    subject: str
    tenant_id: str
    groups: frozenset[str] = frozenset()


@dataclass(frozen=True)
class EvidenceSpan:
    evidence_id: str
    asset_id: str
    tenant_id: str
    modality: str
    text: str
    confidence: float
    source_ref: str
    page: int | None = None
    bbox: tuple[float, float, float, float] | None = None
    start_ms: int | None = None
    end_ms: int | None = None
    speaker: str | None = None
    allowed_users: frozenset[str] = frozenset()
    allowed_groups: frozenset[str] = frozenset()
    untrusted_data: bool = True
    retention_until: str | None = None
    asset_version: str = "v1"


@dataclass(frozen=True)
class Citation:
    evidence_id: str
    asset_id: str
    modality: str
    source_ref: str
    page: int | None
    bbox: tuple[float, float, float, float] | None
    start_ms: int | None
    end_ms: int | None
    speaker: str | None
    confidence: float
    asset_version: str


@dataclass(frozen=True)
class RetrievalResult:
    evidence: tuple[EvidenceSpan, ...]
    citations: tuple[Citation, ...]
    context: str
    abstained: bool


class MultimodalPipeline:
    def __init__(self, evidence: Iterable[EvidenceSpan]):
        self.evidence = tuple(evidence)
        ids = [item.evidence_id for item in self.evidence]
        if len(ids) != len(set(ids)):
            raise ValueError("DUPLICATE_EVIDENCE_ID")
        for item in self.evidence:
            if not item.tenant_id or not item.asset_id or not item.asset_version or not item.source_ref:
                raise ValueError("EVIDENCE_PROVENANCE_REQUIRED")
            if item.modality not in {"document", "image", "audio", "video", "table"}:
                raise ValueError("EVIDENCE_MODALITY_INVALID")
            if not item.untrusted_data:
                raise ValueError("EVIDENCE_TRUST_LABEL_INVALID")
            if not 0 <= item.confidence <= 1:
                raise ValueError("EVIDENCE_CONFIDENCE_INVALID")
            if item.page is not None and item.page < 1:
                raise ValueError("EVIDENCE_PAGE_INVALID")
            if item.start_ms is not None and item.start_ms < 0:
                raise ValueError("EVIDENCE_TIMESTAMP_INVALID")
            if item.end_ms is not None and (item.start_ms is None or item.end_ms <= item.start_ms):
                raise ValueError("EVIDENCE_TIME_RANGE_INVALID")
            if item.bbox is not None and (len(item.bbox) != 4 or item.bbox[2] <= item.bbox[0]
                                          or item.bbox[3] <= item.bbox[1]):
                raise ValueError("EVIDENCE_BBOX_INVALID")

    @staticmethod
    def _authorized(item: EvidenceSpan, principal: Principal) -> bool:
        if item.tenant_id != principal.tenant_id:
            return False
        if item.allowed_users and principal.subject not in item.allowed_users:
            return False
        if item.allowed_groups and not (item.allowed_groups & principal.groups):
            return False
        return True

    def retrieve(self, principal: Principal, query: str, *, top_k: int = 5,
                 min_confidence: float = 0.5, as_of_date: str | None = None) -> RetrievalResult:
        if not principal.subject or not principal.tenant_id:
            raise ValueError("VERIFIED_PRINCIPAL_REQUIRED")
        if not query.strip() or not 1 <= top_k <= 20 or not 0 <= min_confidence <= 1:
            raise ValueError("RETRIEVAL_INPUT_INVALID")
        query_terms = set(tokens(query))
        # Filter tenant and ACL before scoring/ranking; media text is never authority.
        candidates = [item for item in self.evidence
                      if self._authorized(item, principal) and item.confidence >= min_confidence
                      and (as_of_date is None or item.retention_until is None
                           or as_of_date < item.retention_until)]
        scored = []
        for item in candidates:
            overlap = len(query_terms & set(tokens(item.text)))
            if overlap:
                scored.append((overlap, item.confidence, item.evidence_id, item))
        ranked = [item for _, _, _, item in sorted(scored, key=lambda row: (-row[0], -row[1], row[2]))[:top_k]]
        citations = tuple(Citation(item.evidence_id, item.asset_id, item.modality, item.source_ref,
                                   item.page, item.bbox, item.start_ms, item.end_ms,
                                   item.speaker, item.confidence, item.asset_version) for item in ranked)
        context = "\n".join(f"[{item.evidence_id} | {item.modality}] {item.text}" for item in ranked)
        return RetrievalResult(tuple(ranked), citations, context, not bool(ranked))


def demo() -> None:
    evidence = [
        EvidenceSpan("doc-p2", "policy.pdf", "tenant-A", "document",
                     "Audit records are retained for thirty days.", 0.98,
                     "synthetic://policy.pdf", page=2, bbox=(20, 40, 400, 90)),
        EvidenceSpan("audio-1", "meeting.wav", "tenant-A", "audio",
                     "The retention window is thirty days.", 0.91,
                     "synthetic://meeting.wav", start_ms=1200, end_ms=3200, speaker="speaker-1"),
        EvidenceSpan("secret", "other.pdf", "tenant-B", "document",
                     "Audit records reveal secret credentials.", 1.0,
                     "synthetic://other.pdf", page=1),
    ]
    result = MultimodalPipeline(evidence).retrieve(
        Principal("alice", "tenant-A"), "retention thirty days"
    )
    print(f"abstained={result.abstained} citations={len(result.citations)}")
    print("sources:", [citation.evidence_id for citation in result.citations])


if __name__ == "__main__":
    demo()
