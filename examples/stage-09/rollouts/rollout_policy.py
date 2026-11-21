#!/usr/bin/env python3
"""Deterministic, infrastructure-free deployment rollout policy simulator."""
import argparse
import hashlib
import json
from pathlib import Path


def quality_drop_percent(baseline, candidate):
    if baseline <= 0 or candidate < 0:
        raise ValueError("quality scores must be non-negative and baseline must be positive")
    return max(0.0, (baseline - candidate) / baseline * 100.0)


def canary_gate(metrics, policy):
    required = ("samples", "baseline_quality", "candidate_quality", "candidate_p95_ms")
    if any(key not in metrics for key in required):
        return {"decision": "hold", "reason": "missing telemetry"}
    if metrics["samples"] < policy["min_samples"]:
        return {"decision": "hold", "reason": "insufficient samples"}
    drop = quality_drop_percent(metrics["baseline_quality"], metrics["candidate_quality"])
    if metrics["candidate_p95_ms"] > policy["max_p95_ms"]:
        return {"decision": "rollback", "reason": "p95 latency guardrail breached", "quality_drop_percent": round(drop, 3)}
    if drop > policy["max_quality_drop_percent"]:
        return {"decision": "rollback", "reason": "quality guardrail breached", "quality_drop_percent": round(drop, 3)}
    return {"decision": "promote_one_step", "reason": "all guardrails pass", "quality_drop_percent": round(drop, 3)}


def simulate_canary(stable, candidate, policy, observations):
    weights = policy["canary_steps"]
    history = []
    for weight, metrics in zip(weights, observations):
        result = canary_gate(metrics, policy)
        history.append({"weight_percent": weight, **result})
        if result["decision"] == "rollback":
            return {"status": "rolled_back", "active_release": stable["release_id"], "candidate_weight_percent": 0, "history": history}
        if result["decision"] == "hold":
            return {"status": "held", "active_release": stable["release_id"], "candidate_weight_percent": 0, "history": history}
    return {"status": "promoted", "active_release": candidate["release_id"], "candidate_weight_percent": weights[-1] if history else 0, "history": history}


def blue_green_switch(active_release, candidate_release, candidate_healthy):
    if not candidate_healthy:
        return {"active_release": active_release, "decision": "keep_blue", "traffic_target": active_release}
    return {"active_release": candidate_release, "decision": "switch_to_green", "traffic_target": candidate_release}


def shadow_result(stable_response, candidate_response, candidate_side_effects=0):
    if candidate_side_effects:
        raise ValueError("shadow candidate attempted a side effect")
    return {"user_response": stable_response, "candidate_observed": candidate_response, "candidate_user_visible": False}


def ab_variant(subject_id, experiment_salt, variants=("control", "candidate")):
    if not subject_id or not experiment_salt or not variants:
        raise ValueError("subject, salt and variants are required")
    digest = hashlib.sha256(f"{experiment_salt}:{subject_id}".encode()).digest()
    bucket = int.from_bytes(digest[:8], "big") % len(variants)
    return variants[bucket]


def run_scenario(scenario):
    stable, candidate, policy = scenario["stable"], scenario["candidate"], scenario["policy"]
    normal = {"samples": candidate["samples"], "baseline_quality": stable["quality"], "candidate_quality": candidate["quality"], "candidate_p95_ms": candidate["p95_ms"]}
    observations = [normal for _ in policy["canary_steps"]]
    healthy = simulate_canary(stable, candidate, policy, observations)
    broken = dict(normal, candidate_p95_ms=scenario["failure_injection"]["candidate_p95_ms"], candidate_quality=scenario["failure_injection"]["candidate_quality"])
    failed = simulate_canary(stable, candidate, policy, [normal, broken])
    return {
        "metrics_are": "deterministic policy examples, not production traffic measurements",
        "healthy_canary": healthy,
        "injected_regression": failed,
        "blue_green_unhealthy_candidate": blue_green_switch(stable["release_id"], candidate["release_id"], False),
        "shadow_example": shadow_result("stable answer", "candidate answer"),
        "ab_assignment_example": {user: ab_variant(user, "experiment-2026-01") for user in ("user-1", "user-2", "user-3")},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default=str(Path(__file__).with_name("rollout-scenario.json")))
    args = parser.parse_args()
    print(json.dumps(run_scenario(json.loads(Path(args.scenario).read_text())), indent=2))


if __name__ == "__main__":
    main()
