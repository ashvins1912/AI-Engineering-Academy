"""Additional from-scratch Stage 2 algorithms: linear SVM, AdaBoost, DBSCAN and evaluation."""
from __future__ import annotations

import math
import random
from typing import Sequence


def _validate_matrix(X: Sequence[Sequence[float]], y: Sequence[int] | None = None) -> int:
    if not X:
        raise ValueError("features must be non-empty")
    width = len(X[0])
    if width == 0 or any(len(row) != width for row in X):
        raise ValueError("features must have equal non-zero dimensions")
    if any(not math.isfinite(float(value)) for row in X for value in row):
        raise ValueError("features must be finite")
    if y is not None and len(X) != len(y):
        raise ValueError("features and labels must be aligned")
    return width


def fit_linear_svm(
    X: Sequence[Sequence[float]],
    y: Sequence[int],
    learning_rate: float = 0.05,
    regularization: float = 0.01,
    epochs: int = 1000,
) -> dict[str, object]:
    """Fit a deterministic primal linear SVM with full-batch hinge-loss subgradients."""
    dims = _validate_matrix(X, y)
    if set(y) != {0, 1}:
        raise ValueError("linear SVM requires both binary classes encoded as 0 and 1")
    if learning_rate <= 0 or not math.isfinite(learning_rate):
        raise ValueError("learning_rate must be finite and positive")
    if regularization <= 0 or not math.isfinite(regularization):
        raise ValueError("regularization must be finite and positive")
    if epochs < 1:
        raise ValueError("epochs must be positive")
    labels = [1.0 if label == 1 else -1.0 for label in y]
    weights = [0.0] * dims
    bias = 0.0
    history: list[float] = []
    for _ in range(epochs):
        margins = [label * (sum(w * x for w, x in zip(weights, row)) + bias) for row, label in zip(X, labels)]
        loss = 0.5 * regularization * sum(w * w for w in weights) + sum(max(0.0, 1.0 - margin) for margin in margins) / len(X)
        history.append(loss)
        grad_w = [regularization * w for w in weights]
        grad_b = 0.0
        for row, label, margin in zip(X, labels, margins):
            if margin < 1.0:
                for j, value in enumerate(row):
                    grad_w[j] -= label * value / len(X)
                grad_b -= label / len(X)
        weights = [w - learning_rate * g for w, g in zip(weights, grad_w)]
        bias -= learning_rate * grad_b
    margins = [label * (sum(w * x for w, x in zip(weights, row)) + bias) for row, label in zip(X, labels)]
    return {
        "weights": weights,
        "bias": bias,
        "support_vector_indices": [i for i, margin in enumerate(margins) if margin <= 1.0 + 1e-9],
        "hinge_loss": sum(max(0.0, 1.0 - margin) for margin in margins) / len(X),
        "objective_history": history,
    }


def predict_linear_svm(model: dict[str, object], X: Sequence[Sequence[float]]) -> list[int]:
    weights = model.get("weights")
    if not isinstance(weights, list) or not weights:
        raise ValueError("model must contain fitted weights")
    _validate_matrix(X)
    if any(len(row) != len(weights) for row in X):
        raise ValueError("feature dimensions do not match fitted model")
    bias = float(model["bias"])
    return [int(sum(float(w) * float(v) for w, v in zip(weights, row)) + bias >= 0.0) for row in X]


def fit_adaboost_stumps(
    X: Sequence[Sequence[float]],
    y: Sequence[int],
    n_estimators: int = 10,
) -> dict[str, object]:
    """AdaBoost.M1 using decision stumps over numeric features and deterministic ties."""
    dims = _validate_matrix(X, y)
    if set(y) != {0, 1}:
        raise ValueError("AdaBoost requires both binary classes encoded as 0 and 1")
    if n_estimators < 1:
        raise ValueError("n_estimators must be positive")
    signed = [1 if label == 1 else -1 for label in y]
    sample_weights = [1.0 / len(X)] * len(X)
    learners: list[dict[str, float | int]] = []
    for _ in range(n_estimators):
        best: tuple[float, int, float, int, list[int]] | None = None
        for feature in range(dims):
            values = sorted(set(float(row[feature]) for row in X))
            thresholds = [values[0] - 1.0] + [(a + b) / 2 for a, b in zip(values, values[1:])] + [values[-1] + 1.0]
            for threshold in thresholds:
                for polarity in (1, -1):
                    pred = [1 if (float(row[feature]) <= threshold) == (polarity == 1) else -1 for row in X]
                    error = sum(weight for weight, actual, guess in zip(sample_weights, signed, pred) if actual != guess)
                    candidate = (error, feature, threshold, polarity, pred)
                    if best is None or candidate[:4] < best[:4]:
                        best = candidate
        assert best is not None
        error, feature, threshold, polarity, predictions = best
        if error >= 0.5 - 1e-12:
            break
        clipped = max(error, 1e-12)
        alpha = 0.5 * math.log((1.0 - clipped) / clipped)
        learners.append({"feature": feature, "threshold": threshold, "polarity": polarity, "alpha": alpha, "weighted_error": error})
        sample_weights = [weight * math.exp(-alpha * actual * guess) for weight, actual, guess in zip(sample_weights, signed, predictions)]
        total = sum(sample_weights)
        sample_weights = [weight / total for weight in sample_weights]
        if error <= 1e-12:
            break
    if not learners:
        raise ValueError("no weak learner achieved weighted error below 0.5")
    return {"learners": learners, "training_error": sum(a != b for a, b in zip(y, predict_adaboost_stumps({"learners": learners}, X))) / len(y)}


def predict_adaboost_stumps(model: dict[str, object], X: Sequence[Sequence[float]]) -> list[int]:
    learners = model.get("learners")
    if not isinstance(learners, list) or not learners:
        raise ValueError("model must contain at least one fitted stump")
    _validate_matrix(X)
    output = []
    for row in X:
        score = 0.0
        for learner in learners:
            feature = int(learner["feature"])
            if feature >= len(row):
                raise ValueError("feature dimensions do not match fitted model")
            polarity = int(learner["polarity"])
            prediction = 1 if (float(row[feature]) <= float(learner["threshold"])) == (polarity == 1) else -1
            score += float(learner["alpha"]) * prediction
        output.append(int(score >= 0.0))
    return output


def dbscan(
    points: Sequence[Sequence[float]],
    eps: float,
    min_samples: int,
) -> list[int]:
    """DBSCAN labels; -1 denotes noise. min_samples includes the point itself."""
    dims = _validate_matrix(points)
    if eps <= 0 or not math.isfinite(eps):
        raise ValueError("eps must be finite and positive")
    if min_samples < 1:
        raise ValueError("min_samples must be positive")
    neighbors = [
        [j for j, other in enumerate(points) if math.dist(point, other) <= eps]
        for point in points
    ]
    labels = [-2] * len(points)  # unvisited
    cluster_id = 0
    for index in range(len(points)):
        if labels[index] != -2:
            continue
        if len(neighbors[index]) < min_samples:
            labels[index] = -1
            continue
        labels[index] = cluster_id
        queue = list(neighbors[index])
        queued = set(queue)
        cursor = 0
        while cursor < len(queue):
            candidate = queue[cursor]
            cursor += 1
            if labels[candidate] == -1:
                labels[candidate] = cluster_id
            if labels[candidate] != -2:
                continue
            labels[candidate] = cluster_id
            if len(neighbors[candidate]) >= min_samples:
                for neighbor in neighbors[candidate]:
                    if neighbor not in queued:
                        queue.append(neighbor)
                        queued.add(neighbor)
        cluster_id += 1
    return labels


def precision_recall_curve(scores: Sequence[float], labels: Sequence[int]) -> list[dict[str, float]]:
    if not scores or len(scores) != len(labels) or set(labels) != {0, 1}:
        raise ValueError("precision-recall curve needs aligned scores and both binary classes")
    if any(not math.isfinite(float(score)) for score in scores):
        raise ValueError("scores must be finite")
    thresholds = sorted(set(float(score) for score in scores), reverse=True)
    curve = [{"threshold": math.inf, "precision": 1.0, "recall": 0.0}]
    positives = sum(labels)
    for threshold in thresholds:
        tp = sum(1 for score, label in zip(scores, labels) if score >= threshold and label == 1)
        fp = sum(1 for score, label in zip(scores, labels) if score >= threshold and label == 0)
        curve.append({"threshold": threshold, "precision": tp / (tp + fp) if tp + fp else 1.0, "recall": tp / positives})
    return curve


def average_precision(scores: Sequence[float], labels: Sequence[int]) -> float:
    curve = precision_recall_curve(scores, labels)
    return sum(
        max(0.0, curve[i]["recall"] - curve[i - 1]["recall"]) * curve[i]["precision"]
        for i in range(1, len(curve))
    )


def brier_score(probabilities: Sequence[float], labels: Sequence[int]) -> float:
    if not probabilities or len(probabilities) != len(labels):
        raise ValueError("probabilities and labels must be non-empty and aligned")
    if any(label not in (0, 1) for label in labels):
        raise ValueError("labels must be binary")
    if any(not math.isfinite(float(p)) or p < 0 or p > 1 for p in probabilities):
        raise ValueError("probabilities must be finite and in [0, 1]")
    return sum((p - y) ** 2 for p, y in zip(probabilities, labels)) / len(labels)
