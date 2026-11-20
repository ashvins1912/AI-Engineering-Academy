import unittest

from app.retrieval_metrics import evaluate_retrieval, ndcg_at_k, recall_at_k, reciprocal_rank


class RetrievalMetricTests(unittest.TestCase):
    def test_recall_at_k_uses_relevant_set_denominator(self):
        self.assertAlmostEqual(recall_at_k(["a", "x", "b"], {"a", "b", "c"}, 2), 1 / 3)

    def test_reciprocal_rank_uses_first_relevant_result(self):
        self.assertEqual(reciprocal_rank(["x", "b", "a"], {"a", "b"}), 0.5)
        self.assertEqual(reciprocal_rank(["x"], {"a"}), 0.0)

    def test_ndcg_rewards_relevant_results_earlier(self):
        self.assertGreater(ndcg_at_k(["a", "x", "b"], {"a", "b"}, 3),
                           ndcg_at_k(["x", "a", "b"], {"a", "b"}, 3))

    def test_evaluation_averages_query_metrics(self):
        result = evaluate_retrieval(
            {"q1": ["a", "x"], "q2": ["x", "b"]},
            {"q1": {"a"}, "q2": {"b"}},
            recall_k=2,
            ndcg_k=2,
        )
        self.assertEqual(result["query_count"], 2.0)
        self.assertEqual(result["recall@2"], 1.0)
        self.assertEqual(result["mrr"], 0.75)
        self.assertGreater(result["ndcg@2"], 0.8)

    def test_invalid_inputs_are_rejected(self):
        with self.assertRaises(ValueError):
            recall_at_k(["a"], {"a"}, 0)
        with self.assertRaises(ValueError):
            reciprocal_rank(["a"], set())
        with self.assertRaises(ValueError):
            evaluate_retrieval({}, {})


if __name__ == "__main__":
    unittest.main()
