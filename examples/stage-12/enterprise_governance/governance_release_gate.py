"""Production-shaped release coordinator; it performs no deployment side effect."""
from __future__ import annotations

from governance_engine import (
    AuditLedger, GateDecision, GovernanceDossier, LifecycleManager, validate_dossier,
)


class GovernanceReleaseGate:
    def __init__(self, lifecycle: LifecycleManager, audit: AuditLedger):
        self.lifecycle = lifecycle
        self.audit = audit

    def evaluate_and_release(self, dossier: GovernanceDossier, *, now: int, actor: str) -> GateDecision:
        decision = validate_dossier(dossier, now=now)
        self.audit.append(
            f"{dossier.manifest.release_id}-gate-{len(self.audit.events) + 1}",
            now, actor, "release.gate_evaluated",
            {"release_id": dossier.manifest.release_id, "passed": decision.passed,
             "reasons": list(decision.reasons)},
        )
        if not decision.passed:
            return decision
        if self.lifecycle.state != "approved":
            return GateDecision(False, ("LIFECYCLE_NOT_APPROVED",), decision.evidence_count)
        self.lifecycle.transition("release")
        self.audit.append(
            f"{dossier.manifest.release_id}-released-{len(self.audit.events) + 1}",
            now, actor, "release.promoted",
            {"release_id": dossier.manifest.release_id, "state": self.lifecycle.state},
        )
        return decision
