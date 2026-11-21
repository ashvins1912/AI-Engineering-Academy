import importlib.util
from pathlib import Path
import sys
import unittest

path = Path(__file__).parent / "capstone_acceptance.py"
spec = importlib.util.spec_from_file_location("stage11_capstone_acceptance", path)
acceptance = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = acceptance
spec.loader.exec_module(acceptance)

class Stage11FinalAcceptanceTests(unittest.TestCase):
    def test_integrated_capstone_acceptance_passes(self):
        report = acceptance.run_acceptance()
        self.assertEqual(report["result"], "PASS")
        self.assertEqual(report["passed"], report["total"])
        self.assertEqual(report["total"], 10)

    def test_security_and_delivery_gates_are_visible(self):
        checks = acceptance.run_acceptance()["checks"]
        for key in ("architecture_gate", "tenant_scoped_citations", "untrusted_retrieval_has_no_tool_authority",
                    "idempotent_retry", "failed_canary_rolls_back"):
            self.assertTrue(checks[key], key)

if __name__ == "__main__":
    unittest.main()
