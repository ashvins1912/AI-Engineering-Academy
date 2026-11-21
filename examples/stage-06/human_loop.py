"""Deterministic human approval gate."""
from dataclasses import dataclass, field
from hashlib import sha256
import json

def action_hash(action):
    body=json.dumps(action,sort_keys=True,separators=(",",":"),ensure_ascii=False)
    return sha256(body.encode()).hexdigest()

@dataclass
class ApprovalRequest:
    request_id: str
    tenant_id: str
    requester: str
    action: dict
    workflow_version: int
    allowed_roles: set
    required_quorum: int
    expires_at: int
    decisions: dict = field(default_factory=dict)
    status: str = "PENDING"

    @property
    def payload_hash(self):
        return action_hash(self.action)

def decide(request, reviewer, role, decision, now, current_action=None, current_version=None):
    if request.status != "PENDING" or now >= request.expires_at:
        raise ValueError("request is not active")
    if reviewer == request.requester or role not in request.allowed_roles:
        raise PermissionError("reviewer is not authorized")
    if current_action is not None and action_hash(current_action) != request.payload_hash:
        raise ValueError("action changed")
    if current_version is not None and current_version != request.workflow_version:
        raise ValueError("workflow version changed")
    if decision not in {"APPROVE", "REJECT"}:
        raise ValueError("invalid decision")
    if reviewer in request.decisions:
        raise ValueError("reviewer already decided")
    request.decisions[reviewer] = {"role": role, "decision": decision, "hash": request.payload_hash}
    if decision == "REJECT":
        request.status = "REJECTED"
    elif sum(d["decision"] == "APPROVE" for d in request.decisions.values()) >= request.required_quorum:
        request.status = "APPROVED"
    return request.status

def may_execute(request, action, version, now):
    approvals = sum(d["decision"] == "APPROVE" for d in request.decisions.values())
    return (request.status == "APPROVED" and now < request.expires_at
            and action_hash(action) == request.payload_hash
            and version == request.workflow_version and approvals >= request.required_quorum)

if __name__ == "__main__":
    r=ApprovalRequest("APR-1","acme","agent",{"amount":12500},12,{"finance"},2,200)
    print(decide(r,"finance-1","finance","APPROVE",100))
    print(decide(r,"finance-2","finance","APPROVE",101))
    print("may execute:",may_execute(r,r.action,12,102))
