import unittest

from app.citations import pack_evidence, validate_citations


class CitationValidationTests(unittest.TestCase):
    def setUp(self):
        self.evidence = [
            {"source_id": "chunk-1", "document_id": "doc-1", "page_number": 2,
             "text": "Refunds are available within thirty days."}
        ]

    def test_pack_evidence_preserves_provenance(self):
        packed = pack_evidence(self.evidence, max_chars=100)
        self.assertEqual(packed[0]["source_id"], "chunk-1")
        self.assertEqual(packed[0]["page_number"], 2)
        self.assertFalse(packed[0]["truncated"])

    def test_pack_evidence_enforces_character_budget(self):
        packed = pack_evidence(self.evidence, max_chars=10)
        self.assertEqual(len(packed[0]["text"]), 10)
        self.assertTrue(packed[0]["truncated"])

    def test_pack_evidence_rejects_invalid_budget(self):
        with self.assertRaisesRegex(ValueError, "positive"):
            pack_evidence(self.evidence, 0)

    def test_exact_retrieved_quote_is_validated(self):
        result = validate_citations([{"source_id": "chunk-1", "quote": "within thirty days"}], self.evidence)
        self.assertTrue(result["all_valid"])
        self.assertEqual(result["valid"][0]["start_char"], 22)
        self.assertEqual(result["valid"][0]["end_char"], 39)

    def test_fabricated_source_is_rejected(self):
        result = validate_citations([{"source_id": "missing", "quote": "anything"}], self.evidence)
        self.assertFalse(result["all_valid"])
        self.assertEqual(result["invalid"][0]["reason"], "source_not_retrieved")

    def test_fabricated_quote_is_rejected(self):
        result = validate_citations([{"source_id": "chunk-1", "quote": "free lifetime refunds"}], self.evidence)
        self.assertFalse(result["all_valid"])
        self.assertEqual(result["invalid"][0]["reason"], "quote_not_found")

    def test_duplicate_source_citations_are_rejected(self):
        result = validate_citations([
            {"source_id": "chunk-1", "quote": "Refunds"},
            {"source_id": "chunk-1", "quote": "within thirty days"},
        ], self.evidence)
        self.assertFalse(result["all_valid"])
        self.assertEqual(result["invalid"][0]["reason"], "duplicate_citation")

    def test_distinct_quotes_from_same_chunk_are_allowed(self):
        result = validate_citations([
            {"source_id": "chunk-1", "quote": "Refunds are"},
            {"source_id": "chunk-1", "quote": "within thirty days"},
        ], self.evidence)
        self.assertTrue(result["all_valid"])
        self.assertEqual(len(result["valid"]), 2)

    def test_empty_citation_list_is_not_valid(self):
        self.assertFalse(validate_citations([], self.evidence)["all_valid"])


if __name__ == "__main__":
    unittest.main()
