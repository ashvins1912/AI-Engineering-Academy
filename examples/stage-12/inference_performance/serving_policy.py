"""Production-shaped admission and load-shedding boundary for serving requests."""
from __future__ import annotations

from dataclasses import dataclass

from inference_simulator import InferenceSimulator, Request, RequestEstimate


@dataclass(frozen=True)
class AdmissionDecision:
    admitted: bool
    reason: str
    estimates: tuple[RequestEstimate, ...] = ()


class CapacityGuard:
    def __init__(self, simulator: InferenceSimulator):
        self.simulator = simulator

    def admit_batch(self, requests: list[Request], *, queue_depth: int = 0,
                    active_by_tenant: dict[str, int] | None = None,
                    max_active_per_tenant: int | None = None) -> AdmissionDecision:
        config = self.simulator.config
        if queue_depth < 0:
            return AdmissionDecision(False, "QUEUE_DEPTH_INVALID")
        if queue_depth + len(requests) > config.max_queue:
            return AdmissionDecision(False, "QUEUE_CAPACITY_EXCEEDED")
        if len(requests) > config.max_batch_size:
            return AdmissionDecision(False, "MAX_BATCH_SIZE_EXCEEDED")
        if max_active_per_tenant is not None:
            active = active_by_tenant or {}
            requested: dict[str, int] = {}
            for request in requests:
                requested[request.tenant_id] = requested.get(request.tenant_id, 0) + 1
            if any(active.get(tenant, 0) + count > max_active_per_tenant
                   for tenant, count in requested.items()):
                return AdmissionDecision(False, "TENANT_CONCURRENCY_LIMIT")
        try:
            estimates = self.simulator.simulate_batch(requests)
        except (MemoryError, ValueError) as error:
            return AdmissionDecision(False, str(error))
        if any(item.deadline_missed for item in estimates):
            return AdmissionDecision(False, "DEADLINE_UNACHIEVABLE", tuple(estimates))
        return AdmissionDecision(True, "ADMITTED", tuple(estimates))
