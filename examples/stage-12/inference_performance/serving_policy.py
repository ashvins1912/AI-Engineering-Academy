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

    def admit_batch(self, requests: list[Request], *, queue_depth: int = 0) -> AdmissionDecision:
        config = self.simulator.config
        if queue_depth < 0:
            return AdmissionDecision(False, "QUEUE_DEPTH_INVALID")
        if queue_depth + len(requests) > config.max_queue:
            return AdmissionDecision(False, "QUEUE_CAPACITY_EXCEEDED")
        if len(requests) > config.max_batch_size:
            return AdmissionDecision(False, "MAX_BATCH_SIZE_EXCEEDED")
        try:
            estimates = self.simulator.simulate_batch(requests)
        except (MemoryError, ValueError) as error:
            return AdmissionDecision(False, str(error))
        return AdmissionDecision(True, "ADMITTED", tuple(estimates))
