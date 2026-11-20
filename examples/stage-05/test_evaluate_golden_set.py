import json
import unittest
from pathlib import Path

from evaluate_golden_set import evaluate_golden_set, GOLDEN_PATH, CORPUS_PATH


class RAGEvaluationHarnessTests(unittest.TestCase):
    def test_golden_set_has_thirty_versioned_queries(self):
        data = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))
        self.assertEqual(data["version"], "1.0.0")
        self.assertGreaterEqual(len(data["queries"]), 30)

    def test_golden_set_contains_answerable_and_no_answer_cases(self):
        rows = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))["queries"]
        self.assertTrue(any(row["answerable"] for row in rows))
        self.assertTrue(any(not row["answerable"] for row in rows))
        self.assertTrue(all(bool(row["expected_evidence_ids"]) == row["answerable"] for row in rows))

    def test_corpus_ids_are_unique(self):
        rows = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
        ids = [row["id"] for row in rows]
        self.assertEqual(len(ids), len(set(ids)))

    def test_evaluation_returns_retrieval_metrics(self):
        result = evaluate_golden_set(top_k=3)
        self.assertEqual(result["query_count"], 30)
        self.assertEqual(result["answerable_count"] + result["unanswerable_count"], 30)
        for key in ("macro_recall_at_k", "macro_precision_at_k", "mean_reciprocal_rank", "mean_ndcg_at_k"):
            self.assertGreaterEqual(result[key], 0)
            self.assertLessEqual(result[key], 1)

    def test_evaluation_rejects_invalid_top_k(self):
        with self.assertRaisesRegex(ValueError, "positive"):
            evaluate_golden_set(top_k=0)


if __name__ == "__main__":
    unittest.main()
