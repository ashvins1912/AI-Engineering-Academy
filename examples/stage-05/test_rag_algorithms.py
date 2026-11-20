import unittest

from rag_algorithms import (
    align_media_timeline, bm25_scores, bounded_adaptive_retrieval,
    bounded_graph_traversal, chunk_text, cosine_similarity, dense_search,
    hybrid_search, mean_reciprocal_rank, ndcg_at_k, precision_at_k,
    recall_at_k, reciprocal_rank_fusion, rerank_by_scores, validate_citations,
    validate_visual_regions,
)


class RAGAlgorithmTests(unittest.TestCase):
    def setUp(self):
        self.docs = [
            {"id": "policy-1", "text": "Refunds are available within thirty days.", "vector": [1.0, 0.0]},
            {"id": "policy-2", "text": "Express shipping takes two business days.", "vector": [0.0, 1.0]},
            {"id": "policy-3", "text": "Refund exceptions require manager approval.", "vector": [0.8, 0.2]},
        ]

    def test_chunk_offsets_and_parent_provenance(self):
        text = "First sentence. Second sentence. Third sentence."
        chunks = chunk_text(text, "doc-1", max_chars=24, overlap_chars=5, parent_id="parent", page_number=2)
        self.assertGreaterEqual(len(chunks), 2)
        for chunk in chunks:
            self.assertEqual(chunk.text, text[chunk.start_char:chunk.end_char])
            self.assertEqual(chunk.parent_id, "parent")
            self.assertEqual(chunk.page_number, 2)

    def test_chunk_rejects_invalid_overlap(self):
        with self.assertRaisesRegex(ValueError, "overlap"):
            chunk_text("abc", "doc", max_chars=10, overlap_chars=10)

    def test_sentence_chunking_respects_source_identity(self):
        chunks = chunk_text("One. Two. Three.", "doc", max_chars=9, overlap_chars=1, strategy="sentence")
        self.assertTrue(all(chunk.source_id == "doc" for chunk in chunks))

    def test_cosine_similarity(self):
        self.assertAlmostEqual(cosine_similarity([1, 0], [2, 0]), 1)
        self.assertAlmostEqual(cosine_similarity([1, 0], [0, 1]), 0)

    def test_cosine_rejects_mismatch_and_zero_vectors(self):
        with self.assertRaisesRegex(ValueError, "dimensions"):
            cosine_similarity([1], [1, 2])
        with self.assertRaisesRegex(ValueError, "zero vectors"):
            cosine_similarity([0, 0], [1, 0])

    def test_dense_search_exact_ranking(self):
        result = dense_search([1, 0], self.docs, top_k=2)
        self.assertEqual([row["id"] for row in result], ["policy-1", "policy-3"])

    def test_bm25_prefers_rare_identifier_and_relevant_terms(self):
        docs = [{"id": "a", "text": "POL-17 refund policy refund"},
                {"id": "b", "text": "general shipping policy"},
                {"id": "c", "text": "refund exception"}]
        scores = bm25_scores("POL-17 refund", docs)
        self.assertEqual(scores[0]["id"], "a")

    def test_rrf_combines_rankings_and_weights(self):
        result = reciprocal_rank_fusion([["a", "b"], ["b", "a"]])
        self.assertEqual(result[0]["id"], "a")
        weighted = reciprocal_rank_fusion([["a"], ["b"]], weights=[2, 1])
        self.assertEqual(weighted[0]["id"], "a")

    def test_hybrid_search_returns_document_metadata(self):
        result = hybrid_search("refund policy", [1, 0], self.docs, top_k=2)
        self.assertTrue(all("text" in row and "hybrid_score" in row for row in result))

    def test_rerank_changes_candidate_order(self):
        result = rerank_by_scores([{"id": "a"}, {"id": "b"}], {"a": 0.1, "b": 0.9})
        self.assertEqual(result[0]["id"], "b")

    def test_citation_validator_accepts_exact_retrieved_quote(self):
        evidence = {"c1": {"text": "Refunds are available within 30 days.", "page_number": 2}}
        result = validate_citations([{"source_id": "c1", "quote": "within 30 days"}], evidence)
        self.assertTrue(result["all_valid"])
        self.assertEqual(result["valid"][0]["page_number"], 2)

    def test_citation_validator_rejects_fabricated_source_and_quote(self):
        evidence = {"c1": {"text": "Refunds within 30 days."}}
        result = validate_citations([
            {"source_id": "c2", "quote": "free returns"},
            {"source_id": "c1", "quote": "free returns"},
        ], evidence)
        self.assertEqual(result["precision"], 0)
        self.assertFalse(result["all_valid"])

    def test_retrieval_metrics(self):
        retrieved = ["a", "x", "b"]
        relevant = {"a", "b"}
        self.assertEqual(recall_at_k(retrieved, relevant, 2), 0.5)
        self.assertEqual(precision_at_k(retrieved, relevant, 3), 2 / 3)
        self.assertEqual(mean_reciprocal_rank([retrieved], [relevant]), 1.0)
        self.assertGreater(ndcg_at_k(retrieved, {"a": 2, "b": 1}, 3), 0)

    def test_adaptive_retrieval_stops_when_coverage_met(self):
        calls = []
        def search(q):
            calls.append(q)
            return ["date"] if len(calls) == 1 else ["exception"]
        result = bounded_adaptive_retrieval("refund dates", search, lambda rows: len(rows) / 2,
                                            lambda q, rows: q + " exceptions", max_rounds=3)
        self.assertEqual(result["stop_reason"], "coverage_met")
        self.assertEqual(len(result["trace"]), 2)

    def test_adaptive_retrieval_enforces_round_limit(self):
        result = bounded_adaptive_retrieval("query", lambda q: [], lambda rows: 0,
                                            lambda q, rows: q, max_rounds=2)
        self.assertEqual(result["stop_reason"], "max_rounds")
        self.assertEqual(len(result["trace"]), 2)

    def test_graph_traversal_is_bounded_and_provenance_preserved(self):
        edges = [
            {"source": "Alice", "target": "Acme", "relation": "works_for", "source_id": "e1", "confidence": 0.9},
            {"source": "Acme", "target": "Bengaluru", "relation": "located_in", "source_id": "e2", "confidence": 0.8},
            {"source": "Bengaluru", "target": "India", "relation": "in_country", "source_id": "e3", "confidence": 0.9},
        ]
        result = bounded_graph_traversal(edges, ["Alice"], max_hops=2)
        self.assertEqual(set(result["nodes"]), {"Alice", "Acme", "Bengaluru"})
        self.assertEqual([edge["source_id"] for edge in result["edges"]], ["e1", "e2"])

    def test_graph_traversal_confidence_filter(self):
        edges = [{"source": "A", "target": "B", "confidence": 0.2, "source_id": "e"}]
        self.assertEqual(bounded_graph_traversal(edges, ["A"], min_confidence=0.5)["nodes"], ["A"])

    def test_visual_regions_validate_page_bounds(self):
        region = {"x0": 10, "y0": 20, "x1": 100, "y1": 120, "confidence": 0.9, "page": 1}
        result = validate_visual_regions([region], 200, 300)
        self.assertEqual(result[0]["bbox"], [10, 20, 100, 120])
        with self.assertRaisesRegex(ValueError, "outside page"):
            validate_visual_regions([{"x0": -1, "y0": 0, "x1": 10, "y1": 10}], 100, 100)

    def test_visual_regions_reject_invalid_confidence(self):
        with self.assertRaisesRegex(ValueError, "confidence"):
            validate_visual_regions([{"x0": 0, "y0": 0, "x1": 1, "y1": 1, "confidence": 2}], 10, 10)

    def test_multimodal_timeline_alignment(self):
        result = align_media_timeline(
            [{"start_ms": 1000, "end_ms": 2000, "text": "speaker"}],
            [{"timestamp_ms": 2200, "frame_id": "f1"}], max_gap_ms=500,
        )
        self.assertEqual(result[0]["keyframe"]["frame_id"], "f1")
        self.assertEqual(result[0]["gap_ms"], 200)

    def test_multimodal_alignment_rejects_negative_gap(self):
        with self.assertRaisesRegex(ValueError, "non-negative"):
            align_media_timeline([], [], max_gap_ms=-1)


if __name__ == "__main__":
    unittest.main()
