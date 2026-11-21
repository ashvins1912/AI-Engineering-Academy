import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).parent
SOURCE = ROOT / "rollouts" / "rollout_policy.py"
SPEC = importlib.util.spec_from_file_location("stage09_rollout_policy", SOURCE)
module = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = module
SPEC.loader.exec_module(module)


class RolloutPolicyTests(unittest.TestCase):
    def setUp(self):
        self.stable = {"release_id": "v17", "quality": 0.90, "p95_ms": 1700}
        self.candidate = {"release_id": "v18", "quality": 0.88, "p95_ms": 1800, "samples": 100}
        self.policy = {"canary_steps": [10, 25, 50, 100], "max_p95_ms": 2000,
                       "max_quality_drop_percent": 5, "min_samples": 50}

    def test_relative_quality_drop(self):
        self.assertAlmostEqual(module.quality_drop_percent(0.90, 0.855), 5.0)

    def test_healthy_canary_promotes(self):
        metrics = {"samples": 100, "baseline_quality": .90, "candidate_quality": .88, "candidate_p95_ms": 1800}
        result = module.canary_gate(metrics, self.policy)
        self.assertEqual(result["decision"], "promote_one_step")

    def test_latency_breach_rolls_back(self):
        metrics = {"samples": 100, "baseline_quality": .90, "candidate_quality": .88, "candidate_p95_ms": 2100}
        self.assertEqual(module.canary_gate(metrics, self.policy)["decision"], "rollback")

    def test_quality_breach_rolls_back(self):
        metrics = {"samples": 100, "baseline_quality": .90, "candidate_quality": .80, "candidate_p95_ms": 1800}
        self.assertEqual(module.canary_gate(metrics, self.policy)["decision"], "rollback")

    def test_insufficient_samples_holds(self):
        metrics = {"samples": 4, "baseline_quality": .90, "candidate_quality": .88, "candidate_p95_ms": 1800}
        self.assertEqual(module.canary_gate(metrics, self.policy)["decision"], "hold")

    def test_missing_telemetry_holds(self):
        self.assertEqual(module.canary_gate({}, self.policy)["decision"], "hold")

    def test_canary_rollback_restores_stable(self):
        healthy = {"samples": 100, "baseline_quality": .90, "candidate_quality": .88, "candidate_p95_ms": 1800}
        bad = dict(healthy, candidate_p95_ms=2400)
        result = module.simulate_canary(self.stable, self.candidate, self.policy, [healthy, bad])
        self.assertEqual(result["status"], "rolled_back")
        self.assertEqual(result["active_release"], "v17")
        self.assertEqual(result["candidate_weight_percent"], 0)

    def test_incomplete_canary_observations_hold(self):
        healthy = {"samples": 100, "baseline_quality": .90, "candidate_quality": .88, "candidate_p95_ms": 1800}
        result = module.simulate_canary(self.stable, self.candidate, self.policy, [healthy])
        self.assertEqual(result["status"], "held")
        self.assertEqual(result["candidate_weight_percent"], 0)
        self.assertEqual(result["active_release"], "v17")

    def test_blue_green_keeps_stable_when_unhealthy(self):
        result = module.blue_green_switch("v17", "v18", False)
        self.assertEqual(result["traffic_target"], "v17")

    def test_blue_green_switches_when_healthy(self):
        result = module.blue_green_switch("v17", "v18", True)
        self.assertEqual(result["traffic_target"], "v18")

    def test_shadow_returns_stable_response_only(self):
        result = module.shadow_result("stable", "candidate")
        self.assertEqual(result["user_response"], "stable")
        self.assertFalse(result["candidate_user_visible"])

    def test_shadow_side_effect_rejected(self):
        with self.assertRaises(ValueError):
            module.shadow_result("stable", "candidate", candidate_side_effects=1)

    def test_ab_assignment_is_stable(self):
        first = module.ab_variant("user-1", "exp")
        for _ in range(10):
            self.assertEqual(module.ab_variant("user-1", "exp"), first)

    def test_invalid_ab_inputs_rejected(self):
        with self.assertRaises(ValueError):
            module.ab_variant("", "exp")

    def test_scenario_fixture_runs(self):
        import json
        scenario = json.loads((ROOT / "rollouts" / "rollout-scenario.json").read_text())
        result = module.run_scenario(scenario)
        self.assertEqual(result["healthy_canary"]["status"], "promoted")
        self.assertEqual(result["injected_regression"]["status"], "rolled_back")


if __name__ == "__main__":
    unittest.main()
