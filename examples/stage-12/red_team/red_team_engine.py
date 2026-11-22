"""Offline AI red-team scenario runner and fail-closed defensive controls."""
from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
import json
import re
from typing import Any


INJECTION_PATTERNS = (
    r"ignore (all )?(previous|prior) instructions",
    r"reveal (the )?(system prompt|secret|credentials)",
    r"override (the )?(system|developer) policy",
    r"call the tool .* without approval",
    r"send .* to an external",
)


def instruction_like(text: str) -> bool:
    normalized = " ".join(text.lower().split())
    return any(re.search(pattern, normalized) for pattern in INJECTION_PATTERNS)


def classify_retrieved_content(text: str) -> dict[str, str | bool]:
    """Retrieved text is evidence, never an authority or policy source."""
    return {
        "trust": "untrusted-data",
        "instruction_like": instruction_like(text),
        "may_grant_tool_authority": False,
    }


def request_digest(tool: str, action: str, resource_id: str, arguments: dict[str, Any]) -> str:
    payload = json.dumps(
        {"tool": tool, "action": action, "resource_id": resource_id, "arguments": arguments},
        sort_keys=True, separators=(",", ":"),
    )
    return sha256(payload.encode()).hexdigest()


@dataclass(frozen=True)
class Principal:
    subject: str
    tenant_id: str
    scopes: frozenset[str]


@dataclass
class Approval:
    approval_id: str
    subject: str
    tenant_id: str
    request_digest: str
    expires_at: int
    used: bool = False


@dataclass(frozen=True)
class ToolDecision:
    allowed: bool
    reason: str


@dataclass(frozen=True)
class AttackScenario:
    scenario_id: str
    category: str
    severity: str
    kind: str
    payload: dict[str, Any]
    expected_block: bool = True


@dataclass(frozen=True)
class ScenarioResult:
    scenario_id: str
    category: str
    severity: str
    blocked: bool
    passed: bool
    reason: str
    evidence: str


@dataclass
class RedTeamPolicy:
    resource_tenants: dict[str, str] = field(default_factory=lambda: {
        "order-A": "tenant-A", "order-B": "tenant-B"
    })
    tool_scopes: dict[tuple[str, str], str] = field(default_factory=lambda: {
        ("orders.read", "read"): "orders:read",
        ("orders.update", "update"): "orders:write",
    })
    tool_schemas: dict[tuple[str, str], frozenset[str]] = field(default_factory=lambda: {
        ("orders.read", "read"): frozenset({"resource_id"}),
        ("orders.update", "update"): frozenset({"resource_id", "status"}),
    })
    approvals: dict[str, Approval] = field(default_factory=dict)
    used_canaries: tuple[str, ...] = ("CANARY-SECRET-9F31",)
    max_input_tokens: int = 500
    max_output_tokens: int = 500
    max_cost_usd: float = 0.05

    def authorize_tool(self, principal: Principal | None, tool: str, action: str,
                       resource_id: str, arguments: dict[str, Any], *,
                       approval_id: str | None = None, now: int = 100) -> ToolDecision:
        if principal is None:
            return ToolDecision(False, "VERIFIED_PRINCIPAL_REQUIRED")
        key = (tool, action)
        if key not in self.tool_scopes or key not in self.tool_schemas:
            return ToolDecision(False, "TOOL_ACTION_NOT_ALLOWLISTED")
        if set(arguments) != self.tool_schemas[key]:
            return ToolDecision(False, "ARGUMENT_SCHEMA_MISMATCH")
        if arguments.get("resource_id") != resource_id:
            return ToolDecision(False, "RESOURCE_ARGUMENT_MISMATCH")
        owner_tenant = self.resource_tenants.get(resource_id)
        if owner_tenant is None or owner_tenant != principal.tenant_id:
            return ToolDecision(False, "TENANT_RESOURCE_MISMATCH")
        if self.tool_scopes[key] not in principal.scopes:
            return ToolDecision(False, "MISSING_TOOL_SCOPE")
        if action in {"update", "delete", "send", "export"}:
            approval = self.approvals.get(approval_id or "")
            if approval is None:
                return ToolDecision(False, "APPROVAL_REQUIRED")
            digest = request_digest(tool, action, resource_id, arguments)
            if approval.used:
                return ToolDecision(False, "APPROVAL_REPLAY")
            if approval.expires_at <= now:
                return ToolDecision(False, "APPROVAL_EXPIRED")
            if (approval.subject != principal.subject or approval.tenant_id != principal.tenant_id
                    or approval.request_digest != digest):
                return ToolDecision(False, "APPROVAL_BINDING_MISMATCH")
            # In production this consume must be an atomic, durable compare-and-set.
            approval.used = True
        return ToolDecision(True, "ALLOW")

    def check_budget(self, input_tokens: int, output_tokens: int, cost_usd: float) -> ToolDecision:
        if input_tokens < 0 or output_tokens < 0 or cost_usd < 0:
            return ToolDecision(False, "BUDGET_INPUT_INVALID")
        if input_tokens > self.max_input_tokens or output_tokens > self.max_output_tokens:
            return ToolDecision(False, "TOKEN_BUDGET_EXCEEDED")
        if cost_usd > self.max_cost_usd:
            return ToolDecision(False, "COST_BUDGET_EXCEEDED")
        return ToolDecision(True, "BUDGET_WITHIN_LIMITS")

    def sanitize_output(self, output: str) -> tuple[str, bool]:
        redacted = output
        leaked = False
        for canary in self.used_canaries:
            if canary in redacted:
                leaked = True
                redacted = redacted.replace(canary, "[REDACTED]")
        return redacted, leaked

    @staticmethod
    def verify_artifact(content: bytes, expected_digest: str, trusted_digest: str) -> ToolDecision:
        actual = sha256(content).hexdigest()
        if actual != expected_digest or actual != trusted_digest:
            return ToolDecision(False, "ARTIFACT_INTEGRITY_MISMATCH")
        return ToolDecision(True, "ARTIFACT_INTEGRITY_VERIFIED")


class RedTeamRunner:
    def __init__(self, policy: RedTeamPolicy | None = None):
        self.policy = policy or RedTeamPolicy()

    def run_one(self, scenario: AttackScenario) -> ScenarioResult:
        payload = scenario.payload
        blocked = False
        reason = "UNHANDLED_SCENARIO"
        evidence = ""
        if scenario.kind in {"direct_injection", "indirect_injection", "retrieval_poisoning"}:
            text = str(payload.get("text", ""))
            classification = classify_retrieved_content(text)
            blocked = classification["trust"] == "untrusted-data" and not classification["may_grant_tool_authority"]
            reason = "UNTRUSTED_INSTRUCTION_QUARANTINED" if blocked else "UNTRUSTED_CONTENT_ESCAPED"
            evidence = f"trust={classification['trust']}; instruction_like={classification['instruction_like']}"
        elif scenario.kind == "tool_authorization":
            principal_data = payload.get("principal", {})
            principal = Principal(principal_data.get("subject", ""),
                                  principal_data.get("tenant_id", ""),
                                  frozenset(principal_data.get("scopes", [])))
            decision = self.policy.authorize_tool(
                principal, payload.get("tool", ""), payload.get("action", ""),
                payload.get("resource_id", ""), payload.get("arguments", {}),
                approval_id=payload.get("approval_id"), now=int(payload.get("now", 100)),
            )
            blocked = not decision.allowed
            reason = decision.reason
            evidence = f"allowed={decision.allowed}"
        elif scenario.kind == "secret_exfiltration":
            redacted, leaked = self.policy.sanitize_output(str(payload.get("output", "")))
            blocked = leaked and "[REDACTED]" in redacted
            reason = "CANARY_REDACTED" if blocked else "NO_CANARY_LEAK_DETECTED"
            evidence = redacted
        elif scenario.kind == "resource_exhaustion":
            decision = self.policy.check_budget(
                int(payload.get("input_tokens", 0)), int(payload.get("output_tokens", 0)),
                float(payload.get("cost_usd", 0.0)),
            )
            blocked = not decision.allowed
            reason = decision.reason
            evidence = f"within_budget={decision.allowed}"
        elif scenario.kind == "artifact_tampering":
            decision = self.policy.verify_artifact(
                str(payload.get("content", "")).encode(),
                str(payload.get("expected_digest", "")),
                str(payload.get("trusted_digest", "")),
            )
            blocked = not decision.allowed
            reason = decision.reason
            evidence = f"integrity_verified={decision.allowed}"
        passed = blocked == scenario.expected_block
        return ScenarioResult(scenario.scenario_id, scenario.category, scenario.severity,
                              blocked, passed, reason, evidence)

    def run(self, scenarios: list[AttackScenario]) -> list[ScenarioResult]:
        ids = [scenario.scenario_id for scenario in scenarios]
        if len(ids) != len(set(ids)):
            raise ValueError("DUPLICATE_ATTACK_SCENARIO_ID")
        return [self.run_one(scenario) for scenario in scenarios]


@dataclass(frozen=True)
class RedTeamGate:
    passed: bool
    reasons: tuple[str, ...]


def evaluate_red_team_gate(scenarios: list[AttackScenario],
                            results: list[ScenarioResult]) -> RedTeamGate:
    expected = {scenario.scenario_id: scenario for scenario in scenarios}
    observed = {result.scenario_id: result for result in results}
    reasons = []
    if set(expected) != set(observed):
        reasons.append("ATTACK_COVERAGE_MISMATCH")
    for scenario_id, scenario in expected.items():
        result = observed.get(scenario_id)
        if result is None:
            continue
        if not result.passed:
            reasons.append(f"ATTACK_NOT_CONTAINED:{scenario_id}")
        if scenario.severity in {"critical", "high"} and not result.blocked:
            reasons.append(f"UNRESOLVED_{scenario.severity.upper()}:{scenario_id}")
    return RedTeamGate(not reasons, tuple(reasons))


def load_scenarios(path) -> list[AttackScenario]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [AttackScenario(
        scenario_id=item["scenario_id"], category=item["category"],
        severity=item["severity"], kind=item["kind"],
        payload=item["payload"], expected_block=item.get("expected_block", True),
    ) for item in data["scenarios"]]


def demo() -> None:
    from pathlib import Path
    scenarios = load_scenarios(Path(__file__).with_name("scenarios.json"))
    runner = RedTeamRunner()
    results = runner.run(scenarios)
    gate = evaluate_red_team_gate(scenarios, results)
    for result in results:
        print(f"{'PASS' if result.passed else 'FAIL'} {result.scenario_id}: {result.reason}")
    print(f"red-team-gate={'PASS' if gate.passed else 'BLOCK'} scenarios={len(results)}")
    if not gate.passed:
        raise SystemExit(1)


if __name__ == "__main__":
    demo()
