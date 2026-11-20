"""Stage 01 reference implementations: math, Python and data foundations.

Run: python examples/stage-01/foundations.py <topic>
Core implementation is standard-library-only. NumPy/Pandas are optional comparisons.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import random
import statistics
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable, Sequence


def dot(a: Sequence[float], b: Sequence[float]) -> float:
    if len(a) != len(b):
        raise ValueError(f"dot product dimension mismatch: {len(a)} != {len(b)}")
    return sum(x * y for x, y in zip(a, b))


def matmul(a: Sequence[Sequence[float]], b: Sequence[Sequence[float]]) -> list[list[float]]:
    if not a or not b or not a[0] or not b[0]:
        raise ValueError("matrices must be non-empty")
    if any(len(row) != len(a[0]) for row in a) or any(len(row) != len(b[0]) for row in b):
        raise ValueError("ragged matrices are not supported")
    if len(a[0]) != len(b):
        raise ValueError(f"matrix dimensions do not align: {len(a[0])} != {len(b)}")
    bt = list(zip(*b))
    return [[dot(row, col) for col in bt] for row in a]


def bayes_posterior(prior: float, likelihood: float, false_positive_rate: float) -> float:
    values = (prior, likelihood, false_positive_rate)
    if any(not 0 <= value <= 1 for value in values):
        raise ValueError("probabilities must be in [0, 1]")
    evidence = likelihood * prior + false_positive_rate * (1 - prior)
    if evidence == 0:
        raise ValueError("posterior is undefined because evidence probability is zero")
    return likelihood * prior / evidence


def simulate_conditional_probability(trials: int, seed: int = 7) -> tuple[int, int, float]:
    if trials <= 0:
        raise ValueError("trials must be positive")
    rng = random.Random(seed)
    observed_b = 0
    observed_a_and_b = 0
    for _ in range(trials):
        a = rng.random() < 0.2
        b = rng.random() < (0.8 if a else 0.1)
        if b:
            observed_b += 1
            observed_a_and_b += int(a)
    if observed_b == 0:
        raise ValueError("no B observations; conditional estimate is undefined")
    return observed_a_and_b, observed_b, observed_a_and_b / observed_b


def derivative_analytic(w: float) -> float:
    return 2 * (w - 3)


def derivative_forward(fn, x: float, epsilon: float = 1e-5) -> float:
    if epsilon <= 0:
        raise ValueError("epsilon must be positive")
    return (fn(x + epsilon) - fn(x)) / epsilon


def derivative_central(fn, x: float, epsilon: float = 1e-5) -> float:
    if epsilon <= 0:
        raise ValueError("epsilon must be positive")
    return (fn(x + epsilon) - fn(x - epsilon)) / (2 * epsilon)


def quadratic_loss(w: float) -> float:
    return (w - 3) ** 2


@dataclass
class OptimizationStep:
    iteration: int
    weight: float
    loss: float
    gradient: float
    gradient_norm: float


@dataclass
class OptimizationResult:
    weight: float
    loss: float
    steps: list[OptimizationStep]
    stop_reason: str


def gradient_descent_linear(
    x: Sequence[float], y: Sequence[float], learning_rate: float = 0.1,
    max_steps: int = 500, tolerance: float = 1e-8,
) -> OptimizationResult:
    if not x or len(x) != len(y):
        raise ValueError("x and y must be non-empty and have equal lengths")
    if learning_rate <= 0 or not math.isfinite(learning_rate):
        raise ValueError("learning_rate must be finite and positive")
    if max_steps <= 0 or tolerance < 0:
        raise ValueError("max_steps must be positive and tolerance non-negative")
    if any(not math.isfinite(v) for v in [*x, *y]):
        raise ValueError("training values must be finite")
    weight = 0.0
    steps: list[OptimizationStep] = []
    reason = "max_steps"
    for iteration in range(1, max_steps + 1):
        errors = [weight * xi - yi for xi, yi in zip(x, y)]
        loss = sum(error * error for error in errors) / len(errors)
        gradient = sum(2 * xi * error for xi, error in zip(x, errors)) / len(x)
        norm = abs(gradient)
        if not math.isfinite(loss) or not math.isfinite(gradient):
            reason = "non_finite"
            break
        steps.append(OptimizationStep(iteration, weight, loss, gradient, norm))
        if norm <= tolerance:
            reason = "gradient_tolerance"
            break
        candidate = weight - learning_rate * gradient
        candidate_loss = sum((candidate * xi - yi) ** 2 for xi, yi in zip(x, y)) / len(x)
        if not math.isfinite(candidate_loss) or candidate_loss > loss * 1e6:
            reason = "diverged"
            break
        weight = candidate
    final_loss = sum((weight * xi - yi) ** 2 for xi, yi in zip(x, y)) / len(x)
    return OptimizationResult(weight, final_loss, steps, reason)


@dataclass
class RowError:
    line: int
    field: str
    message: str


@dataclass
class IngestionResult:
    valid_rows: list[dict[str, object]]
    errors: list[RowError]
    duplicates: list[RowError]


def validate_csv(path: Path) -> IngestionResult:
    required = {"id", "value"}
    valid: list[dict[str, object]] = []
    errors: list[RowError] = []
    duplicates: list[RowError] = []
    seen: set[str] = set()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise ValueError("CSV is empty or has no header")
        missing = required - set(reader.fieldnames)
        if missing:
            raise ValueError(f"missing required columns: {', '.join(sorted(missing))}")
        for line, row in enumerate(reader, start=2):
            identifier = (row.get("id") or "").strip()
            raw_value = (row.get("value") or "").strip()
            row_errors = False
            if not identifier:
                errors.append(RowError(line, "id", "required value is missing"))
                row_errors = True
            if not raw_value:
                errors.append(RowError(line, "value", "required value is missing"))
                row_errors = True
            else:
                try:
                    value = float(raw_value)
                    if not math.isfinite(value):
                        raise ValueError("must be finite")
                except ValueError as exc:
                    errors.append(RowError(line, "value", str(exc)))
                    row_errors = True
            if identifier and identifier in seen:
                duplicates.append(RowError(line, "id", f"duplicate identifier: {identifier}"))
                row_errors = True
            if identifier:
                seen.add(identifier)
            if not row_errors:
                valid.append({"id": identifier, "value": value})
    return IngestionResult(valid, errors, duplicates)


def vectorized_reference() -> dict[str, float]:
    rows = [("A", 10, True), ("A", 20, False), ("B", 5, True)]
    totals: dict[str, float] = {}
    for team, score, active in rows:
        if active:
            totals[team] = totals.get(team, 0) + score
    return totals


def optional_numpy_pandas_check() -> dict[str, object]:
    expected = vectorized_reference()
    try:
        import numpy as np
        import pandas as pd
    except ImportError:
        return {"available": False, "expected": expected, "message": "Install numpy and pandas for parity comparison."}
    frame = pd.DataFrame({"team": ["A", "A", "B"], "score": np.array([10, 20, 5]), "active": [True, False, True]})
    actual = frame.loc[frame["active"]].groupby("team", sort=True)["score"].sum().to_dict()
    if actual != expected:
        raise AssertionError(f"vectorized result {actual} != reference {expected}")
    return {"available": True, "expected": expected, "actual": actual}


def leakage_demo() -> dict[str, float]:
    train = [0.0, 2.0, 4.0]
    validation = [1000.0]
    train_mean = statistics.mean(train)
    global_mean = statistics.mean(train + validation)
    return {"train_only_mean": train_mean, "leaky_global_mean": global_mean}


def split_by_entity(records: Iterable[dict[str, object]], validation_entities: set[str]) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    train_rows, validation_rows = [], []
    for row in records:
        entity = str(row["entity"])
        (validation_rows if entity in validation_entities else train_rows).append(row)
    train_entities = {str(row["entity"]) for row in train_rows}
    validation_seen = {str(row["entity"]) for row in validation_rows}
    if train_entities & validation_seen:
        raise AssertionError("entity leakage across split")
    return train_rows, validation_rows


def run(topic: str, args: argparse.Namespace) -> int:
    if topic == "vectors":
        a, x = [[1, 2], [3, 4]], [[2], [1]]
        print(json.dumps({"dot": dot([1, 2], [2, 1]), "Ax": matmul(a, x), "A2": matmul(a, a)}))
    elif topic == "probability":
        posterior = bayes_posterior(0.2, 0.8, 0.1)
        positive, observed, estimate = simulate_conditional_probability(args.trials, args.seed)
        print(json.dumps({"theoretical_posterior": posterior, "simulated": estimate, "positive_and_B": positive, "B_count": observed, "trials": args.trials}))
    elif topic == "calculus":
        fn = quadratic_loss
        print(json.dumps({"analytic": derivative_analytic(1), "forward": derivative_forward(fn, 1), "central": derivative_central(fn, 1)}))
    elif topic == "optimization":
        result = gradient_descent_linear([1, 2, 3], [2, 4, 6], args.learning_rate)
        print(json.dumps({"weight": result.weight, "loss": result.loss, "stop_reason": result.stop_reason, "trace": [asdict(step) for step in result.steps[:10]]}))
    elif topic == "python-core":
        if not args.input:
            raise ValueError("--input is required for python-core")
        result = validate_csv(Path(args.input))
        print(json.dumps({"valid_rows": result.valid_rows, "errors": [asdict(x) for x in result.errors], "duplicates": [asdict(x) for x in result.duplicates]}, ensure_ascii=False))
        return 1 if result.errors or result.duplicates else 0
    elif topic == "numpy-pandas":
        print(json.dumps(optional_numpy_pandas_check()))
    elif topic == "data-quality":
        print(json.dumps({"leakage": leakage_demo(), "split_invariant": "entity-disjoint split required"}))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("topic", choices=["vectors", "probability", "calculus", "optimization", "python-core", "numpy-pandas", "data-quality"])
    parser.add_argument("--trials", type=int, default=100000)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--learning-rate", type=float, default=0.1)
    parser.add_argument("--input", type=Path)
    args = parser.parse_args()
    try:
        return run(args.topic, args)
    except (OSError, ValueError, csv.Error) as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
