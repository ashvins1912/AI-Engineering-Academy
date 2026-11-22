"""Capacity planning, fair scheduling and paged KV-cache accounting."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from hashlib import sha256
import math
import json

from inference_simulator import InferenceSimulator, Request


@dataclass(frozen=True)
class CapacityPlan:
    available_kv_memory_bytes: int
    kv_bytes_per_sequence: int
    max_concurrent_sequences: int
    estimated_service_rate_rps: float
    estimated_utilization: float
    little_law_concurrency: float
    overload_risk: bool


def little_law(arrival_rate_rps: float, average_latency_ms: float) -> float:
    if arrival_rate_rps < 0 or average_latency_ms < 0:
        raise ValueError("LITTLE_LAW_INPUT_INVALID")
    return arrival_rate_rps * average_latency_ms / 1000.0


def plan_capacity(simulator: InferenceSimulator, *, total_memory_mb: float,
                  model_weights_mb: float, runtime_reserve_mb: float,
                  max_sequence_tokens: int, arrival_rate_rps: float,
                  average_output_tokens: int, average_latency_ms: float) -> CapacityPlan:
    if (min(total_memory_mb, model_weights_mb, runtime_reserve_mb) < 0
            or total_memory_mb <= model_weights_mb + runtime_reserve_mb
            or max_sequence_tokens < 1 or arrival_rate_rps < 0
            or average_output_tokens < 1 or average_latency_ms < 0):
        raise ValueError("CAPACITY_PLAN_INPUT_INVALID")
    available = int((total_memory_mb - model_weights_mb - runtime_reserve_mb) * 1024 * 1024)
    per_sequence = simulator.kv_cache_bytes(max_sequence_tokens)
    concurrency = available // per_sequence
    service_rate = simulator.effective_decode_tokens_per_second / average_output_tokens
    utilization = arrival_rate_rps / service_rate if service_rate else float("inf")
    average_concurrency = little_law(arrival_rate_rps, average_latency_ms)
    return CapacityPlan(available, per_sequence, int(concurrency), service_rate,
                        utilization, average_concurrency, utilization >= 1.0)


def versioned_prefix_key(tenant_id: str, model_version: str, prompt_version: str,
                         policy_version: str, prefix_text: str) -> str:
    if not all((tenant_id, model_version, prompt_version, policy_version)):
        raise ValueError("PREFIX_CACHE_VERSION_FIELDS_REQUIRED")
    material = {
        "tenant": tenant_id, "model": model_version, "prompt": prompt_version,
        "policy": policy_version, "prefix": prefix_text,
    }
    return sha256(json.dumps(material, sort_keys=True).encode()).hexdigest()


class TenantFairScheduler:
    """Round-robin scheduler; one request per tenant turn, with bounded batch size."""
    def __init__(self, max_queue: int):
        if max_queue < 1:
            raise ValueError("QUEUE_LIMIT_INVALID")
        self.max_queue = max_queue
        self._queues: dict[str, deque[Request]] = {}
        self._rotation: deque[str] = deque()
        self._size = 0

    def submit(self, request: Request) -> bool:
        if self._size >= self.max_queue:
            return False
        queue = self._queues.get(request.tenant_id)
        if queue is None:
            queue = deque()
            self._queues[request.tenant_id] = queue
            self._rotation.append(request.tenant_id)
        queue.append(request)
        self._size += 1
        return True

    def next_batch(self, max_batch_size: int) -> list[Request]:
        if max_batch_size < 1:
            raise ValueError("BATCH_LIMIT_INVALID")
        batch = []
        while self._rotation and len(batch) < max_batch_size:
            tenant = self._rotation.popleft()
            queue = self._queues[tenant]
            batch.append(queue.popleft())
            self._size -= 1
            if queue:
                self._rotation.append(tenant)
            else:
                del self._queues[tenant]
        return batch

    @property
    def queue_depth(self) -> int:
        return self._size


class PagedKVAllocator:
    def __init__(self, total_pages: int, page_size_tokens: int = 16):
        if total_pages < 1 or page_size_tokens < 1:
            raise ValueError("KV_PAGE_CONFIG_INVALID")
        self.total_pages = total_pages
        self.page_size_tokens = page_size_tokens
        self._allocations: dict[str, int] = {}

    def allocate(self, request_id: str, tokens: int) -> int:
        if not request_id or tokens < 0:
            raise ValueError("KV_ALLOCATION_INPUT_INVALID")
        if request_id in self._allocations:
            raise ValueError("KV_REQUEST_ALREADY_ALLOCATED")
        pages = math.ceil(tokens / self.page_size_tokens)
        if pages > self.free_pages:
            raise MemoryError("KV_PAGES_EXHAUSTED")
        self._allocations[request_id] = pages
        return pages

    def release(self, request_id: str) -> int:
        if request_id not in self._allocations:
            raise KeyError("KV_ALLOCATION_NOT_FOUND")
        return self._allocations.pop(request_id)

    @property
    def used_pages(self) -> int:
        return sum(self._allocations.values())

    @property
    def free_pages(self) -> int:
        return self.total_pages - self.used_pages
