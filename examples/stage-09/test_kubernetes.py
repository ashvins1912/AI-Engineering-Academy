import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).parent
sys.path.insert(0, str(ROOT / "kubernetes"))
from simulator import Workload, evaluate, schedule, startup_ready
from policy import validate


class KubernetesSimulatorTests(unittest.TestCase):
    def test_two_replicas_fit_on_sixteen_gib_node(self):
        result = schedule(2, 6, 16)
        self.assertEqual((result["scheduled"], result["pending"]), (2, 0))

    def test_third_replica_remains_pending(self):
        result = schedule(3, 6, 16)
        self.assertEqual((result["scheduled"], result["pending"]), (2, 1))
        self.assertEqual(result["reason"], "Insufficient memory")

    def test_startup_probe_budget_is_separate_from_placement(self):
        self.assertTrue(startup_ready(75, 120))
        self.assertFalse(startup_ready(130, 120))
        result = evaluate(Workload(2, 6, 16, 130, 120))
        self.assertEqual(result["scheduled"], 2)
        self.assertEqual(result["ready"], 0)

    def test_concurrency_can_exceed_memory_limit(self):
        result = evaluate(Workload(1, 6, 8, 60, 120, 8, 0.7, 4))
        self.assertFalse(result["memory_limit_ok"])
        self.assertEqual(result["ready"], 0)

    def test_invalid_scheduling_inputs_rejected(self):
        for args in [(-1, 6, 16), (1, 0, 16), (1, 6, -1), (True, 6, 16)]:
            with self.assertRaises(ValueError):
                schedule(*args)

    def test_safe_policy_passes(self):
        self.assertEqual(validate(self.safe_config()), [])

    def test_policy_rejects_mutable_image_and_privileged_container(self):
        config = self.safe_config()
        config["image"] = "registry.example.com/inference:latest"
        config["run_as_non_root"] = False
        config["allow_privilege_escalation"] = True
        config["dropped_capabilities"] = []
        errors = validate(config)
        self.assertTrue(any("sha256" in error for error in errors))
        self.assertTrue(any("non-root" in error for error in errors))
        self.assertTrue(any("privilege escalation" in error for error in errors))
        self.assertTrue(any("capabilities" in error for error in errors))

    def test_policy_rejects_short_startup_and_invalid_hpa(self):
        config = self.safe_config()
        config["startup_budget_seconds"] = 30
        config["hpa_min"] = 5
        config["hpa_max"] = 2
        errors = validate(config)
        self.assertTrue(any("startup" in error for error in errors))
        self.assertTrue(any("HPA bounds" in error for error in errors))

    def test_gpu_requires_selector_and_device_plugin(self):
        config = self.safe_config()
        config["gpu_count"] = 1
        errors = validate(config)
        self.assertTrue(any("node selector" in error for error in errors))
        self.assertTrue(any("device plugin" in error for error in errors))

    def test_manifests_keep_probe_and_security_contracts(self):
        deploy = (ROOT / "kubernetes" / "deployment.yaml").read_text()
        self.assertIn("startupProbe:", deploy)
        self.assertIn("readinessProbe:", deploy)
        self.assertIn("livenessProbe:", deploy)
        self.assertIn("runAsNonRoot: true", deploy)
        self.assertIn("readOnlyRootFilesystem: true", deploy)
        self.assertIn("image: registry.example.com/inference@sha256:", deploy)

    def test_hpa_is_bounded_and_network_policy_is_explicit(self):
        hpa = (ROOT / "kubernetes" / "hpa.yaml").read_text()
        policy = (ROOT / "kubernetes" / "network-policy.yaml").read_text()
        self.assertIn("minReplicas: 2", hpa)
        self.assertIn("maxReplicas: 6", hpa)
        self.assertIn("policyTypes:", policy)
        self.assertIn("Egress", policy)

    @staticmethod
    def safe_config():
        return {
            "image": "registry.example.com/inference@sha256:" + "a" * 64,
            "replicas": 2, "memory_request_gib": 6, "memory_limit_gib": 8,
            "startup_budget_seconds": 120, "model_startup_p95_seconds": 75,
            "run_as_non_root": True, "read_only_root_filesystem": True,
            "allow_privilege_escalation": False, "dropped_capabilities": ["ALL"],
            "service_account": "inference-runtime",
            "automount_service_account_token": False,
            "hpa_min": 2, "hpa_max": 6, "metrics_available": True,
            "gpu_count": 0, "gpu_node_selector": None, "device_plugin_ready": False,
        }


if __name__ == "__main__":
    unittest.main()
