"""Offline distributed trace simulator and telemetry hygiene helpers."""
from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Iterable


@dataclass(frozen=True)
class Span:
    trace_id: str
    span_id: str
    parent_id: str | None
    name: str
    start_ms: int
    end_ms: int
    status: str = "OK"
    attributes: dict = field(default_factory=dict)


@dataclass(frozen=True)
class TraceDecision:
    valid: bool
    reason: str


def validate_trace(spans: Iterable[Span]) -> TraceDecision:
    items = list(spans)
    if not items:
        return TraceDecision(False, "EMPTY_TRACE")
    ids = [s.span_id for s in items]
    if len(set(ids)) != len(ids):
        return TraceDecision(False, "DUPLICATE_SPAN_ID")
    trace_ids = {s.trace_id for s in items}
    if len(trace_ids) != 1 or not next(iter(trace_ids)):
        return TraceDecision(False, "MIXED_TRACE_IDS")
    by_id = {s.span_id: s for s in items}
    roots = [s for s in items if s.parent_id is None]
    if len(roots) != 1:
        return TraceDecision(False, "ROOT_COUNT_INVALID")
    for span in items:
        if not span.span_id or span.start_ms < 0 or span.end_ms < span.start_ms:
            return TraceDecision(False, "INVALID_SPAN_TIME")
        if span.parent_id:
            parent = by_id.get(span.parent_id)
            if parent is None:
                return TraceDecision(False, "MISSING_PARENT")
            if span.start_ms < parent.start_ms or span.end_ms > parent.end_ms:
                return TraceDecision(False, "CHILD_OUTSIDE_PARENT")
        seen = {span.span_id}
        current = span
        while current.parent_id is not None:
            if current.parent_id in seen:
                return TraceDecision(False, "SPAN_CYCLE")
            seen.add(current.parent_id)
            current = by_id[current.parent_id]
    return TraceDecision(True, "VALID")


def summarize_trace(spans: Iterable[Span], slow_threshold_ms: int = 500) -> dict:
    items = list(spans)
    decision = validate_trace(items)
    if not decision.valid:
        raise ValueError(decision.reason)
    root = next(s for s in items if s.parent_id is None)
    return {
        "trace_id": root.trace_id,
        "duration_ms": root.end_ms - root.start_ms,
        "slow_spans": [s.name for s in items if s.end_ms - s.start_ms >= slow_threshold_ms],
        "error_spans": [s.name for s in items if s.status.upper() not in {"OK", "UNSET"}],
        "span_count": len(items),
    }


SENSITIVE_KEYS = re.compile(r"(?i)(prompt|completion|token|authorization|cookie|secret|password|document_text|email|user_id|customer_id)")
ALLOWED_METRIC_LABELS = frozenset({"route", "model_family", "provider", "status_class", "operation", "region"})


def sanitize_attributes(attributes: dict) -> dict:
    safe = {}
    for key, value in attributes.items():
        if SENSITIVE_KEYS.search(str(key)):
            continue
        if isinstance(value, (str, int, float, bool)) and len(str(value)) <= 128:
            safe[str(key)] = value
    return safe


def safe_metric_labels(labels: dict) -> dict:
    return {
        key: value for key, value in labels.items()
        if key in ALLOWED_METRIC_LABELS and isinstance(value, (str, int, float, bool))
        and len(str(value)) <= 64
    }


TRACEPARENT = re.compile(r"^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$")


def parse_traceparent(value: str | None) -> dict | None:
    if not value:
        return None
    match = TRACEPARENT.fullmatch(value.strip().lower())
    if not match:
        return None
    trace_id, parent_id, flags = match.groups()
    if set(trace_id) == {"0"} or set(parent_id) == {"0"}:
        return None
    return {"trace_id": trace_id, "parent_id": parent_id, "flags": int(flags, 16)}


def head_sample(trace_id: str, rate: float) -> bool:
    if not 0 <= rate <= 1:
        raise ValueError("INVALID_SAMPLE_RATE")
    if not re.fullmatch(r"[0-9a-fA-F]{32}", trace_id) or set(trace_id.lower()) == {"0"}:
        raise ValueError("INVALID_TRACE_ID")
    value = int(trace_id[:8], 16) / 0xFFFFFFFF
    return value < rate


def tail_sample(spans: Iterable[Span], slow_threshold_ms: int = 1000) -> bool:
    items = list(spans)
    if not items:
        return False
    return any(s.status.upper() not in {"OK", "UNSET"} or s.end_ms - s.start_ms >= slow_threshold_ms for s in items)


def main() -> None:
    trace_id = "1234567890abcdef1234567890abcdef"
    spans = [
        Span(trace_id, "root0001", None, "rag.request", 0, 3200),
        Span(trace_id, "retr0001", "root0001", "vector.search", 120, 540),
        Span(trace_id, "model001", "root0001", "model.generate", 600, 2700, "ERROR"),
        Span(trace_id, "tool0001", "root0001", "mcp.tool", 1800, 2450),
    ]
    print("validation:", validate_trace(spans))
    print("summary:", summarize_trace(spans))
    print("safe attributes:", sanitize_attributes({"model_family": "small", "prompt": "private text", "token_count": 128}))
    print("tail sampled:", tail_sample(spans))


if __name__ == "__main__":
    main()
