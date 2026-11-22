"""Policy boundary for normalized protocol intents.

Wire adapters validate protocol contracts; this gateway enforces application
authorization using verified identity rather than peer/model-supplied claims.
"""
from dataclasses import dataclass

from protocol_lab import NormalizedIntent, ProtocolError, VerifiedIdentity, normalize_intent


@dataclass(frozen=True)
class AuthorizationDecision:
    allowed: bool
    reason: str


class ProtocolGateway:
    def normalize(self, protocol: str, request_id: str | int, identity: VerifiedIdentity,
                  action: str, resource_id: str) -> NormalizedIntent:
        return normalize_intent(protocol, request_id, identity, action, resource_id)

    @staticmethod
    def authorize(intent: NormalizedIntent, required_scope: str,
                  resource_tenant_id: str, resource_id: str) -> AuthorizationDecision:
        if intent.tenant_id != resource_tenant_id:
            return AuthorizationDecision(False, "TENANT_MISMATCH")
        if intent.resource_id != resource_id:
            return AuthorizationDecision(False, "RESOURCE_MISMATCH")
        if required_scope not in intent.scopes:
            return AuthorizationDecision(False, "SCOPE_MISSING")
        return AuthorizationDecision(True, "ALLOW")

    def execute(self, intent: NormalizedIntent, required_scope: str,
                resource_tenant_id: str, resource_id: str, handler):
        decision = self.authorize(intent, required_scope, resource_tenant_id, resource_id)
        if not decision.allowed:
            raise ProtocolError(decision.reason)
        return handler(intent)
