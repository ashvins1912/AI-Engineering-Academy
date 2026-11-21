"""Deterministic, dependency-free Kubernetes scheduling and probe simulator."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Workload:
    replicas: int
    memory_request_gib: float
    node_allocatable_gib: float
    model_startup_seconds: int
    startup_budget_seconds: int
    memory_limit_gib: float | None = None
    memory_per_request_gib: float = 0.0
    concurrency: int = 0


def schedule(replicas: int, request_gib: float, allocatable_gib: float) -> dict:
    if not isinstance(replicas, int) or isinstance(replicas, bool) or replicas < 0:
        raise ValueError("replicas must be a non-negative integer")
    if request_gib <= 0 or allocatable_gib < 0:
        raise ValueError("memory request must be positive and allocatable memory non-negative")
    scheduled = min(replicas, int(allocatable_gib // request_gib))
    return {
        "scheduled": scheduled,
        "pending": replicas - scheduled,
        "reason": "Insufficient memory" if scheduled < replicas else "All replicas fit",
    }


def startup_ready(load_seconds: int, startup_budget_seconds: int) -> bool:
    if load_seconds < 0 or startup_budget_seconds <= 0:
        raise ValueError("load time must be non-negative and startup budget positive")
    return load_seconds <= startup_budget_seconds


def evaluate(workload: Workload) -> dict:
    placement = schedule(
        workload.replicas,
        workload.memory_request_gib,
        workload.node_allocatable_gib,
    )
    ready = placement["scheduled"] if startup_ready(
        workload.model_startup_seconds, workload.startup_budget_seconds
    ) else 0
    peak_memory = (
        workload.memory_request_gib
        + workload.memory_per_request_gib * workload.concurrency
    )
    limit_ok = (
        workload.memory_limit_gib is None
        or peak_memory <= workload.memory_limit_gib
    )
    if not limit_ok:
        ready = 0
    return {
        **placement,
        "ready": ready,
        "startup_ok": startup_ready(
            workload.model_startup_seconds, workload.startup_budget_seconds
        ),
        "estimated_peak_memory_gib": round(peak_memory, 3),
        "memory_limit_ok": limit_ok,
        "diagnosis": (
            "Insufficient memory for requested replicas"
            if placement["pending"]
            else "Startup budget exceeded"
            if not startup_ready(workload.model_startup_seconds, workload.startup_budget_seconds)
            else "Estimated runtime memory exceeds limit"
            if not limit_ok
            else "Workload can become Ready"
        ),
    }


def main() -> None:
    normal = evaluate(Workload(2, 6, 16, 75, 120, 8, 0.3, 4))
    constrained = evaluate(Workload(3, 6, 16, 75, 120, 8, 0.3, 4))
    print("Normal:", normal)
    print("Constrained:", constrained)


if __name__ == "__main__":
    main()
