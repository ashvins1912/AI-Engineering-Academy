"""A deterministic Agent Client Protocol v2 session simulator."""
from pathlib import PurePosixPath
import posixpath
import itertools
import base64

PROTOCOL_VERSION = 2
TERMINAL_TOOL_STATES = {"completed", "failed", "cancelled"}

def validate_jsonrpc_message(message):
    if isinstance(message, list) or not isinstance(message, dict):
        raise ValueError("ACP v2 does not accept JSON-RPC batch arrays")
    if message.get("jsonrpc") != "2.0" or not isinstance(message.get("method"), str):
        raise ValueError("invalid JSON-RPC request")
    if "id" in message and (message["id"] is None or isinstance(message["id"], bool) or not isinstance(message["id"], (str, int))):
        raise ValueError("request ID must be a string or integer")
    return True

class ACPConnection:
    def __init__(self, supported_versions=(2,)):
        self.supported_versions = tuple(supported_versions)
        self.initialized = False
        self.version = None
        self.client_capabilities = {}
        self.agent_capabilities = {}
        self.sessions = {}
        self.requests = itertools.count(1)
        self.tool_calls = {}
        self.events = []

    @staticmethod
    def _workspace_path(path, roots):
        raw = PurePosixPath(path)
        if not raw.is_absolute() or ".." in raw.parts:
            raise PermissionError("workspace path must be absolute and cannot traverse parents")
        normalized = PurePosixPath(posixpath.normpath(str(raw)))
        normalized_roots = [PurePosixPath(posixpath.normpath(root)) for root in roots]
        if not any(str(normalized) == str(root) or str(normalized).startswith(str(root).rstrip("/") + "/") for root in normalized_roots):
            raise PermissionError("path is outside negotiated workspace roots")
        return normalized

    def _request_id(self):
        return next(self.requests)

    def initialize(self, client_info, client_capabilities, agent_capabilities, requested_version):
        if self.initialized:
            raise ValueError("initialize may only be repeated before other requests")
        compatible = [v for v in self.supported_versions if v <= requested_version]
        if not compatible:
            raise ValueError("no compatible ACP protocol version")
        self.version = max(compatible)
        self.client_capabilities = dict(client_capabilities or {})
        self.agent_capabilities = dict(agent_capabilities or {})
        self.initialized = True
        return {"jsonrpc":"2.0","id":self._request_id(),"result":{
            "protocolVersion":self.version,
            "agentInfo":{"name":"academy-agent","version":"1.0"},
            "capabilities":self.agent_capabilities,
            "clientInfo":dict(client_info),
        }}

    def _require_init(self):
        if not self.initialized:
            raise ValueError("initialize must complete before session methods")

    def session_new(self, cwd, session_id, roots, mcp_servers=None):
        self._require_init()
        if not self.agent_capabilities.get("session"):
            raise PermissionError("agent did not advertise session capability")
        if not roots:
            raise ValueError("at least one workspace root is required")
        normalized_roots = [str(PurePosixPath(posixpath.normpath(r))) for r in roots]
        path = self._workspace_path(cwd, normalized_roots)
        self.sessions[session_id] = {
            "cwd": str(path), "roots": normalized_roots,
            "mcp_servers": list(mcp_servers or []), "state":"idle",
            "history":[], "updates":[], "tool_calls":{},
        }
        return {"sessionId":session_id,"state":"idle"}

    def session_resume(self, session_id, replay_from=None):
        self._require_init()
        session = self._session(session_id)
        if replay_from not in (None, {"type":"start"}):
            raise ValueError("unsupported replay cursor")
        return {"sessionId":session_id,"state":session["state"],
                "history":list(session["history"]) if replay_from == {"type":"start"} else [],
                "snapshot":dict(session["updates"][-1]) if session["updates"] else None}

    def _session(self, session_id):
        if session_id not in self.sessions:
            raise KeyError("session not found")
        return self.sessions[session_id]

    def session_prompt(self, session_id, parts):
        self._require_init()
        session = self._session(session_id)
        if session["state"] == "running":
            raise RuntimeError("foreground prompt already running")
        if not parts:
            raise ValueError("prompt parts required")
        session["history"].append({"role":"user","parts":list(parts)})
        session["state"] = "running"
        return {"jsonrpc":"2.0","id":self._request_id(),"result":{"accepted":True,"sessionId":session_id}}

    def session_update(self, session_id, update):
        session = self._session(session_id)
        if not isinstance(update, dict) or not update.get("sessionUpdate"):
            raise ValueError("typed session update required")
        session["updates"].append(dict(update))
        self.events.append({"sessionId":session_id,"sequence":len(session["updates"]),"update":dict(update)})
        if update["sessionUpdate"] == "state_update" and update.get("state") in {"idle","running","requires_action"}:
            session["state"] = update["state"]
        return len(session["updates"])

    def request_permission(self, session_id, title, options, selected_option=None):
        session = self._session(session_id)
        valid = {option["optionId"]:option for option in options}
        if not valid:
            raise ValueError("permission options required")
        if selected_option is None:
            outcome = {"outcome":"cancelled"}
        elif selected_option not in valid:
            outcome = {"outcome":"cancelled"}
        else:
            kind = valid[selected_option]["kind"]
            if kind not in {"allow_once","allow_always","reject_once","reject_always"}:
                outcome = {"outcome":"cancelled"}
            elif kind.startswith("allow_"):
                outcome = {"outcome":"selected","optionId":selected_option}
            else:
                outcome = {"outcome":"selected","optionId":selected_option}
        approved = outcome.get("outcome") == "selected" and valid[outcome["optionId"]]["kind"].startswith("allow_")
        if not approved and session["state"] == "running":
            session["state"] = "requires_action"
        return {"title":title,"outcome":outcome,"approved":approved}

    def tool_call_update(self, session_id, tool_call_id, status, cancel_supported=False):
        session = self._session(session_id)
        if status not in {"pending","in_progress","paused","completed","failed","cancelled"}:
            raise ValueError("unknown tool call status")
        prior = session["tool_calls"].get(tool_call_id)
        if prior and prior["status"] in TERMINAL_TOOL_STATES and status != prior["status"]:
            raise ValueError("terminal tool call cannot transition")
        item = {"toolCallId":tool_call_id,"status":status,"cancelSupported":bool(cancel_supported)}
        session["tool_calls"][tool_call_id] = item
        return dict(item)

    def tool_call_content_chunk(self, session_id, tool_call_id, content):
        session = self._session(session_id)
        call = session["tool_calls"].setdefault(tool_call_id, {"toolCallId":tool_call_id,"status":"pending","cancelSupported":False,"content":[]})
        call.setdefault("content", []).append(dict(content))
        return len(call["content"])

    def tool_call_cancel(self, session_id, tool_call_id):
        session = self._session(session_id)
        call = session["tool_calls"].get(tool_call_id)
        if not call or not call["cancelSupported"] or call["status"] in TERMINAL_TOOL_STATES:
            raise PermissionError("tool call is not cancellable")
        # Acceptance is not proof of termination; a later update sets final status.
        return {"accepted":True,"toolCallId":tool_call_id}

    def session_cancel(self, session_id):
        session = self._session(session_id)
        if session["state"] != "running":
            return {"accepted":False,"state":session["state"]}
        session["state"] = "idle"
        return {"accepted":True,"state":"idle"}

    def read_text_file(self, session_id, path, workspace_files):
        session = self._session(session_id)
        if not self.client_capabilities.get("fs", {}).get("readTextFile", False):
            raise PermissionError("client did not advertise fs.readTextFile")
        target = self._workspace_path(path, session["roots"])
        if str(target) not in workspace_files:
            raise FileNotFoundError(str(target))
        return workspace_files[str(target)]

    def write_text_file(self, session_id, path, content, workspace_files):
        session = self._session(session_id)
        if not self.client_capabilities.get("fs", {}).get("writeTextFile", False):
            raise PermissionError("client did not advertise fs.writeTextFile")
        target = self._workspace_path(path, session["roots"])
        workspace_files[str(target)] = content
        return {"written":True,"path":str(target)}

    def create_terminal(self, session_id, terminal_id, command, cwd):
        session = self._session(session_id)
        if not self.client_capabilities.get("terminal", False):
            raise PermissionError("client did not advertise terminal capability")
        cwd = str(self._workspace_path(cwd, session["roots"]))
        session.setdefault("terminals", {})[terminal_id] = {"command":command,"cwd":cwd,"cancelSupported":True,"exitStatus":None}
        return {"terminalId":terminal_id,"command":command,"cwd":cwd}

    def terminal_output_chunk(self, session_id, terminal_id, encoded_chunk):
        session = self._session(session_id)
        terminal = session.get("terminals", {}).get(terminal_id)
        if not terminal:
            raise KeyError("terminal not found")
        try:
            chunk = base64.b64decode(encoded_chunk, validate=True)
        except Exception as exc:
            raise ValueError("terminal output chunk must be valid base64") from exc
        terminal.setdefault("output", bytearray()).extend(chunk)
        return bytes(terminal["output"])

    def terminal_cancel(self, session_id, terminal_id):
        session = self._session(session_id)
        terminal = session.get("terminals", {}).get(terminal_id)
        if not terminal or not terminal["cancelSupported"] or terminal["exitStatus"] is not None:
            raise PermissionError("terminal is not cancellable")
        return {"accepted":True,"terminalId":terminal_id}

def demo():
    connection = ACPConnection()
    connection.initialize({"name":"academy-ide","version":"1.0"}, {"fs":{"readTextFile":True,"writeTextFile":True},"terminal":True}, {"session":{}}, 2)
    connection.session_new("/workspace/demo","sess-1",["/workspace/demo"])
    print(connection.session_prompt("sess-1",[{"type":"text","text":"Inspect the failing test"}]))
    print(connection.request_permission("sess-1","Run tests?",[{"optionId":"allow","kind":"allow_once"}],"allow"))
    print(connection.tool_call_update("sess-1","call-1","in_progress",True))
    print(connection.tool_call_cancel("sess-1","call-1"))

if __name__ == "__main__":
    demo()
