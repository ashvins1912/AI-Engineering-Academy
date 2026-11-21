#!/usr/bin/env python3
"""Deterministic prompt-injection boundary lab; no model or live secrets required."""
import argparse
import json
import re
from pathlib import Path

ALLOWED = {
    ("order.read", "read"): "orders:read",
    ("order.export", "export"): "orders:export",
}
INJECTION_HINTS = (
    r"ignore (?:all )?(?:previous|prior) instructions",
    r"system (?:override|prompt)",
    r"reveal (?:the )?(?:secret|hidden prompt|credential)",
    r"export (?:all )?(?:customer|user|order) data",
    r"send (?:the )?(?:data|secret|records) to",
)


def inspect_untrusted(text):
    """Return advisory signals only; never use this as an authorization gate."""
    lowered = text.lower()
    hits = [pattern for pattern in INJECTION_HINTS if re.search(pattern, lowered)]
    return {"suspicious": bool(hits), "signals": hits, "trust": "untrusted"}


def evidence_envelope(content, source_id, tenant_id):
    if not source_id or not tenant_id:
        raise ValueError("source and tenant provenance are required")
    return {
        "content": str(content),
        "source_id": source_id,
        "tenant_id": tenant_id,
        "trust": "untrusted",
        "may_change_policy": False,
    }


def authorize_tool(principal, tool, action, resource, approval=False):
    """Server-side authorization; model-provided text cannot modify principal."""
    if not principal or not resource:
        return {"allowed": False, "reason": "missing_identity_or_resource"}
    required_scope = ALLOWED.get((tool, action))
    if required_scope is None:
        return {"allowed": False, "reason": "tool_action_not_allowlisted"}
    if required_scope not in principal.get("scopes", []):
        return {"allowed": False, "reason": "missing_scope"}
    if principal.get("tenant_id") != resource.get("tenant_id"):
        return {"allowed": False, "reason": "tenant_mismatch"}
    if action == "export" and not approval:
        return {"allowed": False, "reason": "approval_required"}
    return {"allowed": True, "reason": "authorized"}


def validate_output(candidate, canary_secret, allowed_source_ids):
    """Fail closed on canary leakage or citations outside the caller's ACL."""
    if canary_secret and canary_secret in candidate.get("text", ""):
        return {"allowed": False, "reason": "canary_secret_detected", "text": "[response blocked]"}
    citations = candidate.get("citations", [])
    if any(source_id not in allowed_source_ids for source_id in citations):
        return {"allowed": False, "reason": "unauthorized_citation", "text": "[response blocked]"}
    return {"allowed": True, "reason": "validated", "text": candidate.get("text", "")}


def run_scenario(scenario):
    principal = scenario["principal"]
    resources = {item["id"]: item for item in scenario["resources"]}
    outcomes = []
    for attack in scenario["attacks"]:
        signal = inspect_untrusted(attack["content"])
        tool = attack["tool"]
        resource = resources.get(tool["resource_id"], {"tenant_id": "unknown"})
        decision = authorize_tool(principal, tool["name"], tool["action"], resource)
        outcomes.append({
            "id": attack["id"],
            "source": attack["source"],
            "trust": "untrusted",
            "suspicious_signal": signal["suspicious"],
            "tool_decision": decision,
            "expected": attack["expected"],
            "passed": (decision["allowed"] and attack["expected"] == "allow")
                      or (not decision["allowed"] and attack["expected"] == "deny"),
        })
    output_check = validate_output(
        {"text": "Order status is shipped. " + scenario["canary_secret"], "citations": ["faq-1"]},
        scenario["canary_secret"], {"faq-1"})
    return {
        "metrics_are": "deterministic security-policy fixtures, not model attack-detection accuracy",
        "outcomes": outcomes,
        "all_policy_expectations_met": all(item["passed"] for item in outcomes),
        "canary_output_check": output_check,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default=str(Path(__file__).with_name("attack-scenarios.json")))
    args = parser.parse_args()
    print(json.dumps(run_scenario(json.loads(Path(args.scenario).read_text())), indent=2))


if __name__ == "__main__":
    main()
