"""Hardware-independent inference serving and capacity simulator.

The simulator uses synthetic throughput curves and memory accounting. It does
not allocate GPU memory, load model weights or connect to a model server.
"""
from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
import math
from typing import Iterable


@dataclass(frozen=True)
class ModelProfile:
    layers: int = 32
    kv_heads: int = 8
    head_dim: int = 128

    def __post_init__(self):
        if min(self.layers, self.kv_heads, self.head_dim) <= 0:
            raise ValueError("MODEL_DIMENSIONS_INVALID")


@dataclass(frozen=True)
class Request:
    request_id: str
    tenant_id: str
    prompt_tokens: int
    output_tokens: int
    arrival_ms: float = 0.0
    priority: int = 0
    deadline_ms: float | None = None
    prefix_key: str | None = None
    prefix_tokens: int = 0


@dataclass(frozen=True)
class ServingConfig:
    max_batch_size: int = 4
    max_queue: int = 32
    kv_memory_budget_mb: float = 1024.0
    prefill_tokens_per_second: float = 2000.0
    decode_tokens_per_second: float = 50.0
    quantization_bits: int = 16
    speculative_acceptance_rate: float = 0.0
    draft_speedup: float = 2.0
    max_context_tokens: int = 8192

    def __post_init__(self):
        if self.max_batch_size < 1 or self.max_queue < 1:
            raise ValueError("CAPACITY_LIMIT_INVALID")
        if self.kv_memory_budget_mb <= 0 or self.prefill_tokens_per_second <= 0 or self.decode_tokens_per_second <= 0:
            raise ValueError("SERVING_BUDGET_INVALID")
        if self.quantization_bits not in {4, 8, 16}:
            raise ValueError("QUANTIZATION_BITS_UNSUPPORTED")
        if not 0 <= self.speculative_acceptance_rate <= 1 or self.draft_speedup < 1:
            raise ValueError("SPECULATIVE_CONFIG_INVALID")


@dataclass(frozen=True)
class RequestEstimate:
    request_id: str
    queue_wait_ms: float
    ttft_ms: float
    decode_ms: float
    total_latency_ms: float
    kv_cache_bytes: int
    effective_prompt_tokens: int
    prefix_cache_hit: bool
    quality_penalty: float
    deadline_missed: bool


class PrefixCache:
    """Tenant-scoped LRU prefix cache; identical keys cannot cross tenants."""
    def __init__(self, capacity: int = 128):
        if capacity < 1:
            raise ValueError("CACHE_CAPACITY_INVALID")
        self.capacity = capacity
        self._items: OrderedDict[tuple[str, str], None] = OrderedDict()

    def contains(self, tenant_id: str, prefix_key: str) -> bool:
        key = (tenant_id, prefix_key)
        if key not in self._items:
            return False
        self._items.move_to_end(key)
        return True

    def add(self, tenant_id: str, prefix_key: str) -> None:
        key = (tenant_id, prefix_key)
        self._items[key] = None
        self._items.move_to_end(key)
        while len(self._items) > self.capacity:
            self._items.popitem(last=False)


class InferenceSimulator:
    QUALITY_PENALTY = {4: 0.03, 8: 0.01, 16: 0.0}

    def __init__(self, model: ModelProfile | None = None,
                 config: ServingConfig | None = None,
                 prefix_cache: PrefixCache | None = None):
        self.model = model or ModelProfile()
        self.config = config or ServingConfig()
        self.prefix_cache = prefix_cache or PrefixCache()

    @property
    def bytes_per_kv_value(self) -> float:
        return self.config.quantization_bits / 8

    @property
    def effective_decode_tokens_per_second(self) -> float:
        acceptance = self.config.speculative_acceptance_rate
        speedup = self.config.draft_speedup
        return self.config.decode_tokens_per_second * (1 + acceptance * (speedup - 1))

    def kv_cache_bytes(self, sequence_tokens: int, concurrent_sequences: int = 1) -> int:
        if sequence_tokens < 0 or concurrent_sequences < 1:
            raise ValueError("KV_CACHE_DIMENSION_INVALID")
        # K and V tensors: 2 * layers * KV heads * head dimension * bytes/value.
        per_token = 2 * self.model.layers * self.model.kv_heads * self.model.head_dim * self.bytes_per_kv_value
        return math.ceil(per_token * sequence_tokens * concurrent_sequences)

    def estimate(self, request: Request, *, queue_wait_ms: float = 0.0) -> RequestEstimate:
        if (not request.request_id or not request.tenant_id or request.prompt_tokens < 0
                or request.output_tokens < 0 or request.prefix_tokens < 0
                or queue_wait_ms < 0):
            raise ValueError("REQUEST_INPUT_INVALID")
        total_context = request.prompt_tokens + request.output_tokens
        if total_context > self.config.max_context_tokens:
            raise ValueError("CONTEXT_WINDOW_EXCEEDED")
        cache_hit = bool(request.prefix_key and self.prefix_cache.contains(request.tenant_id, request.prefix_key))
        cached = min(request.prefix_tokens, request.prompt_tokens) if cache_hit else 0
        effective_prompt = request.prompt_tokens - cached
        prefill_ms = effective_prompt / self.config.prefill_tokens_per_second * 1000
        decode_ms = request.output_tokens / self.effective_decode_tokens_per_second * 1000
        ttft = queue_wait_ms + prefill_ms
        total = ttft + decode_ms
        completion = request.arrival_ms + total
        deadline_missed = request.deadline_ms is not None and completion > request.deadline_ms
        if request.prefix_key:
            self.prefix_cache.add(request.tenant_id, request.prefix_key)
        return RequestEstimate(
            request.request_id, queue_wait_ms, ttft, decode_ms, total,
            self.kv_cache_bytes(total_context), effective_prompt, cache_hit,
            self.QUALITY_PENALTY[self.config.quantization_bits], deadline_missed,
        )

    def simulate_batch(self, requests: list[Request], *, start_ms: float | None = None) -> list[RequestEstimate]:
        if not requests:
            return []
        if len(requests) > self.config.max_batch_size:
            raise ValueError("MAX_BATCH_SIZE_EXCEEDED")
        batch_start = max(request.arrival_ms for request in requests) if start_ms is None else start_ms
        memory = sum(self.kv_cache_bytes(r.prompt_tokens + r.output_tokens) for r in requests)
        if memory > self.config.kv_memory_budget_mb * 1024 * 1024:
            raise MemoryError("KV_CACHE_BUDGET_EXCEEDED")
        return [self.estimate(r, queue_wait_ms=max(0.0, batch_start - r.arrival_ms)) for r in requests]

    def simulate_workload(self, requests: Iterable[Request]) -> dict:
        ordered = sorted(requests, key=lambda r: (r.arrival_ms, -r.priority, r.request_id))
        accepted = ordered[:self.config.max_queue]
        rejected = [{"request_id": r.request_id, "reason": "QUEUE_CAPACITY_EXCEEDED"}
                    for r in ordered[self.config.max_queue:]]
        batches = [accepted[index:index + self.config.max_batch_size]
                   for index in range(0, len(accepted), self.config.max_batch_size)]
        results: list[RequestEstimate] = []
        clock = 0.0
        for batch in batches:
            start = max(clock, min(item.arrival_ms for item in batch))
            try:
                estimates = self.simulate_batch(batch, start_ms=start)
            except MemoryError:
                rejected.extend({"request_id": item.request_id, "reason": "KV_CACHE_BUDGET_EXCEEDED"}
                                for item in batch)
                continue
            results.extend(estimates)
            clock = start + max(item.total_latency_ms - item.queue_wait_ms for item in estimates)
        latencies = sorted(item.total_latency_ms for item in results)
        p95 = latencies[max(0, math.ceil(0.95 * len(latencies)) - 1)] if latencies else 0.0
        total_output = sum(item.output_tokens for item in accepted if item.request_id in {x.request_id for x in results})
        elapsed_seconds = clock / 1000 if clock > 0 else 0.0
        return {
            "accepted": len(results),
            "rejected": rejected,
            "requests": results,
            "p95_latency_ms": p95,
            "output_tokens": total_output,
            "throughput_tokens_per_second": total_output / elapsed_seconds if elapsed_seconds else 0.0,
            "queue_limit": self.config.max_queue,
            "batch_limit": self.config.max_batch_size,
        }


def demo() -> None:
    simulator = InferenceSimulator(
        config=ServingConfig(max_batch_size=2, max_queue=8, kv_memory_budget_mb=512,
                             prefill_tokens_per_second=2000, decode_tokens_per_second=50,
                             quantization_bits=8, speculative_acceptance_rate=0.7, draft_speedup=2.0)
    )
    requests = [
        Request("r1", "tenant-A", 1024, 128, arrival_ms=0, prefix_key="system-v1", prefix_tokens=256),
        Request("r2", "tenant-A", 2048, 256, arrival_ms=10, prefix_key="system-v1", prefix_tokens=256),
        Request("r3", "tenant-B", 1024, 64, arrival_ms=20),
    ]
    report = simulator.simulate_workload(requests)
    for item in report["requests"]:
        print(f"{item.request_id}: TTFT={item.ttft_ms:.1f}ms total={item.total_latency_ms:.1f}ms KV={item.kv_cache_bytes / 1024**2:.1f}MiB")
    print(f"accepted={report['accepted']} rejected={len(report['rejected'])} p95={report['p95_latency_ms']:.1f}ms")


if __name__ == "__main__":
    demo()
