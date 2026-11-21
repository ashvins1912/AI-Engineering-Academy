"""Offline AI cost and budget simulator using Decimal arithmetic."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from hashlib import sha256
import json


MILLION = Decimal("1000000")


@dataclass(frozen=True)
class Pricing:
    input_per_million: Decimal
    output_per_million: Decimal
    embedding_per_million: Decimal
    rerank_per_1000: Decimal


@dataclass(frozen=True)
class AttemptUsage:
    input_tokens: int = 0
    output_tokens: int = 0
    embedding_tokens: int = 0
    rerank_calls: int = 0
    tool_cost: Decimal = Decimal("0")
    success: bool = False
    cache_hit: bool = False


@dataclass(frozen=True)
class Task:
    task_id: str
    tenant_id: str
    attempts: tuple[AttemptUsage, ...]
    success: bool


def _nonnegative(value: int | Decimal, name: str) -> None:
    if value < 0:
        raise ValueError(f"INVALID_{name.upper()}")


def cost_attempt(usage: AttemptUsage, pricing: Pricing) -> dict:
    for name, value in (
        ("input_tokens", usage.input_tokens),
        ("output_tokens", usage.output_tokens),
        ("embedding_tokens", usage.embedding_tokens),
        ("rerank_calls", usage.rerank_calls),
        ("tool_cost", usage.tool_cost),
    ):
        _nonnegative(value, name)
    if usage.cache_hit:
        return {"input": Decimal("0"), "output": Decimal("0"), "embedding": Decimal("0"), "rerank": Decimal("0"), "tools": usage.tool_cost, "total": usage.tool_cost}
    input_cost = Decimal(usage.input_tokens) * pricing.input_per_million / MILLION
    output_cost = Decimal(usage.output_tokens) * pricing.output_per_million / MILLION
    embedding_cost = Decimal(usage.embedding_tokens) * pricing.embedding_per_million / MILLION
    rerank_cost = Decimal(usage.rerank_calls) * pricing.rerank_per_1000 / Decimal("1000")
    total = input_cost + output_cost + embedding_cost + rerank_cost + usage.tool_cost
    return {"input": input_cost, "output": output_cost, "embedding": embedding_cost, "rerank": rerank_cost, "tools": usage.tool_cost, "total": total}


def cost_per_successful_task(tasks: list[Task], pricing: Pricing) -> Decimal | None:
    total = sum(
        (cost_attempt(attempt, pricing)["total"] for task in tasks for attempt in task.attempts),
        Decimal("0"),
    )
    successful = sum(1 for task in tasks if task.success)
    return total / successful if successful else None


def estimate_daily_spend(requests_per_day: int, average_cost_per_request: Decimal) -> Decimal:
    if requests_per_day < 0 or average_cost_per_request < 0:
        raise ValueError("INVALID_FORECAST_INPUT")
    return Decimal(requests_per_day) * average_cost_per_request


def cache_key(tenant_id: str, acl_scope: str, model_version: str, prompt_version: str, index_version: str, normalized_query: str) -> str:
    values = (tenant_id, acl_scope, model_version, prompt_version, index_version, normalized_query)
    if any(not value for value in values):
        raise ValueError("MISSING_CACHE_CONTEXT")
    canonical = json.dumps(values, separators=(",", ":"), ensure_ascii=False)
    return sha256(canonical.encode("utf-8")).hexdigest()


def estimate_cache_savings(uncached_cost: Decimal, cached_cost: Decimal, hits: int) -> Decimal:
    if hits < 0 or uncached_cost < 0 or cached_cost < 0:
        raise ValueError("INVALID_CACHE_SAVINGS_INPUT")
    return Decimal(hits) * max(Decimal("0"), uncached_cost - cached_cost)


def admit_request(estimated_cost: Decimal, remaining_budget: Decimal, input_tokens: int, max_input_tokens: int) -> dict:
    if min(estimated_cost, remaining_budget, input_tokens, max_input_tokens) < 0:
        raise ValueError("INVALID_BUDGET_INPUT")
    if input_tokens > max_input_tokens:
        return {"allowed": False, "reason": "INPUT_TOKEN_LIMIT"}
    if estimated_cost > remaining_budget:
        return {"allowed": False, "reason": "BUDGET_EXCEEDED"}
    return {"allowed": True, "reason": "ADMITTED"}


def select_model(task_complexity: str, budget_remaining: Decimal, quality_qualified: dict[str, bool], estimated_costs: dict[str, Decimal]) -> str | None:
    if task_complexity not in {"simple", "standard", "complex"}:
        raise ValueError("UNKNOWN_TASK_CLASS")
    preferred = {
        "simple": ["small", "standard", "premium"],
        "standard": ["standard", "premium"],
        "complex": ["premium"],
    }[task_complexity]
    for model in preferred:
        if quality_qualified.get(model, False) and estimated_costs.get(model, Decimal("Infinity")) <= budget_remaining:
            return model
    return None


def main() -> None:
    pricing = Pricing(Decimal("2"), Decimal("8"), Decimal("0.10"), Decimal("1"))
    task = Task(
        "task-1", "tenant-A",
        (
            AttemptUsage(2000, 500, 1000, 1, success=False),
            AttemptUsage(2000, 500, success=True),
        ),
        True,
    )
    total = sum((cost_attempt(attempt, pricing)["total"] for attempt in task.attempts), Decimal("0"))
    print("task cost:", total)
    print("cost per successful task:", cost_per_successful_task([task], pricing))
    print("admission:", admit_request(Decimal("0.02"), Decimal("0.01"), 2000, 4000))


if __name__ == "__main__":
    main()
