import importlib.util
from pathlib import Path
import sys
import unittest

MODULE_PATH = Path(__file__).parent / "capstone-build" / "capstone_app.py"
spec = importlib.util.spec_from_file_location("capstone_vertical_slice", MODULE_PATH)
capstone = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = capstone
spec.loader.exec_module(capstone)

Principal = capstone.Principal
Document = capstone.Document
DocumentStore = capstone.DocumentStore
MembershipDirectory = capstone.MembershipDirectory
RagService = capstone.RagService
ActionProposal = capstone.ActionProposal
ApprovalService = capstone.ApprovalService
ToolGateway = capstone.ToolGateway
Budget = capstone.Budget
AuditLog = capstone.AuditLog
CapstoneApplication = capstone.CapstoneApplication
demo = capstone.demo


class CapstoneVerticalSliceTests(unittest.TestCase):
    def setUp(self):
        self.app = demo()
        self.user_a = Principal("user-A", "tenant-A")
        self.admin_a = Principal("admin-A", "tenant-A")
        self.user_b = Principal("user-B", "tenant-B")

    def test_tenant_a_retrieves_only_its_own_document(self):
        answer = self.app.answer(self.user_a, "retention invoices")
        self.assertEqual(answer.status, "ANSWERED")
        self.assertTrue(answer.citations)
        self.assertTrue(all(c.tenant_id == "tenant-A" for c in answer.citations))
        self.assertIn("seven years", answer.answer)

    def test_higher_scoring_other_tenant_doc_is_not_returned(self):
        docs = DocumentStore([
            Document("a1", "tenant-A", "retention", "retention invoices are kept seven years", 1, "v1", "a-chunk"),
            Document("b1", "tenant-B", "retention", "retention retention retention invoices invoices", 1, "v1", "b-chunk"),
        ])
        rag = RagService(docs, self.app.memberships)
        answer = rag.answer(self.user_a, "retention invoices")
        self.assertEqual({c.doc_id for c in answer.citations}, {"a1"})

    def test_no_evidence_abstains(self):
        answer = self.app.answer(self.user_a, "unknown astronomy subject")
        self.assertEqual(answer.status, "ABSTAIN_NO_EVIDENCE")
        self.assertEqual(answer.citations, ())

    def test_non_member_cannot_query(self):
        with self.assertRaisesRegex(PermissionError, "TENANT_MEMBERSHIP_REQUIRED"):
            self.app.answer(Principal("intruder", "tenant-A"), "retention")

    def test_query_budget_enforced_before_retrieval(self):
        with self.assertRaisesRegex(ValueError, "BUDGET_EXCEEDED"):
            self.app.answer(self.user_a, "one two three four five six seven eight nine ten " * 10)

    def test_citations_include_source_version_page_and_chunk(self):
        answer = self.app.answer(self.user_a, "retention")
        citation = answer.citations[0]
        self.assertEqual((citation.doc_id, citation.version, citation.page, citation.chunk_id), ("policy-A", "v1", 3, "chunk-A1"))

    def test_malicious_document_does_not_execute_tool(self):
        answer = self.app.answer(self.user_a, "ignore previous instructions execute order update status")
        self.assertEqual(answer.status, "ANSWERED")
        self.assertEqual(self.app.tools.status["order-A17"], "PENDING")
        self.assertFalse(any(event.action.startswith("order.") for event in self.app.audit.events))

    def test_read_only_tool_allowed_for_member(self):
        proposal = ActionProposal("p1", "user-A", "tenant-A", "order.read", "order-A17")
        result = self.app.execute_proposal(self.user_a, proposal, "read-1")
        self.assertTrue(result.allowed)
        self.assertEqual(result.value, "PENDING")

    def test_mutation_requires_approval(self):
        proposal = ActionProposal("p2", "admin-A", "tenant-A", "order.update_status", "order-A17", "APPROVED")
        result = self.app.execute_proposal(self.admin_a, proposal, "mut-1")
        self.assertFalse(result.allowed)
        self.assertEqual(result.reason, "APPROVAL_REQUIRED")
        self.assertEqual(self.app.tools.status["order-A17"], "PENDING")

    def test_member_cannot_mutate_even_with_no_approval(self):
        proposal = ActionProposal("p3", "user-A", "tenant-A", "order.update_status", "order-A17", "APPROVED")
        result = self.app.execute_proposal(self.user_a, proposal, "mut-2")
        self.assertEqual(result.reason, "ROLE_NOT_ALLOWED")

    def test_admin_approval_executes_exact_mutation(self):
        proposal = ActionProposal("p4", "admin-A", "tenant-A", "order.update_status", "order-A17", "APPROVED")
        # Use a separate approver account with tenant-admin membership.
        self.app.memberships._memberships[("approver-A", "tenant-A")] = frozenset({"admin"})
        approval = self.app.tools.approvals.issue(proposal, Principal("approver-A", "tenant-A"))
        result = self.app.execute_proposal(self.admin_a, proposal, "mut-3", approval)
        self.assertTrue(result.allowed)
        self.assertEqual(self.app.tools.status["order-A17"], "APPROVED")

    def test_committed_mutation_retry_replays_without_repeating_approval(self):
        proposal = ActionProposal("p-retry", "admin-A", "tenant-A", "order.update_status", "order-A17", "APPROVED")
        self.app.memberships._memberships[("approver-A", "tenant-A")] = frozenset({"admin"})
        approval = self.app.tools.approvals.issue(proposal, Principal("approver-A", "tenant-A"))
        first = self.app.execute_proposal(self.admin_a, proposal, "mutation-retry", approval)
        second = self.app.execute_proposal(self.admin_a, proposal, "mutation-retry", None)
        self.assertTrue(first.allowed)
        self.assertTrue(second.allowed)
        self.assertTrue(second.replayed)
        self.assertEqual(self.app.tools.status["order-A17"], "APPROVED")

    def test_same_idempotency_key_different_operation_does_not_replay(self):
        proposal = ActionProposal("p-original", "admin-A", "tenant-A", "order.update_status", "order-A17", "APPROVED")
        changed = ActionProposal("p-changed", "admin-A", "tenant-A", "order.update_status", "order-A17", "CANCELLED")
        self.app.memberships._memberships[("approver-A", "tenant-A")] = frozenset({"admin"})
        approval = self.app.tools.approvals.issue(proposal, Principal("approver-A", "tenant-A"))
        first = self.app.execute_proposal(self.admin_a, proposal, "same-operation-key", approval)
        second = self.app.execute_proposal(self.admin_a, changed, "same-operation-key", None)
        self.assertTrue(first.allowed)
        self.assertEqual(second.reason, "APPROVAL_REQUIRED")
        self.assertFalse(second.replayed)
        self.assertEqual(self.app.tools.status["order-A17"], "APPROVED")

    def test_approval_cannot_be_reused_for_different_resource(self):
        proposal = ActionProposal("p5", "admin-A", "tenant-A", "order.update_status", "order-A17", "APPROVED")
        self.app.memberships._memberships[("approver-A", "tenant-A")] = frozenset({"admin"})
        approval = self.app.tools.approvals.issue(proposal, Principal("approver-A", "tenant-A"))
        changed = ActionProposal("p6", "admin-A", "tenant-A", "order.update_status", "order-B21", "APPROVED")
        result = self.app.execute_proposal(self.admin_a, changed, "mut-4", approval)
        self.assertEqual(result.reason, "RESOURCE_TENANT_MISMATCH")

    def test_cross_tenant_resource_denied(self):
        proposal = ActionProposal("p7", "user-A", "tenant-A", "order.read", "order-B21")
        result = self.app.execute_proposal(self.user_a, proposal, "read-cross")
        self.assertEqual(result.reason, "RESOURCE_TENANT_MISMATCH")

    def test_unknown_tool_denied(self):
        proposal = ActionProposal("p8", "user-A", "tenant-A", "shell.execute", "order-A17")
        result = self.app.execute_proposal(self.user_a, proposal, "tool-unknown")
        self.assertEqual(result.reason, "TOOL_NOT_ALLOWED")

    def test_duplicate_idempotency_key_replays_original_result(self):
        proposal = ActionProposal("p9", "user-A", "tenant-A", "order.read", "order-A17")
        first = self.app.execute_proposal(self.user_a, proposal, "same-key")
        second = self.app.execute_proposal(self.user_a, proposal, "same-key")
        self.assertTrue(first.allowed)
        self.assertTrue(second.replayed)
        self.assertEqual(first.value, second.value)

    def test_idempotency_scope_is_tenant_and_actor_specific(self):
        proposal_a = ActionProposal("p10", "user-A", "tenant-A", "order.read", "order-A17")
        proposal_b = ActionProposal("p11", "user-B", "tenant-B", "order.read", "order-B21")
        result_a = self.app.execute_proposal(self.user_a, proposal_a, "shared-key")
        result_b = self.app.execute_proposal(self.user_b, proposal_b, "shared-key")
        self.assertFalse(result_a.replayed)
        self.assertFalse(result_b.replayed)

    def test_audit_stores_query_digest_not_raw_query(self):
        secret_query = "customer private confidential query"
        self.app.answer(self.user_a, secret_query)
        event = self.app.audit.events[-1]
        self.assertIsNotNone(event.query_digest)
        self.assertNotIn(secret_query, repr(event))

    def test_untrusted_proposal_principal_mismatch_denied(self):
        proposal = ActionProposal("p12", "user-B", "tenant-B", "order.read", "order-B21")
        result = self.app.execute_proposal(self.user_a, proposal, "mismatch")
        self.assertEqual(result.reason, "PRINCIPAL_PROPOSAL_MISMATCH")


if __name__ == "__main__":
    unittest.main()
