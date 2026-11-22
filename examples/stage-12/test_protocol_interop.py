import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).parent / "protocol_interop"))
from protocol_gateway import ProtocolGateway
from protocol_lab import (
    A2AAdapter, ACP_VERSION, AgentCard, AgentClientSession, IBMACPToA2ABridge,
    MCPAdapter, MCPRequest, MCPTool, NormalizedIntent, ProtocolError,
    VerifiedIdentity, normalize_intent,
)


def modern_mcp(method="tools/call", name="search", args=None, extra_headers=None):
    headers = {"MCP-Protocol-Version": "2026-07-28", "Mcp-Method": method}
    if method == "tools/call":
        headers["Mcp-Name"] = name
    headers.update(extra_headers or {})
    return MCPRequest("req-1", method, {"name": name, "arguments": args or {"query": "policy"}},
                      headers, {"io.modelcontextprotocol/clientInfo": {"name": "academy", "version": "1"}})


class MCPContractTests(unittest.TestCase):
    def setUp(self):
        self.mcp = MCPAdapter()
        self.mcp.register_tool(MCPTool("search", frozenset({"query"}),
                                       frozenset({"query", "limit"}),
                                       lambda args: {"matches": [args["query"]]}))

    def test_modern_stateless_tool_call(self):
        result = self.mcp.call_tool(modern_mcp(), expected_issuer="https://issuer.example",
                                    token_issuer="https://issuer.example")
        self.assertEqual(result["protocolVersion"], "2026-07-28")
        self.assertEqual(result["result"], {"matches": ["policy"]})

    def test_modern_protocol_rejects_removed_initialize(self):
        request = modern_mcp(method="initialize", name="", args={})
        with self.assertRaisesRegex(ProtocolError, "MCP_INITIALIZE_REMOVED"):
            self.mcp.validate_request(request)

    def test_method_header_must_match_jsonrpc_method(self):
        request = modern_mcp(extra_headers={"Mcp-Method": "resources/read"})
        with self.assertRaisesRegex(ProtocolError, "MCP_METHOD_ROUTING_HEADER_MISMATCH"):
            self.mcp.validate_request(request)

    def test_tool_name_header_must_match_params(self):
        request = modern_mcp(extra_headers={"Mcp-Name": "delete"})
        with self.assertRaisesRegex(ProtocolError, "MCP_TOOL_ROUTING_HEADER_MISMATCH"):
            self.mcp.validate_request(request)

    def test_unknown_tool_and_argument_schema_fail_closed(self):
        with self.assertRaisesRegex(ProtocolError, "MCP_TOOL_NOT_REGISTERED"):
            self.mcp.call_tool(modern_mcp(name="unknown"), expected_issuer="i", token_issuer="i")
        with self.assertRaisesRegex(ProtocolError, "MCP_TOOL_ARGUMENT_SCHEMA_MISMATCH"):
            self.mcp.call_tool(modern_mcp(args={"query": "x", "admin": True}),
                               expected_issuer="i", token_issuer="i")

    def test_authorization_issuer_mixup_is_rejected(self):
        with self.assertRaisesRegex(ProtocolError, "MCP_AUTHORIZATION_ISSUER_MISMATCH"):
            self.mcp.call_tool(modern_mcp(), expected_issuer="issuer-A", token_issuer="issuer-B")

    def test_multi_round_trip_requires_all_inputs(self):
        challenge = {"resultType": "input_required", "requiredInputs": ["approval", "region"]}
        with self.assertRaisesRegex(ProtocolError, "MCP_INPUT_RESPONSES_INCOMPLETE"):
            self.mcp.resume_multi_round_trip(challenge, {"approval": True})
        self.assertEqual(self.mcp.resume_multi_round_trip(
            challenge, {"approval": True, "region": "eu"})["resultType"], "resumed")

    def test_legacy_protocol_requires_initialize_session(self):
        legacy = MCPRequest("legacy-1", "tools/call", {"name": "search", "arguments": {"query": "x"}},
                            {"MCP-Protocol-Version": "2025-11-25"}, {})
        with self.assertRaisesRegex(ProtocolError, "MCP_LEGACY_INITIALIZE_REQUIRED"):
            self.mcp.validate_request(legacy, legacy_session="s-1")
        init = MCPRequest("init-1", "initialize", {}, {"MCP-Protocol-Version": "2025-11-25"}, {})
        self.mcp.validate_request(init, legacy_session="s-1")
        self.assertEqual(self.mcp.validate_request(legacy, legacy_session="s-1"), "2025-11-25")


class A2AContractTests(unittest.TestCase):
    def setUp(self):
        self.card = AgentCard("policy-agent", "https://agents.example/policy", "1.0.0",
                              ("policy-review",), streaming=True, push_notifications=True)
        self.a2a = A2AAdapter(self.card)

    def test_agent_card_is_versioned_and_https(self):
        self.assertEqual(self.a2a.card.protocol_version, "1.0.0")
        with self.assertRaisesRegex(ProtocolError, "A2A_AGENT_CARD_INVALID"):
            A2AAdapter(AgentCard("bad", "http://insecure", "1.0.0", ("review",)))

    def test_send_message_idempotency_replays_original_task(self):
        first = self.a2a.send_message("t-1", "ctx-1", "Review this policy", "idem-1")
        replay = self.a2a.send_message("t-1", "ctx-1", "Review this policy", "idem-1")
        self.assertIs(first, replay)
        with self.assertRaisesRegex(ProtocolError, "A2A_IDEMPOTENCY_PAYLOAD_MISMATCH"):
            self.a2a.send_message("t-2", "ctx-1", "Different request", "idem-1")

    def test_task_lifecycle_and_terminal_state(self):
        self.a2a.send_message("t-1", "ctx-1", "Review", "idem-1")
        self.a2a.transition("t-1", "working")
        self.a2a.transition("t-1", "completed", "Approved",
                            {"artifactId": "a-1", "parts": [{"text": "Decision"}]})
        with self.assertRaisesRegex(ProtocolError, "A2A_INVALID_TASK_STATE_TRANSITION"):
            self.a2a.transition("t-1", "working")

    def test_stream_order_and_capability_gate(self):
        self.a2a.send_message("t-1", "ctx-1", "Review", "idem-1")
        self.a2a.transition("t-1", "working")
        self.a2a.transition("t-1", "completed")
        events = self.a2a.stream("t-1")
        self.assertEqual([event["sequence"] for event in events], [1, 2, 3])
        no_stream = A2AAdapter(AgentCard("no-stream", "https://a.example", "1.0.0", ("x",)))
        no_stream.send_message("t", "c", "hello", "k")
        with self.assertRaisesRegex(ProtocolError, "A2A_STREAMING_NOT_ADVERTISED"):
            no_stream.stream("t")
        with self.assertRaisesRegex(ProtocolError, "A2A_PUSH_NOTIFICATIONS_NOT_ADVERTISED"):
            no_stream.configure_push()


class ACPContractTests(unittest.TestCase):
    def test_initialize_negotiate_session_and_prompt(self):
        client = AgentClientSession()
        with self.assertRaisesRegex(ProtocolError, "ACP_INITIALIZE_REQUIRED"):
            client.new_session("/workspace/repo")
        client.initialize("rpc-1", ACP_VERSION, {"fs": {"readTextFile": True}, "terminal": False})
        session = client.new_session("/workspace/repo")
        result = client.prompt(session, "Explain this function")
        self.assertEqual(result["sessionId"], session)
        self.assertEqual(result["updates"][-1]["stopReason"], "end_turn")

    def test_client_capabilities_gate_file_and_terminal(self):
        client = AgentClientSession()
        client.initialize(1, ACP_VERSION, {"fs": {"readTextFile": False}, "terminal": False})
        with self.assertRaisesRegex(ProtocolError, "ACP_CLIENT_FILE_READ_NOT_ADVERTISED"):
            client.client_file_read("/workspace/a.txt", {"/workspace/a.txt": "safe"})
        with self.assertRaisesRegex(ProtocolError, "ACP_TERMINAL_NOT_ADVERTISED"):
            client.request_terminal_permission(True)
        terminal_client = AgentClientSession()
        terminal_client.initialize(1, ACP_VERSION, {"terminal": True})
        with self.assertRaisesRegex(ProtocolError, "ACP_PERMISSION_DENIED"):
            terminal_client.request_terminal_permission(False)

    def test_workspace_boundary_and_cancellation(self):
        client = AgentClientSession()
        client.initialize(1, ACP_VERSION, {})
        with self.assertRaisesRegex(ProtocolError, "ACP_CWD_OUTSIDE_WORKSPACE"):
            client.new_session("/etc")
        session = client.new_session("/workspace/repo")
        client.cancel(session)
        with self.assertRaisesRegex(ProtocolError, "ACP_SESSION_CANCELED"):
            client.prompt(session, "Continue")

    def test_protocol_version_mismatch_rejected(self):
        with self.assertRaisesRegex(ProtocolError, "ACP_PROTOCOL_VERSION_UNSUPPORTED"):
            AgentClientSession().initialize(1, 1, {})


class MigrationAndIdentityTests(unittest.TestCase):
    def test_ibm_beeai_acp_message_maps_to_a2a_context_and_parts(self):
        mapped = IBMACPToA2ABridge.to_a2a_message({
            "sender": "research", "receiver": "policy", "session_id": "legacy-session",
            "message": "Review clause 7"
        })
        self.assertEqual(mapped["contextId"], "legacy-session")
        self.assertEqual(mapped["message"]["parts"][0]["text"], "Review clause 7")
        self.assertEqual(mapped["metadata"]["migratedFrom"], "ibm-beeai-acp")
        self.assertIn("Review auth", mapped["migrationWarning"])

    def test_gateway_authorizes_using_verified_tenant_and_scope(self):
        gateway = ProtocolGateway()
        identity = VerifiedIdentity("user-7", "tenant-A", frozenset({"docs:read"}))
        intent = gateway.normalize("mcp", "req-1", identity, "read", "doc-1")
        allowed = gateway.authorize(intent, "docs:read", "tenant-A", "doc-1")
        denied = gateway.authorize(intent, "docs:write", "tenant-A", "doc-1")
        cross_tenant = gateway.authorize(intent, "docs:read", "tenant-B", "doc-1")
        self.assertTrue(allowed.allowed)
        self.assertEqual(denied.reason, "SCOPE_MISSING")
        self.assertEqual(cross_tenant.reason, "TENANT_MISMATCH")

    def test_identity_is_taken_from_verified_context_not_wire_claims(self):
        identity = VerifiedIdentity("user-7", "tenant-A", frozenset({"agent:delegate"}))
        normalized = normalize_intent("a2a", "rpc-9", identity, "delegate", "agent-B")
        self.assertIsInstance(normalized, NormalizedIntent)
        self.assertEqual(normalized.subject, "user-7")
        self.assertEqual(normalized.tenant_id, "tenant-A")
        with self.assertRaisesRegex(ProtocolError, "TRUSTED_CONTEXT_INCOMPLETE"):
            normalize_intent("mcp", 1, VerifiedIdentity("", "tenant-A", frozenset()), "read", "doc-1")


if __name__ == "__main__":
    unittest.main()
