"""Deterministic SLO and reliability simulator; no network calls."""
from __future__ import annotations

from dataclasses import dataclass
import math


@dataclass(frozen=True)
class RequestEvent:
    success: bool
    latency_ms: int
    eligible: bool = True


def calculate_sli(events: list[RequestEvent], latency_target_ms: int) -> dict:
    if latency_target_ms <= 0:
        raise ValueError("INVALID_LATENCY_TARGET")
    eligible = [event for event in events if event.eligible]
    if not eligible:
        raise ValueError("EMPTY_SLI_DENOMINATOR")
    if any(event.latency_ms < 0 for event in eligible):
        raise ValueError("INVALID_LATENCY")
    good = sum(1 for event in eligible if event.success)
    latency_good = sum(1 for event in eligible if event.success and event.latency_ms <= latency_target_ms)
    latencies = sorted(event.latency_ms for event in eligible)
    p95_index = max(0, math.ceil(0.95 * len(latencies)) - 1)
    return {
        "eligible": len(eligible),
        "good": good,
        "bad": len(eligible) - good,
        "availability": good / len(eligible),
        "latency_compliant": latency_good / len(eligible),
        "p95_ms": latencies[p95_index],
    }


def calculate_error_budget(total_events: int, good_events: int, slo_target: float) -> dict:
    if total_events <= 0 or not 0 <= good_events <= total_events or not 0 < slo_target <= 1:
        raise ValueError("INVALID_SLI_INPUT")
    allowed_bad = total_events * (1 - slo_target)
    observed_bad = total_events - good_events
    consumption = observed_bad / allowed_bad if allowed_bad else (0.0 if observed_bad == 0 else float("inf"))
    return {
        "allowed_bad": allowed_bad,
        "observed_bad": observed_bad,
        "remaining_bad": max(0.0, allowed_bad - observed_bad),
        "consumption": consumption,
        "exhausted": observed_bad >= allowed_bad,
    }


def calculate_burn_rate(observed_bad_ratio: float, slo_target: float) -> float:
    if not 0 <= observed_bad_ratio <= 1 or not 0 < slo_target < 1:
        raise ValueError("INVALID_BURN_RATE_INPUT")
    allowed_bad_ratio = 1 - slo_target
    return observed_bad_ratio / allowed_bad_ratio


def retry_delays(max_attempts: int, base_delay_ms: int, max_delay_ms: int, jitter_factor: float = 0.0) -> list[int]:
    if max_attempts < 1 or base_delay_ms < 0 or max_delay_ms < 0 or not 0 <= jitter_factor <= 1:
        raise ValueError("INVALID_RETRY_POLICY")
    delays = []
    for attempt in range(max_attempts - 1):
        raw = min(max_delay_ms, base_delay_ms * (2 ** attempt))
        # Deterministic jitter factor makes the simulator reproducible.
        delays.append(max(0, int(raw * (1 - jitter_factor))))
    return delays


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, cooldown_ms: int = 1000, half_open_max_probes: int = 1):
        if failure_threshold < 1 or cooldown_ms < 0 or half_open_max_probes < 1:
            raise ValueError("INVALID_BREAKER_CONFIG")
        self.failure_threshold = failure_threshold
        self.cooldown_ms = cooldown_ms
        self.half_open_max_probes = half_open_max_probes
        self.state = "CLOSED"
        self.failures = 0
        self.opened_at: int | None = None
        self.probes = 0

    def allow_request(self, now_ms: int) -> bool:
        if self.state == "OPEN":
            if self.opened_at is not None and now_ms - self.opened_at >= self.cooldown_ms:
                self.state = "HALF_OPEN"
                self.probes = 0
            else:
                return False
        if self.state == "HALF_OPEN":
            if self.probes >= self.half_open_max_probes:
                return False
            self.probes += 1
        return True

    def record_success(self, now_ms: int | None = None) -> None:
        self.failures = 0
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
            self.opened_at = None
            self.probes = 0

    def record_failure(self, now_ms: int) -> None:
        if self.state == "HALF_OPEN":
            self.state = "OPEN"
            self.opened_at = now_ms
            self.probes = 0
            return
        if self.state == "CLOSED":
            self.failures += 1
            if self.failures >= self.failure_threshold:
                self.state = "OPEN"
                self.opened_at = now_ms


def choose_fallback(provider_up: bool, retrieval_up: bool, cache_fresh: bool, cache_authorized: bool) -> str:
    if provider_up:
        return "MODEL_RESPONSE"
    if cache_fresh and cache_authorized:
        return "CACHED_RESPONSE_DEGRADED"
    if retrieval_up:
        return "RETRIEVAL_ONLY_WITH_CITATIONS"
    return "SAFE_UNAVAILABLE"


def main() -> None:
    events = [RequestEvent(True, 1200) for _ in range(995)] + [RequestEvent(False, 2500) for _ in range(5)]
    sli = calculate_sli(events, 2000)
    budget = calculate_error_budget(sli["eligible"], sli["good"], 0.995)
    print("SLI:", sli)
    print("error budget:", budget)
    print("4x burn:", calculate_burn_rate(0.02, 0.995))
    breaker = CircuitBreaker()
    for now in (0, 1, 2):
        breaker.record_failure(now)
    print("breaker after failures:", breaker.state)
    print("safe fallback:", choose_fallback(False, True, False, True))


if __name__ == "__main__":
    main()
