#!/usr/bin/env python3
"""Defensive, deterministic trust-boundary simulator; no LLM or external tool is called."""
import argparse
import json
from pathlib import Path


def authorize_retrieval(principal, document):
    return document.get("tenant_id") == principal.get("tenant_id") and document.get("trust") != "restricted"


def build_context(documents, max_chunks=3):
    selected = [doc for doc in documents if doc.get("trust") == "untrusted"][:max_chunks]
    return [{"source_id": doc["id"], "trust": "untrusted", "text": doc["text"]} for doc in selected]


def authorize_tool(principal, action, policy):
    if action.get("tool") != policy["allowed_tool"]:
        return False, "TOOL_NOT_ALLOWLISTED"
    if action.get("verb") != policy["allowed_verb"]:
        return False, "VERB_NOT_ALLOWED"
    if policy.get("require_same_tenant") and action.get("tenant_id") != principal.get("tenant_id"):
        return False, "TENANT_SCOPE_DENIED"
    if action.get("resource_id") not in principal.get("allowed_resources", []):
        return False, "RESOURCE_SCOPE_DENIED"
    return True, "CAPABILITY_GRANTED"


def redact_output(value, canary, restricted=True):
    if restricted or (canary and canary in value):
        return "[REDACTED]"
    return value


def run_scenario(scenario):
    principal = scenario["principal"]
    docs = scenario["documents"]
    allowed = [doc for doc in docs if authorize_retrieval(principal, doc)]
    context = build_context(allowed, max_chunks=3)
    allowed_action, reason = authorize_tool(principal, scenario["proposed_tool_request"], scenario["policy"])
    canary = scenario["synthetic_canary"]
    serialized_context = json.dumps(context)
    user_output = redact_output("Answer based only on permitted evidence.", canary, restricted=False)
    audit = {"decision": "allow" if allowed_action else "deny", "reason_code": reason, "source_ids": [d["id"] for d in context]}
    return {
        "retrieved_source_ids": [d["id"] for d in allowed],
        "context_source_ids": [d["source_id"] for d in context],
        "context_tokens_proxy": sum(len(d["text"].split()) for d in context),
        "proposed_tool_allowed": allowed_action,
        "tool_invocations": 1 if allowed_action else 0,
        "tool_decision_reason": reason,
        "canary_in_context": canary in serialized_context,
        "canary_in_output": canary in user_output,
        "user_output": user_output,
        "audit": audit,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", default=str(Path(__file__).with_name("security-scenario.json")))
    args = parser.parse_args()
    print(json.dumps(run_scenario(json.loads(Path(args.scenario).read_text())), indent=2))


if __name__ == "__main__":
    main()
