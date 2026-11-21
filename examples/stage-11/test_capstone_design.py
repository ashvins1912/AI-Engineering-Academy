import importlib.util
from pathlib import Path
import sys
import unittest

MODULE_PATH = Path(__file__).parent / "capstone-design" / "architecture_gate.py"
spec = importlib.util.spec_from_file_location("capstone_architecture_gate", MODULE_PATH)
architecture = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = architecture
spec.loader.exec_module(architecture)

Component = architecture.Component
DataFlow = architecture.DataFlow
Threat = architecture.Threat
risk_score = architecture.risk_score
risk_level = architecture.risk_level
validate_adr = architecture.validate_adr
validate_architecture = architecture.validate_architecture
architecture_approved = architecture.architecture_approved
REQUIRED_CONTROLS = architecture.REQUIRED_CONTROLS


class CapstoneArchitectureTests(unittest.TestCase):
    def setUp(self):
        self.components = [
            Component(name, kind, "zone", frozenset(REQUIRED_CONTROLS[kind]))
            for name, kind in [
                ("gateway", "api_gateway"), ("identity", "identity"),
                ("retrieval", "retrieval"), ("tool-gateway", "tool_gateway"),
            ]
        ]
        self.flows = [
            DataFlow("gateway-identity", "gateway", "identity", True, True, True, True, True),
            DataFlow("identity-retrieval", "identity", "retrieval", True, True, True, True, True),
        ]
        self.threats = [
            Threat("T-01", "INFORMATION_DISCLOSURE", "tenant docs", "missing ACL leaks chunk", 4, 5,
                   ("RLS", "vector filter"), ("negative tenant test",), "security-owner")
        ]

    def test_risk_score(self):
        self.assertEqual(risk_score(4, 5), 20)

    def test_risk_rating_range_enforced(self):
        with self.assertRaisesRegex(ValueError, "RISK_RATING_OUT_OF_RANGE"):
            risk_score(0, 5)

    def test_risk_level_bands(self):
        self.assertEqual(risk_level(4), "LOW")
        self.assertEqual(risk_level(6), "MEDIUM")
        self.assertEqual(risk_level(12), "HIGH")
        self.assertEqual(risk_level(20), "CRITICAL")

    def test_risk_score_range_enforced(self):
        with self.assertRaisesRegex(ValueError, "RISK_SCORE_OUT_OF_RANGE"):
            risk_level(26)

    def test_complete_architecture_has_no_findings(self):
        findings = validate_architecture(self.components, self.flows, self.threats)
        self.assertEqual(findings, [])
        self.assertTrue(architecture_approved(findings))

    def test_missing_component_control_is_reported(self):
        components = [Component("retrieval", "retrieval", "app", frozenset({"tenant_filter"}))]
        findings = validate_architecture(components, [], [])
        self.assertTrue(any(f.code == "COMPONENT_CONTROL_MISSING" for f in findings))

    def test_cross_boundary_flow_requires_encryption(self):
        flow = DataFlow("unsafe", "gateway", "identity", True, False, True, True, True)
        findings = validate_architecture(self.components, [flow], [])
        self.assertTrue(any(f.code == "BOUNDARY_ENCRYPTION_MISSING" for f in findings))

    def test_cross_boundary_flow_requires_peer_authentication(self):
        flow = DataFlow("unsafe", "gateway", "identity", True, True, False, True, True)
        findings = validate_architecture(self.components, [flow], [])
        self.assertTrue(any(f.code == "BOUNDARY_AUTHENTICATION_MISSING" for f in findings))

    def test_tenant_context_required(self):
        flow = DataFlow("unsafe", "identity", "retrieval", True, True, True, False, True)
        findings = validate_architecture(self.components, [flow], [])
        self.assertTrue(any(f.code == "TENANT_CONTEXT_MISSING" for f in findings))

    def test_server_authorization_required(self):
        flow = DataFlow("unsafe", "identity", "retrieval", True, True, True, True, False)
        findings = validate_architecture(self.components, [flow], [])
        self.assertTrue(any(f.code == "AUTHORIZATION_CHECK_MISSING" for f in findings))

    def test_unknown_component_in_flow_reported(self):
        flow = DataFlow("unknown", "gateway", "ghost", True, True, True, True, True)
        findings = validate_architecture(self.components, [flow], [])
        self.assertTrue(any(f.code == "FLOW_COMPONENT_UNKNOWN" for f in findings))

    def test_high_risk_threat_requires_mitigation_and_test(self):
        threat = Threat("T-02", "INFORMATION_DISCLOSURE", "tenant docs", "cross-tenant leak", 4, 5)
        findings = validate_architecture(self.components, self.flows, [threat])
        self.assertTrue(any(f.code == "HIGH_RISK_EVIDENCE_MISSING" for f in findings))

    def test_critical_threat_requires_residual_owner(self):
        threat = Threat("T-03", "ELEVATION_OF_PRIVILEGE", "tool", "forged tool grant", 4, 5,
                        ("policy gate",), ("authorization test",), None)
        findings = validate_architecture(self.components, self.flows, [threat])
        self.assertTrue(any(f.code == "CRITICAL_RISK_OWNER_MISSING" for f in findings))

    def test_invalid_stride_category_reported(self):
        threat = Threat("T-04", "PROMPT_MAGIC", "model", "injection", 2, 3)
        findings = validate_architecture(self.components, self.flows, [threat])
        self.assertTrue(any(f.code == "UNKNOWN_THREAT_CATEGORY" for f in findings))

    def test_adr_requires_alternatives_and_consequences(self):
        findings = validate_adr({"title": "ADR-001", "context": "multi tenant", "decision": "Postgres RLS"})
        self.assertEqual({f.detail for f in findings}, {"alternatives", "consequences"})

    def test_complete_adr_valid(self):
        adr = {"title": "ADR-001", "context": "tenant data isolation", "decision": "RLS",
               "alternatives": ["app-only filter", "database per tenant"], "consequences": ["policy complexity"]}
        self.assertEqual(validate_adr(adr), [])


if __name__ == "__main__":
    unittest.main()
