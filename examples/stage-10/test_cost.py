import importlib.util
from pathlib import Path
import sys
import unittest
from decimal import Decimal

MODULE_PATH = Path(__file__).parent / "cost" / "cost_engine.py"
spec = importlib.util.spec_from_file_location("cost_engine", MODULE_PATH)
cost_engine = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = cost_engine
spec.loader.exec_module(cost_engine)

Pricing = cost_engine.Pricing
AttemptUsage = cost_engine.AttemptUsage
Task = cost_engine.Task
cost_attempt = cost_engine.cost_attempt
cost_per_successful_task = cost_engine.cost_per_successful_task
estimate_daily_spend = cost_engine.estimate_daily_spend
cache_key = cost_engine.cache_key
estimate_cache_savings = cost_engine.estimate_cache_savings
admit_request = cost_engine.admit_request
select_model = cost_engine.select_model


class CostEngineeringTests(unittest.TestCase):
    def setUp(self):
        self.pricing = Pricing(Decimal("2"), Decimal("8"), Decimal("0.10"), Decimal("1"))

    def test_component_cost_breakdown(self):
        usage = AttemptUsage(2000, 500, 1000, 1, Decimal("0.002"), True)
        result = cost_attempt(usage, self.pricing)
        self.assertEqual(result["input"], Decimal("0.004"))
        self.assertEqual(result["output"], Decimal("0.004"))
        self.assertEqual(result["embedding"], Decimal("0.0001"))
        self.assertEqual(result["rerank"], Decimal("0.001"))
        self.assertEqual(result["tools"], Decimal("0.002"))
        self.assertEqual(result["total"], Decimal("0.0111"))

    def test_failed_attempt_is_included_in_task_cost(self):
        failed = AttemptUsage(2000, 500, 1000, 1, Decimal("0"), False, False)
        succeeded = AttemptUsage(2000, 500, 0, 0, Decimal("0"), True, False)
        task = Task("task-1", "tenant-A", (failed, succeeded), True)
        self.assertEqual(cost_per_successful_task([task], self.pricing), Decimal("0.0171"))

    def test_failed_tasks_cost_is_in_numerator(self):
        successful = Task("task-1", "tenant-A", (AttemptUsage(1000, 100, success=True),), True)
        failed = Task("task-2", "tenant-A", (AttemptUsage(1000, 100, success=False),), False)
        expected = cost_attempt(successful.attempts[0], self.pricing)["total"] + cost_attempt(failed.attempts[0], self.pricing)["total"]
        self.assertEqual(cost_per_successful_task([successful, failed], self.pricing), expected)

    def test_no_successful_tasks_returns_none(self):
        failed = Task("task-1", "tenant-A", (AttemptUsage(100, 10),), False)
        self.assertIsNone(cost_per_successful_task([failed], self.pricing))

    def test_cache_hit_skips_model_and_embedding_cost(self):
        usage = AttemptUsage(5000, 1000, 2000, 5, Decimal("0.001"), True, True)
        result = cost_attempt(usage, self.pricing)
        self.assertEqual(result["total"], Decimal("0.001"))
        self.assertEqual(result["input"], Decimal("0"))

    def test_daily_spend_forecast(self):
        self.assertEqual(estimate_daily_spend(1000, Decimal("0.01")), Decimal("10.00"))

    def test_negative_forecast_rejected(self):
        with self.assertRaisesRegex(ValueError, "INVALID_FORECAST_INPUT"):
            estimate_daily_spend(-1, Decimal("1"))

    def test_cache_key_changes_across_tenants(self):
        a = cache_key("tenant-A", "docs:read", "model-v1", "prompt-v1", "index-v1", "query")
        b = cache_key("tenant-B", "docs:read", "model-v1", "prompt-v1", "index-v1", "query")
        self.assertNotEqual(a, b)

    def test_cache_key_changes_across_model_prompt_and_index_versions(self):
        base = cache_key("tenant-A", "docs:read", "model-v1", "prompt-v1", "index-v1", "query")
        changed = cache_key("tenant-A", "docs:read", "model-v2", "prompt-v1", "index-v1", "query")
        self.assertNotEqual(base, changed)
        self.assertNotEqual(base, cache_key("tenant-A", "docs:read", "model-v1", "prompt-v2", "index-v1", "query"))
        self.assertNotEqual(base, cache_key("tenant-A", "docs:read", "model-v1", "prompt-v1", "index-v2", "query"))

    def test_missing_cache_context_rejected(self):
        with self.assertRaisesRegex(ValueError, "MISSING_CACHE_CONTEXT"):
            cache_key("tenant-A", "docs:read", "model-v1", "prompt-v1", "", "query")

    def test_cache_savings(self):
        self.assertEqual(estimate_cache_savings(Decimal("0.01"), Decimal("0.001"), 100), Decimal("0.900"))

    def test_cache_savings_never_negative(self):
        self.assertEqual(estimate_cache_savings(Decimal("0.001"), Decimal("0.01"), 10), Decimal("0"))

    def test_request_admitted_within_budget(self):
        self.assertEqual(admit_request(Decimal("0.01"), Decimal("0.02"), 1000, 2000), {"allowed": True, "reason": "ADMITTED"})

    def test_request_rejected_over_budget(self):
        self.assertEqual(admit_request(Decimal("0.03"), Decimal("0.02"), 1000, 2000)["reason"], "BUDGET_EXCEEDED")

    def test_request_rejected_over_token_limit(self):
        self.assertEqual(admit_request(Decimal("0.01"), Decimal("0.02"), 3000, 2000)["reason"], "INPUT_TOKEN_LIMIT")

    def test_simple_task_uses_small_qualified_model(self):
        self.assertEqual(select_model("simple", Decimal("1"), {"small": True}, {"small": Decimal("0.01")}), "small")

    def test_complex_task_requires_premium_quality(self):
        self.assertEqual(select_model("complex", Decimal("1"), {"small": True, "premium": True}, {"small": Decimal("0.001"), "premium": Decimal("0.1")}), "premium")

    def test_quality_failure_blocks_cheap_model(self):
        self.assertEqual(select_model("simple", Decimal("1"), {"small": False, "standard": True}, {"small": Decimal("0.001"), "standard": Decimal("0.02")}), "standard")

    def test_budget_can_block_all_models(self):
        self.assertIsNone(select_model("complex", Decimal("0.01"), {"premium": True}, {"premium": Decimal("0.1")}))

    def test_unknown_task_class_rejected(self):
        with self.assertRaisesRegex(ValueError, "UNKNOWN_TASK_CLASS"):
            select_model("unknown", Decimal("1"), {}, {})

    def test_negative_usage_rejected(self):
        with self.assertRaisesRegex(ValueError, "INVALID_INPUT_TOKENS"):
            cost_attempt(AttemptUsage(input_tokens=-1), self.pricing)


if __name__ == "__main__":
    unittest.main()
