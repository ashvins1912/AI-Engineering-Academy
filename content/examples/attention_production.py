"""Production-shaped scaled dot-product attention with strict input checks.

This dependency-free reference keeps the numerical core inspectable. A real
model service would additionally batch requests and use an optimized tensor
backend such as PyTorch or JAX.
"""
from __future__ import annotations

import math
from collections.abc import Sequence


def scaled_dot_product_attention(
    query: Sequence[float],
    keys: Sequence[Sequence[float]],
    values: Sequence[Sequence[float]],
    *,
    temperature: float = 1.0,
) -> tuple[list[float], list[float]]:
    if not query or not keys or not values or len(keys) != len(values):
        raise ValueError("query, keys and values must be non-empty and aligned")
    if temperature <= 0 or not math.isfinite(temperature):
        raise ValueError("temperature must be finite and positive")
    dimension = len(query)
    if any(len(key) != dimension for key in keys):
        raise ValueError("all key vectors must match the query dimension")
    value_dimension = len(values[0])
    if value_dimension == 0 or any(len(value) != value_dimension for value in values):
        raise ValueError("value vectors must have a consistent non-zero dimension")
    if not all(math.isfinite(float(item)) for vector in [query, *keys, *values] for item in vector):
        raise ValueError("all vector values must be finite")

    scale = math.sqrt(dimension) * temperature
    scores = [sum(float(q) * float(k) for q, k in zip(query, key)) / scale for key in keys]
    peak = max(scores)
    exp_scores = [math.exp(score - peak) for score in scores]
    denominator = sum(exp_scores)
    weights = [score / denominator for score in exp_scores]
    output = [
        sum(weights[index] * float(values[index][column]) for index in range(len(values)))
        for column in range(value_dimension)
    ]
    return weights, output


if __name__ == "__main__":
    weights, output = scaled_dot_product_attention(
        [1, 0], [[1, 0], [0, 1]], [[2, 0], [0, 4]]
    )
    print({"weights": weights, "output": output})
