"""Offline protocol-contract lab for MCP 2026-07-28, A2A 1.0 and ACP v2.

No sockets, OAuth provider, IDE, remote agent or arbitrary tool code is executed.
The adapters model selected wire-contract invariants for deterministic testing.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
import json
from pathlib import PurePosixPath
from typing import Callable


class ProtocolError(ValueError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _safe_workspace_path(path: str) -> bool:
    if not isinstance(path, str) or not path.startswith("/workspace/"):
        return False
    parts = PurePosixPath(path).parts
    return all(part not in {".", ".."} for part in parts)


def _digest(value: dict) -> str:
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


@dataclass(frozen=True)
class VerifiedIdentity:
    subject: str
    tenant_id: str
    scopes: frozenset[str]


@dataclass(frozen=True)
class NormalizedIntent:
    protocol: str
    request_id: str | int
    subject: str
    tenant_id: str
    scopes: frozenset[str]
    action: str
    resource_id: str


def normalize_intent(protocol: str, request_id: str | int, identity: VerifiedIdentity,
                     action: str, resource_id: str) -> NormalizedIntent:
    if not identity.subject or not identity.tenant_id or not action or not resource_id:
        raise ProtocolError("TRUSTED_CONTEXT_INCOMPLETE")
    if isinstance(request_id, bool) or not isinstance(request_id, (str, int)):
        raise ProtocolError("INVALID_REQUEST_ID")
    return NormalizedIntent(protocol, request_id, identity.subject, identity.tenant_id,
                            identity.scopes, action, resource_id)


# ---------------------------------------------------------------------------
# MCP: model ↔ context server (tools, resources and prompts)
# ---------------------------------------------------------------------------

MCP_MODERN = "2026-07-28"
MCP_LEGACY = {"2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"}


@dataclass(frozen=True)
class MCPRequest:
    request_id: str | int
    method: str
    params: dict
    headers: dict[str, str]
    meta: dict
    jsonrpc: str = "2.0"


@dataclass(frozen=True)
class MCPTool:
    name: str
    required: frozenset[str]
    allowed: frozenset[str]
    handler: Callable[[dict], dict]


class MCPAdapter:
    def __init__(self):
        self.tools: dict[str, MCPTool] = {}
        self._legacy_sessions: dict[str, str] = {}

    def register_tool(self, tool: MCPTool) -> None:
        if not tool.name or tool.name in self.tools or not tool.required <= tool.allowed:
            raise ProtocolError("INVALID_TOOL_REGISTRATION")
        self.tools[tool.name] = tool

    def validate_request(self, request: MCPRequest, *, legacy_session: str | None = None) -> str:
        if request.jsonrpc != "2.0":
            raise ProtocolError("MCP_JSONRPC_VERSION_UNSUPPORTED")
        if isinstance(request.request_id, bool) or not isinstance(request.request_id, (str, int)):
            raise ProtocolError("MCP_INVALID_REQUEST_ID")
        header_version = request.headers.get("MCP-Protocol-Version")
        meta_version = request.meta.get("io.modelcontextprotocol/protocolVersion")
        version = header_version or meta_version
        if not version or (header_version and meta_version and header_version != meta_version):
            raise ProtocolError("MCP_PROTOCOL_VERSION_MISSING_OR_MISMATCHED")
        if version == MCP_MODERN:
            if request.method == "initialize":
                raise ProtocolError("MCP_INITIALIZE_REMOVED_IN_STATELESS_VERSION")
            if not request.meta.get("io.modelcontextprotocol/clientInfo"):
                raise ProtocolError("MCP_CLIENT_INFO_REQUIRED")
            if request.headers.get("Mcp-Method") != request.method:
                raise ProtocolError("MCP_METHOD_ROUTING_HEADER_MISMATCH")
            if request.method == "tools/call":
                tool_name = request.params.get("name")
                if request.headers.get("Mcp-Name") != tool_name:
                    raise ProtocolError("MCP_TOOL_ROUTING_HEADER_MISMATCH")
        elif version in MCP_LEGACY:
            if request.method == "initialize":
                if not legacy_session:
                    raise ProtocolError("MCP_LEGACY_SESSION_ID_REQUIRED")
                self._legacy_sessions[legacy_session] = version
            elif not legacy_session or self._legacy_sessions.get(legacy_session) != version:
                raise ProtocolError("MCP_LEGACY_INITIALIZE_REQUIRED")
        else:
            raise ProtocolError("MCP_UNSUPPORTED_PROTOCOL_VERSION")
        return version

    def call_tool(self, request: MCPRequest, *, expected_issuer: str, token_issuer: str,
                  legacy_session: str | None = None) -> dict:
        version = self.validate_request(request, legacy_session=legacy_session)
        if request.method != "tools/call":
            raise ProtocolError("MCP_METHOD_NOT_TOOL_CALL")
        if token_issuer != expected_issuer:
            raise ProtocolError("MCP_AUTHORIZATION_ISSUER_MISMATCH")
        name = request.params.get("name")
        tool = self.tools.get(name)
        if not tool:
            raise ProtocolError("MCP_TOOL_NOT_REGISTERED")
        arguments = request.params.get("arguments", {})
        if not isinstance(arguments, dict) or not tool.required <= set(arguments) or not set(arguments) <= tool.allowed:
            raise ProtocolError("MCP_TOOL_ARGUMENT_SCHEMA_MISMATCH")
        result = tool.handler(arguments)
        return {"protocolVersion": version, "requestId": request.request_id, "result": result}

    @staticmethod
    def resume_multi_round_trip(result: dict, input_responses: dict) -> dict:
        if result.get("resultType") != "input_required":
            raise ProtocolError("MCP_NO_INPUT_REQUIRED")
        required = set(result.get("requiredInputs", []))
        if not required <= set(input_responses):
            raise ProtocolError("MCP_INPUT_RESPONSES_INCOMPLETE")
        return {"resultType": "resumed", "inputResponses": input_responses}


# ---------------------------------------------------------------------------
# A2A: independent agent ↔ agent task communication
# ---------------------------------------------------------------------------

A2A_VERSION = "1.0.0"
A2A_STATES = {"submitted", "working", "input_required", "auth_required",
              "completed", "failed", "canceled", "rejected"}
A2A_TERMINAL = {"completed", "failed", "canceled", "rejected"}
A2A_TRANSITIONS = {
    "submitted": {"working", "rejected", "canceled"},
    "working": {"input_required", "auth_required", "completed", "failed", "canceled"},
    "input_required": {"working", "rejected", "canceled"},
    "auth_required": {"working", "rejected", "canceled"},
}


@dataclass(frozen=True)
class AgentCard:
    name: str
    url: str
    protocol_version: str
    skills: tuple[str, ...]
    streaming: bool = False
    push_notifications: bool = False
    auth_schemes: tuple[str, ...] = ("oauth2",)


@dataclass
class A2ATask:
    task_id: str
    context_id: str
    state: str = "submitted"
    history: list[dict] = field(default_factory=list)
    artifacts: list[dict] = field(default_factory=list)
    events: list[dict] = field(default_factory=list)


class A2AAdapter:
    def __init__(self, card: AgentCard):
        if (not card.name or not card.url.startswith("https://")
                or card.protocol_version != A2A_VERSION or not card.skills
                or len(set(card.skills)) != len(card.skills)):
            raise ProtocolError("A2A_AGENT_CARD_INVALID")
        self.card = card
        self.tasks: dict[str, A2ATask] = {}
        self.idempotency: dict[str, tuple[str, str]] = {}

    def send_message(self, task_id: str, context_id: str, text: str, idempotency_key: str) -> A2ATask:
        if not task_id or not context_id or not text or not idempotency_key:
            raise ProtocolError("A2A_MESSAGE_FIELDS_REQUIRED")
        digest = _digest({"task_id": task_id, "context_id": context_id, "text": text})
        prior = self.idempotency.get(idempotency_key)
        if prior:
            if prior[0] != digest:
                raise ProtocolError("A2A_IDEMPOTENCY_PAYLOAD_MISMATCH")
            return self.tasks[prior[1]]
        if task_id in self.tasks:
            raise ProtocolError("A2A_TASK_ID_ALREADY_EXISTS")
        task = A2ATask(task_id, context_id, history=[{"role": "user", "parts": [{"text": text}]}])
        self.tasks[task_id] = task
        self.idempotency[idempotency_key] = (digest, task_id)
        self._event(task, "task", {"state": "submitted"})
        return task

    def _event(self, task: A2ATask, kind: str, payload: dict) -> None:
        task.events.append({"sequence": len(task.events) + 1, "kind": kind, "payload": payload})

    def transition(self, task_id: str, next_state: str, message: str | None = None,
                   artifact: dict | None = None) -> A2ATask:
        task = self.tasks.get(task_id)
        if not task:
            raise ProtocolError("A2A_TASK_NOT_FOUND")
        if next_state not in A2A_STATES or next_state not in A2A_TRANSITIONS.get(task.state, set()):
            raise ProtocolError("A2A_INVALID_TASK_STATE_TRANSITION")
        if artifact and (not artifact.get("artifactId") or not artifact.get("parts")):
            raise ProtocolError("A2A_ARTIFACT_INVALID")
        # Validate all inputs before mutating durable task state.
        task.state = next_state
        if message:
            task.history.append({"role": "agent", "parts": [{"text": message}]})
        if artifact:
            task.artifacts.append(artifact)
        self._event(task, "status", {"state": next_state, "message": message})
        if artifact:
            self._event(task, "artifact", artifact)
        return task

    def stream(self, task_id: str) -> list[dict]:
        if not self.card.streaming:
            raise ProtocolError("A2A_STREAMING_NOT_ADVERTISED")
        task = self.tasks.get(task_id)
        if not task:
            raise ProtocolError("A2A_TASK_NOT_FOUND")
        events = list(task.events)
        if [event["sequence"] for event in events] != list(range(1, len(events) + 1)):
            raise ProtocolError("A2A_EVENT_ORDER_INVALID")
        return events

    def configure_push(self) -> None:
        if not self.card.push_notifications:
            raise ProtocolError("A2A_PUSH_NOTIFICATIONS_NOT_ADVERTISED")


# ---------------------------------------------------------------------------
# ACP: IDE/editor ↔ coding-agent client protocol (not agent ↔ agent)
# ---------------------------------------------------------------------------

ACP_VERSION = 2


class AgentClientSession:
    def __init__(self, supported_version: int = ACP_VERSION):
        self.supported_version = supported_version
        self.initialized = False
        self.client_capabilities: dict = {}
        self.sessions: dict[str, dict] = {}
        self.next_session = 1

    def initialize(self, request_id: str | int, protocol_version: int, client_capabilities: dict) -> dict:
        if isinstance(request_id, bool) or not isinstance(request_id, (str, int)):
            raise ProtocolError("ACP_INVALID_JSONRPC_REQUEST_ID")
        if protocol_version != self.supported_version:
            raise ProtocolError("ACP_PROTOCOL_VERSION_UNSUPPORTED")
        self.client_capabilities = dict(client_capabilities)
        self.initialized = True
        return {"jsonrpc": "2.0", "id": request_id,
                "result": {"protocolVersion": self.supported_version, "agentCapabilities": {
                    "session": True, "prompt": True, "cancel": True}}}

    def new_session(self, cwd: str) -> str:
        if not self.initialized:
            raise ProtocolError("ACP_INITIALIZE_REQUIRED")
        if not _safe_workspace_path(cwd):
            raise ProtocolError("ACP_CWD_OUTSIDE_WORKSPACE")
        session_id = f"session-{self.next_session}"
        self.next_session += 1
        self.sessions[session_id] = {"cwd": cwd, "state": "idle", "updates": []}
        return session_id

    def prompt(self, session_id: str, text: str) -> dict:
        session = self.sessions.get(session_id)
        if not session or not text:
            raise ProtocolError("ACP_SESSION_OR_PROMPT_INVALID")
        if session["state"] == "canceled":
            raise ProtocolError("ACP_SESSION_CANCELED")
        session["state"] = "working"
        update = {"type": "agent_message_chunk", "text": f"Accepted: {text}"}
        session["updates"].append(update)
        session["state"] = "idle"
        session["updates"].append({"type": "state_update", "stopReason": "end_turn"})
        return {"sessionId": session_id, "updates": list(session["updates"])}

    def client_file_read(self, path: str, files: dict[str, str]) -> str:
        fs = self.client_capabilities.get("fs", {})
        if not fs.get("readTextFile", False):
            raise ProtocolError("ACP_CLIENT_FILE_READ_NOT_ADVERTISED")
        if not _safe_workspace_path(path) or path not in files:
            raise ProtocolError("ACP_FILE_OUTSIDE_OR_MISSING")
        return files[path]

    def client_file_write(self, path: str, content: str, files: dict[str, str]) -> None:
        fs = self.client_capabilities.get("fs", {})
        if not fs.get("writeTextFile", False):
            raise ProtocolError("ACP_CLIENT_FILE_WRITE_NOT_ADVERTISED")
        if not _safe_workspace_path(path):
            raise ProtocolError("ACP_FILE_OUTSIDE_WORKSPACE")
        files[path] = content

    def request_terminal_permission(self, approved: bool) -> bool:
        if not self.client_capabilities.get("terminal", False):
            raise ProtocolError("ACP_TERMINAL_NOT_ADVERTISED")
        if not approved:
            raise ProtocolError("ACP_PERMISSION_DENIED")
        return True

    def cancel(self, session_id: str) -> None:
        session = self.sessions.get(session_id)
        if not session:
            raise ProtocolError("ACP_SESSION_NOT_FOUND")
        session["state"] = "canceled"
        session["updates"].append({"type": "state_update", "stopReason": "cancelled"})


# ---------------------------------------------------------------------------
# Legacy IBM/BeeAI Agent Communication Protocol → A2A migration bridge
# ---------------------------------------------------------------------------

class IBMACPToA2ABridge:
    """Narrow message mapping; it does not claim wire-level compatibility."""
    @staticmethod
    def to_a2a_message(legacy: dict) -> dict:
        if not legacy.get("sender") or not legacy.get("receiver") or not legacy.get("message"):
            raise ProtocolError("IBM_ACP_LEGACY_MESSAGE_INVALID")
        session = legacy.get("session_id") or "legacy-context"
        return {
            "contextId": session,
            "message": {"role": "user", "parts": [{"text": legacy["message"]}]},
            "metadata": {"migratedFrom": "ibm-beeai-acp", "legacySender": legacy["sender"],
                         "legacyReceiver": legacy["receiver"]},
            "migrationWarning": "Review auth, task lifecycle, artifacts and streaming semantics explicitly."
        }

def demo() -> None:
    mcp = MCPAdapter()
    mcp.register_tool(MCPTool("search", frozenset({"query"}), frozenset({"query"}),
                              lambda args: {"hits": 2, "query": args["query"]}))
    request = MCPRequest("m-1", "tools/call", {"name": "search", "arguments": {"query": "RAG"}},
                         {"MCP-Protocol-Version": MCP_MODERN, "Mcp-Method": "tools/call", "Mcp-Name": "search"},
                         {"io.modelcontextprotocol/clientInfo": {"name": "academy", "version": "1"}})
    mcp_result = mcp.call_tool(request, expected_issuer="https://issuer.example",
                               token_issuer="https://issuer.example")
    a2a = A2AAdapter(AgentCard("reviewer", "https://agent.example/review", A2A_VERSION,
                               ("policy-review",), streaming=True))
    a2a.send_message("task-1", "ctx-1", "Review policy", "idem-1")
    a2a.transition("task-1", "working")
    a2a.transition("task-1", "completed")
    acp = AgentClientSession()
    acp.initialize("init-1", ACP_VERSION, {"fs": {"readTextFile": True}, "terminal": False})
    session = acp.new_session("/workspace/repo")
    acp_result = acp.prompt(session, "Explain the API")
    legacy = IBMACPToA2ABridge.to_a2a_message(
        {"sender": "legacy-agent", "receiver": "a2a-agent", "message": "hello"})
    print(f"mcp={mcp_result['result']['hits']} a2a={a2a.tasks['task-1'].state} "
          f"acp={acp_result['updates'][-1]['stopReason']} ibm_acp_mapped={legacy['contextId']}")


if __name__ == "__main__":
    demo()
