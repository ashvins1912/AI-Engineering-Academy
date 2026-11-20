"""Expanded transformer operations: BPE, RoPE, multi-head attention, blocks and generation."""
from __future__ import annotations

import math
from typing import Mapping, Sequence

from transformers import decode_logits, kv_cache_bytes, layer_norm, softmax


def tokenize_bpe(text: str, merges: Sequence[tuple[str, str]], max_tokens: int | None = None) -> list[str]:
    """Apply an ordered toy BPE merge table to Unicode characters."""
    if max_tokens is not None and max_tokens < 1:
        raise ValueError("max_tokens must be positive")
    symbols = list(text)
    ranks = {pair: rank for rank, pair in enumerate(merges)}
    while len(symbols) > 1:
        candidates = [(ranks[(symbols[i], symbols[i + 1])], i) for i in range(len(symbols) - 1)
                      if (symbols[i], symbols[i + 1]) in ranks]
        if not candidates:
            break
        _, index = min(candidates)
        symbols[index:index + 2] = [symbols[index] + symbols[index + 1]]
    return symbols[:max_tokens] if max_tokens is not None else symbols


def apply_rope(vector: Sequence[float], position: int, base: float = 10000.0) -> list[float]:
    """Apply rotary position embedding to adjacent coordinate pairs."""
    if not vector or len(vector) % 2:
        raise ValueError("RoPE requires a non-empty even-width vector")
    if position < 0 or base <= 1 or not math.isfinite(base):
        raise ValueError("position must be non-negative and base must exceed one")
    width = len(vector)
    result: list[float] = []
    for index in range(0, width, 2):
        pair_index = index // 2
        frequency = base ** (-2 * pair_index / width)
        angle = position * frequency
        cosine, sine = math.cos(angle), math.sin(angle)
        first, second = float(vector[index]), float(vector[index + 1])
        result.extend([first * cosine - second * sine, first * sine + second * cosine])
    return result


def multi_head_attention(
    query: Sequence[Sequence[float]],
    key: Sequence[Sequence[float]],
    value: Sequence[Sequence[float]],
    heads: int,
    causal: bool = False,
) -> dict[str, object]:
    """Multi-head scaled dot-product self/cross attention with explicit per-head weights."""
    if not query or not key or not value or len(key) != len(value):
        raise ValueError("query, key and value sequences must be non-empty and key/value aligned")
    width = len(query[0])
    if width == 0 or any(len(row) != width for row in query) or any(len(row) != width for row in key + value):
        raise ValueError("query, key and value hidden widths must match")
    if heads < 1 or width % heads:
        raise ValueError("hidden width must be divisible by positive head count")
    if causal and len(query) != len(key):
        raise ValueError("causal self-attention requires equal query and key lengths")
    head_width = width // heads
    head_outputs: list[list[list[float]]] = []
    all_weights: list[list[list[float]]] = []
    for head in range(heads):
        start, end = head * head_width, (head + 1) * head_width
        qh = [row[start:end] for row in query]
        kh = [row[start:end] for row in key]
        vh = [row[start:end] for row in value]
        outputs_for_head: list[list[float]] = []
        weights_for_head: list[list[float]] = []
        for q_index, q_row in enumerate(qh):
            allowed = [j for j in range(len(kh)) if not causal or j <= q_index]
            scores = [sum(a * b for a, b in zip(q_row, kh[j])) / math.sqrt(head_width) for j in allowed]
            weights = softmax(scores)
            context = [sum(weights[n] * vh[j][d] for n, j in enumerate(allowed)) for d in range(head_width)]
            full_weights = [0.0] * len(kh)
            for n, j in enumerate(allowed):
                full_weights[j] = weights[n]
            outputs_for_head.append(context)
            weights_for_head.append(full_weights)
        head_outputs.append(outputs_for_head)
        all_weights.append(weights_for_head)
    merged = [
        [head_outputs[h][i][d] for h in range(heads) for d in range(head_width)]
        for i in range(len(query))
    ]
    return {"output": merged, "weights": all_weights}


def transformer_block(
    sequence: Sequence[Sequence[float]],
    heads: int,
    w1: Sequence[Sequence[float]],
    b1: Sequence[float],
    w2: Sequence[Sequence[float]],
    b2: Sequence[float],
    causal: bool = True,
) -> dict[str, object]:
    """Pre-LN attention + residual + ReLU MLP + residual, with explicit tensor shapes."""
    if not sequence:
        raise ValueError("sequence must be non-empty")
    width = len(sequence[0])
    if any(len(row) != width for row in sequence):
        raise ValueError("sequence rows must have equal hidden width")
    if len(w1) != len(b1) or any(len(row) != width for row in w1):
        raise ValueError("feed-forward input projection shape mismatch")
    hidden_width = len(w1)
    if len(w2) != width or any(len(row) != hidden_width for row in w2) or len(b2) != width:
        raise ValueError("feed-forward output projection shape mismatch")
    attention = multi_head_attention(sequence, sequence, sequence, heads, causal)
    residual1 = [layer_norm([a + b for a, b in zip(row, attn)]) for row, attn in zip(sequence, attention["output"])]
    hidden = [[max(0.0, sum(w1[j][k] * row[k] for k in range(width)) + b1[j]) for j in range(hidden_width)] for row in residual1]
    ffn = [[sum(w2[k][j] * row[j] for j in range(hidden_width)) + b2[k] for k in range(width)] for row in hidden]
    output = [layer_norm([a + b for a, b in zip(row, ff)]) for row, ff in zip(residual1, ffn)]
    return {
        "attention": attention["output"],
        "attention_weights": attention["weights"],
        "residual_norm": residual1,
        "ffn_hidden": hidden,
        "ffn_output": ffn,
        "output": output,
        "shapes": {"input": [len(sequence), width], "heads": [heads, len(sequence), len(sequence), width // heads],
                   "ffn_hidden": [len(sequence), hidden_width], "output": [len(sequence), width]},
    }


def generate_autoregressive(
    prompt_ids: Sequence[int],
    logits_by_last_token: Mapping[int, Sequence[float]],
    max_new_tokens: int,
    stop_id: int | None = None,
    temperature: float = 1.0,
    top_k: int | None = None,
    top_p: float = 1.0,
    seed: int = 7,
) -> dict[str, object]:
    """Run a deterministic toy autoregressive loop using a last-token transition table."""
    if not prompt_ids:
        raise ValueError("prompt must contain at least one token")
    if max_new_tokens < 1:
        raise ValueError("max_new_tokens must be positive")
    generated = list(prompt_ids)
    steps: list[dict[str, object]] = []
    stop_reason = "max_new_tokens"
    for step in range(max_new_tokens):
        last = generated[-1]
        if last not in logits_by_last_token:
            raise ValueError(f"no next-token logits for context token {last}")
        sample = decode_logits(logits_by_last_token[last], temperature, top_k, top_p, seed + step)
        token = int(sample["token_id"])
        generated.append(token)
        steps.append({"step": step + 1, "context_length": len(generated) - 1, "token_id": token,
                      "candidates": sample["candidates"], "probabilities": sample["probabilities"]})
        if stop_id is not None and token == stop_id:
            stop_reason = "stop_token"
            break
    return {"token_ids": generated, "steps": steps, "stop_reason": stop_reason,
            "kv_cache_positions": list(range(len(prompt_ids), len(generated)))}


def estimate_inference_memory(
    parameters: int,
    parameter_bytes: int,
    layers: int,
    context: int,
    kv_heads: int,
    head_dim: int,
    batch: int = 1,
    hidden_width: int | None = None,
    activation_multiplier: int = 1,
) -> dict[str, int]:
    """Estimate weights + KV cache + a coarse activation working-set (not allocator peak)."""
    if min(parameters, parameter_bytes, layers, context, kv_heads, head_dim, batch, activation_multiplier) < 1:
        raise ValueError("memory estimate dimensions must be positive")
    hidden = hidden_width if hidden_width is not None else kv_heads * head_dim
    if hidden < 1:
        raise ValueError("hidden_width must be positive")
    weights = parameters * parameter_bytes
    cache = kv_cache_bytes(layers, context, kv_heads, head_dim, parameter_bytes, batch)
    activations = batch * context * hidden * layers * parameter_bytes * activation_multiplier
    return {"weight_bytes": weights, "kv_cache_bytes": cache, "activation_bytes": activations,
            "estimated_total_bytes": weights + cache + activations}
