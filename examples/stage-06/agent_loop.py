"""Beginner implementation of a bounded tool-using agent loop.

The planner is deterministic on purpose: it makes control flow visible without
requiring an LLM API key. A production planner can replace choose_action().
"""
from dataclasses import dataclass
import json
from pathlib import Path


FIXTURE_PATH = Path(__file__).parent / 'fixtures' / 'agent-loop.json'
FIXTURE = json.loads(FIXTURE_PATH.read_text(encoding='utf-8'))


@dataclass
class Step:
    number: int
    action: str
    observation: dict


def catalog_search(sku: str) -> dict:
    catalog = {FIXTURE["sku"]: {"sku": FIXTURE["sku"], "unit_price": float(FIXTURE["unitPrice"])}}
    if sku not in catalog:
        raise LookupError("SKU not found")
    return catalog[sku]


def apply_discount(amount: float, rate: float) -> dict:
    if amount < 0 or not 0 <= rate <= 1:
        raise ValueError("invalid amount or discount rate")
    return {"final_price": round(amount * (1 - rate), 2)}


def run_agent(sku: str = FIXTURE["sku"], discount_rate: float = FIXTURE["discountRate"], max_steps: int = FIXTURE["maxSteps"]) -> dict:
    if max_steps < 1:
        raise ValueError("max_steps must be positive")
    state = {"sku": sku, "product": None, "discount": None}
    trace = []

    for number in range(1, max_steps + 1):
        # The agent observes its state and chooses the next bounded action.
        if state["product"] is None:
            action = "catalog_search"
            observation = catalog_search(state["sku"])
            state["product"] = observation
        elif state["discount"] is None:
            action = "apply_discount"
            observation = apply_discount(state["product"]["unit_price"], discount_rate)
            state["discount"] = observation
        else:
            return {"status": "completed", "result": state["discount"], "trace": trace}

        trace.append(Step(number, action, observation).__dict__)

    if state["discount"] is not None:
        return {"status": "completed", "result": state["discount"], "trace": trace}
    return {"status": "step_limit", "result": None, "trace": trace}


if __name__ == "__main__":
    print(run_agent("MUG-1"))
