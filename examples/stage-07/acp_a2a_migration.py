"""Framework-neutral IBM ACP legacy to A2A 1.0.0 semantic mapping example."""
from dataclasses import dataclass
import hashlib

LEGACY_PROTOCOL = "ibm-acp-legacy"
TARGET_PROTOCOL = "1.0.0"
KNOWN_FIELDS = {"protocol", "tenant_id", "session_id", "run_id", "message", "mode", "metadata"}
EVENT_MAP = {
    "accepted": ("status", "submitted"),
    "working": ("status", "working"),
    "input_required": ("status", "input-required"),
    "auth_required": ("status", "auth-required"),
    "completed": ("status", "completed"),
    "failed": ("status", "failed"),
    "canceled": ("status", "canceled"),
    "result": ("artifact", "artifactUpdate"),
}

@dataclass
class MigrationResult:
    request: dict
    idempotency_key: str
    mapping_version: str

def translate_legacy_run(request, authenticated_tenant_id, mapping_version="v1"):
    if not isinstance(request, dict):
        raise TypeError("legacy request must be an object")
    unknown = set(request) - KNOWN_FIELDS
    if unknown:
        raise ValueError("unmapped legacy fields: " + ",".join(sorted(unknown)))
    if request.get("protocol") != LEGACY_PROTOCOL:
        raise ValueError("unsupported legacy protocol")
    if not authenticated_tenant_id:
        raise PermissionError("authenticated tenant is required")
    if request.get("tenant_id") not in (None, authenticated_tenant_id):
        raise PermissionError("legacy tenant claim does not match authenticated tenant")
    for field in ("session_id", "run_id"):
        if not isinstance(request.get(field), str) or not request[field].strip():
            raise ValueError(field + " is required")
    message = request.get("message")
    if not isinstance(message, dict) or not message.get("parts"):
        raise ValueError("message parts are required")
    for part in message["parts"]:
        if part.get("kind") not in {"text", "file", "data"}:
            raise ValueError("unsupported legacy message part")
    mode = request.get("mode", "async")
    if mode not in {"sync", "async"}:
        raise ValueError("unsupported legacy execution mode")
    stable = hashlib.sha256(
        (authenticated_tenant_id + ":" + request["run_id"]).encode("utf-8")
    ).hexdigest()
    target = {
        "protocolVersion": TARGET_PROTOCOL,
        "contextId": request["session_id"],
        "legacyRunId": request["run_id"],
        "tenantId": authenticated_tenant_id,
        "message": {"role": "user", "parts": list(message["parts"])},
        "executionMode": "blocking" if mode == "sync" else "task",
        "metadata": dict(request.get("metadata") or {}),
    }
    return MigrationResult(target, stable, mapping_version)

def translate_legacy_event(event, task_id, sequence):
    if not isinstance(event, dict) or event.get("type") not in EVENT_MAP:
        raise ValueError("unmapped legacy event")
    event_type, state = EVENT_MAP[event["type"]]
    if event_type == "status":
        return {"sequence": sequence, "statusUpdate": {"taskId": task_id, "status": state}}
    if event_type == "artifact":
        artifact = event.get("artifact")
        if not isinstance(artifact, dict) or not artifact.get("artifactId") or not artifact.get("parts"):
            raise ValueError("legacy result event needs a typed artifact")
        return {"sequence": sequence, "artifactUpdate": {"taskId": task_id, "artifact": artifact}}
    raise AssertionError("unsupported mapping type")

def compare_parity(legacy, migrated):
    required = ("business_outcome", "artifact_hash", "approval_required")
    missing = [key for key in required if key not in legacy or key not in migrated]
    if missing:
        raise ValueError("parity fields missing: " + ",".join(missing))
    return {
        "parity": all(legacy[key] == migrated[key] for key in required),
        "security_pass": migrated.get("cross_tenant_accesses", 0) == 0
            and migrated.get("unauthorized_side_effects", 0) == 0,
        "duplicate_side_effects": migrated.get("duplicate_side_effects", 0),
    }

def canary_decision(parity_rate, critical_security_failures, duplicate_side_effects,
                    canary_percent=5, minimum_parity=99.0):
    if not 0 <= canary_percent <= 100:
        raise ValueError("canary percentage must be between 0 and 100")
    if not 0 <= parity_rate <= 100:
        raise ValueError("parity rate must be between 0 and 100")
    eligible = (critical_security_failures == 0 and duplicate_side_effects == 0
                and parity_rate >= minimum_parity)
    return {"eligible": eligible, "canary_percent": canary_percent if eligible else 0,
            "reason": "all migration gates pass" if eligible else "parity or hard safety gate failed"}

def demo():
    request = {
        "protocol": LEGACY_PROTOCOL, "tenant_id": "tenant-a", "session_id": "ses-9",
        "run_id": "run-42", "mode": "async",
        "message": {"parts": [{"kind": "text", "text": "Review refund ORD-7"}]},
    }
    result = translate_legacy_run(request, authenticated_tenant_id="tenant-a")
    print("A2A request:", result.request)
    print("idempotency:", result.idempotency_key)
    print("canary:", canary_decision(99.6, 0, 0))

if __name__ == "__main__":
    demo()
