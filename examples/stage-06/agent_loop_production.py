"""Production-shaped async agent loop with bounded, allow-listed tool execution.

The decision provider is injected. This keeps the orchestration testable and
keeps model credentials/network access outside the lesson's core exercise.
"""
from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any

Tool = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]
DecisionProvider = Callable[[list[dict[str, Any]]], Awaitable[dict[str, Any]]]


async def run_agent(
    request: str,
    decide: DecisionProvider,
    tools: dict[str, Tool],
    *,
    max_steps: int = 6,
    max_tool_calls: int = 3,
    tool_timeout_seconds: float = 2.0,
) -> dict[str, Any]:
    if not request.strip():
        raise ValueError("request must not be empty")
    if max_steps < 1 or max_tool_calls < 0 or tool_timeout_seconds <= 0:
        raise ValueError("execution limits must be positive")

    messages: list[dict[str, Any]] = [{"role": "user", "content": request}]
    trace: list[dict[str, Any]] = []
    tool_calls = 0

    for step in range(1, max_steps + 1):
        decision = await decide(messages)
        if decision.get("type") == "final":
            answer = decision.get("answer")
            if not isinstance(answer, str) or not answer.strip():
                raise ValueError("final answer must be non-empty text")
            return {"status": "completed", "answer": answer, "trace": trace}

        if decision.get("type") != "tool":
            raise ValueError("planner returned an unsupported action")
        name = decision.get("name")
        arguments = decision.get("arguments")
        if not isinstance(name, str) or name not in tools:
            raise PermissionError("tool is not allow-listed")
        if not isinstance(arguments, dict):
            raise ValueError("tool arguments must be an object")
        if tool_calls >= max_tool_calls:
            return {"status": "tool_budget_exhausted", "answer": None, "trace": trace}

        # A timeout bounds waiting; the tool itself must still enforce its own
        # authorization and idempotency before performing side effects.
        observation = await asyncio.wait_for(
            tools[name](arguments), timeout=tool_timeout_seconds
        )
        tool_calls += 1
        trace.append({"step": step, "tool": name, "arguments": arguments, "observation": observation})
        messages.append({"role": "tool", "name": name, "content": observation})

    return {"status": "step_limit", "answer": None, "trace": trace}
