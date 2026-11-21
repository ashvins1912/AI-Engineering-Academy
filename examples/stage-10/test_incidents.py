import importlib.util
from pathlib import Path
import sys
import unittest

MODULE_PATH = Path(__file__).parent / "incidents" / "incident_engine.py"
spec = importlib.util.spec_from_file_location("incident_engine", MODULE_PATH)
incident_engine = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = incident_engine
spec.loader.exec_module(incident_engine)

Incident = incident_engine.Incident
Evidence = incident_engine.Evidence
PostmortemAction = incident_engine.PostmortemAction
classify_severity = incident_engine.classify_severity
containment_plan = incident_engine.containment_plan
transition = incident_engine.transition
evidence_digest = incident_engine.evidence_digest
recovery_gate = incident_engine.recovery_gate
validate_postmortem = incident_engine.validate_postmortem


class IncidentResponseTests(unittest.TestCase):
    def setUp(self):
        self.evidence = Evidence("EV-1", "redacted-audit", "security-lead", "2026-11-22T10:00:00Z", b"synthetic redacted evidence", True)

    def test_confirmed_tenant_exposure_is_p0(self):
        self.assertEqual(classify_severity("tenant_exposure", True, 1, False, 1), "P0")

    def test_active_unsafe_tool_is_p0(self):
        self.assertEqual(classify_severity("unsafe_tool", False, 1, True, 10), "P0")

    def test_multi_tenant_impact_is_p1(self):
        self.assertEqual(classify_severity("provider_outage", False, 2, False, 100), "P1")

    def test_partial_degradation_is_p2(self):
        self.assertEqual(classify_severity("quality_regression", False, 1, False, 10), "P2")

    def test_no_user_impact_is_p3(self):
        self.assertEqual(classify_severity("configuration_warning", False, 0, False, 0), "P3")

    def test_category_specific_containment_plan(self):
        plan = containment_plan("tenant_exposure")
        self.assertIn("disable_affected_data_path", plan)
        self.assertIn("pause_affected_workers", plan)

    def test_unknown_category_rejected(self):
        with self.assertRaisesRegex(ValueError, "UNKNOWN_INCIDENT_CATEGORY"):
            containment_plan("unknown")

    def test_valid_lifecycle_transitions(self):
        incident = Incident("INC-1", "tenant_exposure", commander="commander")
        transition(incident, "TRIAGED")
        transition(incident, "CONTAINED", [self.evidence])
        transition(incident, "ERADICATED")
        transition(incident, "RECOVERING")
        transition(incident, "RESOLVED", [self.evidence])
        transition(incident, "REVIEWED")
        self.assertEqual(incident.status, "REVIEWED")

    def test_invalid_transition_rejected(self):
        with self.assertRaisesRegex(ValueError, "INVALID_INCIDENT_TRANSITION"):
            transition(Incident("INC-2", "provider_outage"), "RESOLVED", [self.evidence])

    def test_containment_requires_evidence_reference(self):
        incident = Incident("INC-3", "unsafe_tool")
        transition(incident, "TRIAGED")
        with self.assertRaisesRegex(ValueError, "EVIDENCE_REQUIRED"):
            transition(incident, "CONTAINED")

    def test_evidence_digest_and_custody(self):
        digest = evidence_digest(self.evidence)
        self.assertEqual(len(digest), 64)

    def test_unredacted_evidence_rejected(self):
        evidence = Evidence("EV-2", "raw-log", "responder", "2026-11-22T10:00:00Z", b"synthetic secret", False)
        with self.assertRaisesRegex(ValueError, "EVIDENCE_NOT_REDACTED"):
            evidence_digest(evidence)

    def test_incomplete_custody_metadata_rejected(self):
        evidence = Evidence("EV-3", "", "responder", "2026-11-22T10:00:00Z", b"safe", True)
        with self.assertRaisesRegex(ValueError, "INCOMPLETE_CUSTODY_METADATA"):
            evidence_digest(evidence)

    def test_recovery_gate_requires_every_control(self):
        decision = recovery_gate({"tenant_isolation": True, "quality": False, "slo": True}, ["tenant_isolation", "quality", "slo"])
        self.assertFalse(decision.allowed)
        self.assertIn("quality", decision.reason)

    def test_recovery_gate_approved_when_all_pass(self):
        decision = recovery_gate({"security": True, "data": True, "quality": True, "slo": True}, ["security", "data", "quality", "slo"])
        self.assertTrue(decision.allowed)

    def test_postmortem_requires_owner_due_date_and_verification(self):
        action = PostmortemAction("Add tenant isolation regression test", "platform-team", "2026-12-01", "CI test passes")
        self.assertTrue(validate_postmortem([action]).allowed)

    def test_ownerless_postmortem_action_rejected(self):
        action = PostmortemAction("Improve alerts", None, "2026-12-01", "Alert test")
        self.assertEqual(validate_postmortem([action]).reason, "ACTION_MISSING_ACCOUNTABILITY")

    def test_postmortem_requires_actions(self):
        self.assertEqual(validate_postmortem([]).reason, "NO_CORRECTIVE_ACTIONS")


if __name__ == "__main__":
    unittest.main()
