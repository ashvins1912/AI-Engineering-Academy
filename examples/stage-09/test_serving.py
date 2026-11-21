import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).parent
SIMULATOR_PATH = ROOT / "serving" / "simulator.py"
SPEC = importlib.util.spec_from_file_location("stage09_serving_simulator", SIMULATOR_PATH)
serving_simulator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(serving_simulator)

AdmissionController = serving_simulator.AdmissionController
Request = serving_simulator.Request
kv_cache_bytes_per_token = serving_simulator.kv_cache_bytes_per_token
estimate_kv_cache_bytes = serving_simulator.estimate_kv_cache_bytes
simulate = serving_simulator.simulate


class ServingTests(unittest.TestCase):
    def test_cache_per_token_is_128_kib(self):
        self.assertEqual(kv_cache_bytes_per_token(32, 8, 128, 2), 131072)

    def test_eight_long_sequences_need_four_gib(self):
        self.assertEqual(estimate_kv_cache_bytes(131072, 4096, 0, 8), 4 * 1024**3)

    def test_invalid_dimensions_rejected(self):
        with self.assertRaises(ValueError):
            kv_cache_bytes_per_token(0, 8, 128, 2)

    def test_invalid_token_inputs_rejected(self):
        with self.assertRaises(ValueError):
            estimate_kv_cache_bytes(128, 0, 4, 1)

    def test_queue_cap_is_enforced(self):
        controller = AdmissionController(1, 1)
        self.assertEqual(controller.admit(Request("a", 10, 5)), "accepted")
        self.assertEqual(controller.admit(Request("b", 10, 5)), "queued")
        self.assertEqual(controller.admit(Request("c", 10, 5)), "rejected")

    def test_finish_promotes_waiter(self):
        controller = AdmissionController(1, 1)
        controller.admit(Request("a", 10, 5))
        controller.admit(Request("b", 10, 5))
        self.assertTrue(controller.finish("a"))
        self.assertIn("b", controller.active)

    def test_cancel_promotes_waiter(self):
        controller = AdmissionController(1, 1)
        controller.admit(Request("a", 10, 5))
        controller.admit(Request("b", 10, 5))
        self.assertTrue(controller.cancel("a"))
        self.assertIn("b", controller.active)

    def test_unknown_cancel_is_safe(self):
        self.assertFalse(AdmissionController(1, 0).cancel("missing"))

    def test_duplicate_id_rejected(self):
        controller = AdmissionController(1, 1)
        controller.admit(Request("a", 10, 5))
        with self.assertRaises(ValueError):
            controller.admit(Request("a", 10, 5))

    def test_memory_budget_rejects_long_prompt(self):
        scenario = {
            "model": {"layers": 32, "kv_heads": 8, "head_dim": 128,
                      "bytes_per_element": 2, "kv_cache_budget_mib": 128},
            "scheduler": {"max_active": 2, "max_queue": 2,
                          "synthetic_decode_tokens_per_second": 20},
            "requests": [{"id": "long", "prompt_tokens": 4096, "output_tokens": 128}],
        }
        self.assertEqual(simulate(scenario)["records"][0]["status"], "rejected_memory")

    def test_scenario_reports_synthetic_metrics(self):
        scenario = json.loads((ROOT / "serving" / "benchmark.json").read_text())
        self.assertIn("synthetic", simulate(scenario)["metrics_are"])

    def test_zero_decode_rate_rejected(self):
        scenario = {
            "model": {"layers": 1, "kv_heads": 1, "head_dim": 8,
                      "bytes_per_element": 2, "kv_cache_budget_mib": 64},
            "scheduler": {"max_active": 1, "max_queue": 1,
                          "synthetic_decode_tokens_per_second": 0},
            "requests": [],
        }
        with self.assertRaises(ValueError):
            simulate(scenario)


if __name__ == "__main__":
    unittest.main()
