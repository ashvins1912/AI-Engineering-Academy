import json
import unittest
from pathlib import Path

from agent_loop import run_agent

FIXTURE = json.loads((Path(__file__).parent / 'fixtures' / 'agent-loop.json').read_text(encoding='utf-8'))


class AgentLoopTests(unittest.TestCase):
    def test_agent_observes_then_acts_then_finishes(self):
        result = run_agent(FIXTURE["sku"], FIXTURE["discountRate"], FIXTURE["maxSteps"])
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["result"]["final_price"], FIXTURE["expectedFinalPrice"])
        self.assertEqual([step["action"] for step in result["trace"]],
                         ["catalog_search", "apply_discount"])

    def test_step_limit_stops_before_unbounded_execution(self):
        result = run_agent("MUG-1", max_steps=1)
        self.assertEqual(result["status"], "step_limit")
        self.assertIsNone(result["result"])

    def test_invalid_discount_is_rejected(self):
        with self.assertRaises(ValueError):
            run_agent("MUG-1", discount_rate=1.5)

    def test_unknown_sku_fails_closed(self):
        with self.assertRaises(LookupError):
            run_agent("UNKNOWN")


if __name__ == "__main__":
    unittest.main()
