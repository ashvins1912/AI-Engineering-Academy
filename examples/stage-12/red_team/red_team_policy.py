"""Production-shaped tool enforcement point around red-team policy checks.

Only trusted, application-registered handlers can be invoked. This module
contains no dynamic import, shell execution or network client.
"""
from __future__ import annotations

from typing import Any, Callable

from red_team_engine import Principal, RedTeamPolicy, ToolDecision


class ToolEnforcementPoint:
    def __init__(self, policy: RedTeamPolicy,
                 handlers: dict[tuple[str, str], Callable[[dict[str, Any]], Any]]):
        self.policy = policy
        self.handlers = dict(handlers)

    def execute(self, principal: Principal | None, tool: str, action: str,
                resource_id: str, arguments: dict[str, Any], *,
                approval_id: str | None = None, now: int = 100) -> tuple[ToolDecision, Any]:
        decision = self.policy.authorize_tool(
            principal, tool, action, resource_id, arguments,
            approval_id=approval_id, now=now,
        )
        if not decision.allowed:
            return decision, None
        handler = self.handlers.get((tool, action))
        if handler is None:
            return ToolDecision(False, "NO_TRUSTED_HANDLER_REGISTERED"), None
        # Only a handler registered by application code is called after policy.
        return decision, handler(dict(arguments))
