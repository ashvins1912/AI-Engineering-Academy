"""Explicit multilayer backpropagation, recurrent BPTT and regularization references."""
from __future__ import annotations

import math
from typing import Sequence


def _sigmoid(value: float) -> float:
    if value >= 0:
        return 1.0 / (1.0 + math.exp(-min(value, 709)))
    exp_value = math.exp(max(value, -709))
    return exp_value / (1.0 + exp_value)


def mlp_forward(
    x: Sequence[float],
    parameters: dict[str, object],
) -> dict[str, object]:
    """Forward pass for a 2-input, 2-hidden-unit sigmoid binary classifier."""
    w1, b1, w2, b2 = parameters["w1"], parameters["b1"], parameters["w2"], float(parameters["b2"])
    if len(x) != 2 or len(w1) != 2 or len(b1) != 2 or len(w2) != 2:
        raise ValueError("MLP expects 2 inputs and 2 hidden units")
    if any(len(row) != 2 for row in w1):
        raise ValueError("w1 must have shape (2, 2)")
    if any(not math.isfinite(float(v)) for v in [*x, *b1, *w2, b2, *[v for row in w1 for v in row]]):
        raise ValueError("MLP inputs and parameters must be finite")
    z1 = [sum(float(w1[j][k]) * float(x[k]) for k in range(2)) + float(b1[j]) for j in range(2)]
    hidden = [_sigmoid(value) for value in z1]
    logit = sum(float(w2[j]) * hidden[j] for j in range(2)) + b2
    return {"z1": z1, "hidden": hidden, "logit": logit, "output": _sigmoid(logit)}


def mlp_binary_loss_gradients(
    x: Sequence[float],
    target: int,
    parameters: dict[str, object],
) -> dict[str, object]:
    """Binary-cross-entropy gradients for every weight and bias in the small MLP."""
    if target not in (0, 1):
        raise ValueError("target must be binary")
    trace = mlp_forward(x, parameters)
    output = float(trace["output"])
    hidden = trace["hidden"]
    loss = -(target * math.log(max(output, 1e-12)) + (1 - target) * math.log(max(1 - output, 1e-12)))
    delta_out = output - target  # sigmoid + BCE simplifies to p-y
    w2 = parameters["w2"]
    delta_hidden = [delta_out * float(w2[j]) * float(hidden[j]) * (1 - float(hidden[j])) for j in range(2)]
    gradients = {
        "w1": [[delta_hidden[j] * float(x[k]) for k in range(2)] for j in range(2)],
        "b1": delta_hidden,
        "w2": [delta_out * float(hidden[j]) for j in range(2)],
        "b2": delta_out,
    }
    return {"loss": loss, "output": output, "hidden": hidden, "gradients": gradients}


def rnn_bptt_gradients(
    inputs: Sequence[float],
    target: float,
    w_x: float,
    w_h: float,
    bias: float = 0.0,
    h0: float = 0.0,
) -> dict[str, object]:
    """Backpropagate a final-state squared loss through a scalar tanh RNN."""
    if not inputs:
        raise ValueError("sequence must be non-empty")
    if any(not math.isfinite(float(v)) for v in [*inputs, target, w_x, w_h, bias, h0]):
        raise ValueError("sequence and parameters must be finite")
    states: list[float] = []
    previous = h0
    for value in inputs:
        previous = math.tanh(w_x * value + w_h * previous + bias)
        states.append(previous)
    loss = 0.5 * (states[-1] - target) ** 2
    delta = states[-1] - target
    grad_wx = grad_wh = grad_bias = 0.0
    for index in range(len(inputs) - 1, -1, -1):
        current = states[index]
        previous_state = h0 if index == 0 else states[index - 1]
        local = delta * (1.0 - current * current)
        grad_wx += local * inputs[index]
        grad_wh += local * previous_state
        grad_bias += local
        delta = local * w_h
    return {
        "states": states,
        "loss": loss,
        "grad_wx": grad_wx,
        "grad_wh": grad_wh,
        "grad_bias": grad_bias,
    }


def regularization_penalty(
    weights: Sequence[float] | Sequence[Sequence[float]],
    l1: float = 0.0,
    l2: float = 0.0,
) -> dict[str, float]:
    """Return L1 and L2 objective contributions; biases should be excluded by caller."""
    if l1 < 0 or l2 < 0 or not math.isfinite(l1) or not math.isfinite(l2):
        raise ValueError("regularization coefficients must be finite and non-negative")
    flat = [float(value) for row in weights for value in row] if weights and isinstance(weights[0], (list, tuple)) else [float(value) for value in weights]
    if any(not math.isfinite(value) for value in flat):
        raise ValueError("weights must be finite")
    l1_loss = l1 * sum(abs(value) for value in flat)
    l2_loss = 0.5 * l2 * sum(value * value for value in flat)
    return {"l1": l1_loss, "l2": l2_loss, "total": l1_loss + l2_loss}
