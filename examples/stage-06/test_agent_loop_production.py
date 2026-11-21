import unittest

from agent_loop_production import run_agent


class ProductionAgentLoopTests(unittest.IsolatedAsyncioTestCase):
    async def test_bounded_tool_loop_and_final_answer(self):
        calls = 0

        async def decide(messages):
            nonlocal calls
            calls += 1
            if calls == 1:
                return {"type": "tool", "name": "catalog", "arguments": {"sku": "MUG-1"}}
            return {"type": "final", "answer": "The discounted price is 72."}

        async def catalog(args):
            self.assertEqual(args["sku"], "MUG-1")
            return {"unit_price": 80}

        result = await run_agent("Find MUG-1 price", decide, {"catalog": catalog})
        self.assertEqual(result["status"], "completed")
        self.assertEqual(len(result["trace"]), 1)

    async def test_unknown_tool_is_denied(self):
        async def decide(messages):
            return {"type": "tool", "name": "delete_all", "arguments": {}}

        with self.assertRaises(PermissionError):
            await run_agent("do something", decide, {})

    async def test_tool_timeout_is_bounded(self):
        async def decide(messages):
            return {"type": "tool", "name": "slow", "arguments": {}}

        async def slow(args):
            import asyncio
            await asyncio.sleep(0.05)
            return {}

        with self.assertRaises(TimeoutError):
            await run_agent("wait", decide, {"slow": slow}, tool_timeout_seconds=0.001)

    async def test_tool_budget_stops_further_calls(self):
        async def decide(messages):
            return {"type": "tool", "name": "read", "arguments": {}}

        async def read(args):
            return {"ok": True}

        result = await run_agent("read", decide, {"read": read}, max_tool_calls=0)
        self.assertEqual(result["status"], "tool_budget_exhausted")


if __name__ == "__main__":
    unittest.main()
