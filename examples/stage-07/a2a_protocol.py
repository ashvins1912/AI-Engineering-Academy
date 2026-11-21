"""A deterministic A2A 1.0.0 teaching simulator; no network or SDK required."""
from dataclasses import dataclass, field
from urllib.parse import urlsplit
from ipaddress import ip_address

PROTOCOL_VERSION = "1.0.0"
TERMINAL = {"completed", "failed", "canceled", "rejected"}
TRANSITIONS = {
    "submitted": {"working", "input-required", "auth-required", "failed", "canceled", "rejected"},
    "working": {"input-required", "auth-required", "completed", "failed", "canceled", "rejected"},
    "input-required": {"working", "canceled", "rejected"},
    "auth-required": {"working", "canceled", "rejected"},
}

@dataclass
class AgentCard:
    name: str
    description: str
    url: str
    protocol_version: str
    interfaces: list
    capabilities: dict
    skills: list
    security_schemes: dict = field(default_factory=dict)

@dataclass
class Artifact:
    artifact_id: str
    name: str
    mime_type: str
    parts: list
    provenance: list

@dataclass
class Task:
    task_id: str
    tenant_id: str
    context_id: str
    status: str = "submitted"
    version: int = 0
    history: list = field(default_factory=list)
    artifacts: list = field(default_factory=list)
    events: list = field(default_factory=list)

def _safe_https_url(value, allowed_hosts):
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        return False
    host = parsed.hostname.lower().rstrip(".")
    if host not in {h.lower().rstrip(".") for h in allowed_hosts}:
        return False
    try:
        address = ip_address(host)
        if address.is_private or address.is_loopback or address.is_link_local or address.is_reserved:
            return False
    except ValueError:
        pass
    return True

def validate_agent_card(card, trusted_hosts, supported_version=PROTOCOL_VERSION):
    if not isinstance(card, AgentCard) or not card.name.strip() or not card.skills:
        raise ValueError("Agent Card identity and skills are required")
    if card.protocol_version != supported_version:
        raise ValueError("unsupported A2A protocol version")
    if not _safe_https_url(card.url, trusted_hosts):
        raise PermissionError("Agent Card endpoint is not trusted")
    if not card.interfaces:
        raise ValueError("Agent Card has no supported interfaces")
    for interface in card.interfaces:
        if interface.get("protocolVersion") != supported_version:
            raise ValueError("interface protocol version mismatch")
        if interface.get("transport") not in {"JSONRPC", "HTTP+JSON", "GRPC"}:
            raise ValueError("unsupported transport")
        if not _safe_https_url(interface.get("url", ""), trusted_hosts):
            raise PermissionError("interface endpoint is not trusted")
    return True

def select_interface(card, preferred=("JSONRPC", "HTTP+JSON", "GRPC")):
    for transport in preferred:
        for interface in card.interfaces:
            if interface.get("transport") == transport and interface.get("protocolVersion") == card.protocol_version:
                return dict(interface)
    raise ValueError("no compatible interface")

def validate_artifact(artifact, allowed_mime=("text/plain", "application/json"), max_bytes=65536):
    if not isinstance(artifact, Artifact) or not artifact.artifact_id or not artifact.parts:
        raise ValueError("artifact identity and parts are required")
    if artifact.mime_type not in allowed_mime:
        raise ValueError("artifact MIME type is not allowed")
    size = sum(len(str(part.get("content", "")).encode("utf-8")) for part in artifact.parts)
    if size > max_bytes:
        raise ValueError("artifact exceeds size limit")
    if not artifact.provenance or any(not source for source in artifact.provenance):
        raise ValueError("artifact provenance is required")
    for part in artifact.parts:
        if part.get("kind") not in {"text", "data", "file"}:
            raise ValueError("unsupported artifact part kind")
    return True

def validate_push_callback(url, allowed_hosts):
    if not _safe_https_url(url, allowed_hosts):
        raise PermissionError("push callback URL is not trusted")
    return True

class TaskRegistry:
    def __init__(self):
        self.tasks = {}
        self.counter = 0
        self.callback_events = {}

    def create_task(self, tenant_id, context_id, message):
        if not tenant_id or not context_id or not message or not message.get("parts"):
            raise ValueError("tenant, context and message parts are required")
        self.counter += 1
        task = Task(f"task-{self.counter}", tenant_id, context_id)
        task.history.append(dict(message))
        task.events.append({"sequence": 1, "type": "status", "status": "submitted"})
        self.tasks[task.task_id] = task
        return task.task_id

    def get_task(self, tenant_id, task_id, context_id=None):
        task = self.tasks.get(task_id)
        if task is None or task.tenant_id != tenant_id or (context_id and task.context_id != context_id):
            raise KeyError("task not found")
        return task

    def transition(self, tenant_id, task_id, target, expected_version, message=None):
        task = self.get_task(tenant_id, task_id)
        if task.version != expected_version:
            raise RuntimeError("task version conflict")
        if target not in TRANSITIONS.get(task.status, set()):
            raise ValueError(f"invalid task transition: {task.status} -> {target}")
        task.status = target
        task.version += 1
        if message:
            task.history.append(dict(message))
        task.events.append({"sequence": len(task.events) + 1, "type": "status", "status": target})
        return task

    def add_artifact(self, tenant_id, task_id, artifact):
        task = self.get_task(tenant_id, task_id)
        if task.status in TERMINAL:
            raise ValueError("cannot append artifact to terminal task")
        validate_artifact(artifact)
        task.artifacts.append(artifact)
        task.events.append({"sequence": len(task.events) + 1, "type": "artifact", "artifactId": artifact.artifact_id})
        return artifact

    def cancel(self, tenant_id, task_id, expected_version):
        return self.transition(tenant_id, task_id, "canceled", expected_version)

    def events_after(self, tenant_id, task_id, sequence=0):
        task = self.get_task(tenant_id, task_id)
        return [dict(event) for event in task.events if event["sequence"] > sequence]

    def receive_push(self, tenant_id, task_id, event_id, callback_url, allowed_hosts, payload):
        task = self.get_task(tenant_id, task_id)
        validate_push_callback(callback_url, allowed_hosts)
        if not event_id:
            raise ValueError("event ID is required")
        prior_task = self.callback_events.get((tenant_id, event_id))
        if prior_task:
            if prior_task != task_id:
                raise ValueError("push event ID already belongs to another task")
            return {"accepted": True, "duplicate": True, "taskId": task_id}
        self.callback_events[(tenant_id, event_id)] = task_id
        task.events.append({"sequence": len(task.events) + 1, "type": "push", "eventId": event_id, "payload": dict(payload)})
        return {"accepted": True, "duplicate": False, "taskId": task_id}

def demo():
    card = AgentCard(
        "Refund specialist", "Reviews refund policy", "https://agents.example.com/a2a",
        PROTOCOL_VERSION,
        [{"transport": "JSONRPC", "url": "https://agents.example.com/a2a", "protocolVersion": PROTOCOL_VERSION}],
        {"streaming": True, "pushNotifications": False},
        [{"id": "refund-review", "name": "Refund review"}],
        {"bearer": {"type": "http", "scheme": "bearer"}},
    )
    validate_agent_card(card, {"agents.example.com"})
    print("selected interface:", select_interface(card)["transport"])
    registry = TaskRegistry()
    task_id = registry.create_task("tenant-a", "ctx-9", {"role": "user", "parts": [{"kind": "text", "content": "Review ORD-7"}]})
    registry.transition("tenant-a", task_id, "working", 0)
    artifact = Artifact("artifact-7", "Refund review", "application/json", [{"kind": "data", "content": '{"eligible":true}'}], ["orders/ORD-7", "policy/refunds-v3"])
    registry.add_artifact("tenant-a", task_id, artifact)
    registry.transition("tenant-a", task_id, "completed", 1)
    print("task:", registry.get_task("tenant-a", task_id).status, "events:", len(registry.events_after("tenant-a", task_id)))

if __name__ == "__main__":
    demo()
