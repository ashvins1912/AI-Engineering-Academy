import importlib.util
from pathlib import Path
import sys
import unittest

MODULE_PATH = Path(__file__).parent / "tracing" / "trace_engine.py"
spec = importlib.util.spec_from_file_location("tracing_trace_engine", MODULE_PATH)
trace_engine = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = trace_engine
spec.loader.exec_module(trace_engine)

Span = trace_engine.Span
validate_trace = trace_engine.validate_trace
summarize_trace = trace_engine.summarize_trace
sanitize_attributes = trace_engine.sanitize_attributes
safe_metric_labels = trace_engine.safe_metric_labels
parse_traceparent = trace_engine.parse_traceparent
head_sample = trace_engine.head_sample
tail_sample = trace_engine.tail_sample


class TracingTests(unittest.TestCase):
    def setUp(self):
        self.trace_id = "1234567890abcdef1234567890abcdef"
        self.spans = [
            Span(self.trace_id, "root0001", None, "rag.request", 0, 3200),
            Span(self.trace_id, "retr0001", "root0001", "vector.search", 120, 540),
            Span(self.trace_id, "model001", "root0001", "model.generate", 600, 2700, "ERROR"),
            Span(self.trace_id, "tool0001", "root0001", "mcp.tool", 1800, 2450),
        ]

    def test_valid_trace_graph(self):
        self.assertEqual(validate_trace(self.spans), trace_engine.TraceDecision(True, "VALID"))

    def test_empty_trace_rejected(self):
        self.assertEqual(validate_trace([]).reason, "EMPTY_TRACE")

    def test_duplicate_span_id_rejected(self):
        spans = self.spans + [Span(self.trace_id, "root0001", "root0001", "duplicate", 1, 2)]
        self.assertEqual(validate_trace(spans).reason, "DUPLICATE_SPAN_ID")

    def test_mixed_trace_ids_rejected(self):
        spans = self.spans + [Span("f" * 32, "extra001", "root0001", "extra", 1, 2)]
        self.assertEqual(validate_trace(spans).reason, "MIXED_TRACE_IDS")

    def test_missing_parent_rejected(self):
        spans = [self.spans[0], Span(self.trace_id, "orphan01", "missing1", "orphan", 10, 20)]
        self.assertEqual(validate_trace(spans).reason, "MISSING_PARENT")

    def test_child_outside_parent_rejected(self):
        spans = [self.spans[0], Span(self.trace_id, "child001", "root0001", "child", 10, 4000)]
        self.assertEqual(validate_trace(spans).reason, "CHILD_OUTSIDE_PARENT")

    def test_negative_duration_rejected(self):
        spans = [Span(self.trace_id, "root0001", None, "root", 100, 90)]
        self.assertEqual(validate_trace(spans).reason, "INVALID_SPAN_TIME")

    def test_multiple_roots_rejected(self):
        spans = [self.spans[0], Span(self.trace_id, "root0002", None, "other", 0, 10)]
        self.assertEqual(validate_trace(spans).reason, "ROOT_COUNT_INVALID")

    def test_cycle_rejected(self):
        spans = [
            Span(self.trace_id, "root0001", None, "root", 0, 100),
            Span(self.trace_id, "child001", "child002", "a", 1, 50),
            Span(self.trace_id, "child002", "child001", "b", 1, 50),
        ]
        self.assertEqual(validate_trace(spans).reason, "SPAN_CYCLE")

    def test_summary_uses_root_duration_not_sum_of_children(self):
        summary = summarize_trace(self.spans, slow_threshold_ms=500)
        self.assertEqual(summary["duration_ms"], 3200)
        self.assertEqual(summary["slow_spans"], ["rag.request", "model.generate", "mcp.tool"])
        self.assertEqual(summary["error_spans"], ["model.generate"])

    def test_invalid_trace_cannot_be_summarized(self):
        with self.assertRaisesRegex(ValueError, "MISSING_PARENT"):
            summarize_trace([self.spans[0], Span(self.trace_id, "orphan01", "missing1", "x", 1, 2)])

    def test_sensitive_attributes_removed(self):
        safe = sanitize_attributes({
            "model_family": "small", "prompt": "private prompt",
            "authorization": "Bearer secret", "token_count": 128,
            "cache_hit": True,
        })
        self.assertEqual(safe, {"model_family": "small", "cache_hit": True})

    def test_metric_labels_are_allowlisted(self):
        safe = safe_metric_labels({
            "route": "/rag/query", "model_family": "small",
            "user_id": "user-123", "trace_id": self.trace_id,
            "prompt": "private", "status_class": "5xx",
        })
        self.assertEqual(safe, {"route": "/rag/query", "model_family": "small", "status_class": "5xx"})

    def test_valid_traceparent_parsed(self):
        parsed = parse_traceparent("00-1234567890abcdef1234567890abcdef-1234567890abcdef-01")
        self.assertEqual(parsed["trace_id"], self.trace_id)
        self.assertEqual(parsed["parent_id"], "1234567890abcdef")
        self.assertEqual(parsed["flags"], 1)

    def test_invalid_and_zero_traceparent_rejected(self):
        self.assertIsNone(parse_traceparent("bad-header"))
        self.assertIsNone(parse_traceparent("00-" + "0" * 32 + "-1234567890abcdef-01"))
        self.assertIsNone(parse_traceparent(None))

    def test_head_sampling_is_deterministic(self):
        self.assertEqual(head_sample(self.trace_id, 1.0), True)
        self.assertEqual(head_sample(self.trace_id, 0.0), False)

    def test_invalid_sample_rate_rejected(self):
        with self.assertRaisesRegex(ValueError, "INVALID_SAMPLE_RATE"):
            head_sample(self.trace_id, 1.5)

    def test_tail_sampling_retains_errors_and_slow_spans(self):
        self.assertTrue(tail_sample(self.spans))
        normal = [Span(self.trace_id, "root0001", None, "rag.request", 0, 200)]
        self.assertFalse(tail_sample(normal))

    def test_tail_sampling_empty_trace_dropped(self):
        self.assertFalse(tail_sample([]))


if __name__ == "__main__":
    unittest.main()
