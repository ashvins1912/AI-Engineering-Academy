"""From-scratch durable workflow state-machine teaching example."""
from dataclasses import dataclass, field
from typing import Any

ALLOWED = {
    "CREATED": {"VALIDATED"},
    "VALIDATED": {"PAYMENT_PENDING"},
    "PAYMENT_PENDING": {"PAYMENT_CONFIRMED", "FAILED"},
    "PAYMENT_CONFIRMED": {"PAUSED_FOR_APPROVAL", "SHIPMENT_BOOKED"},
    "PAUSED_FOR_APPROVAL": {"SHIPMENT_BOOKED", "CANCELLED"},
    "SHIPMENT_BOOKED": {"COMPLETED"},
}

@dataclass
class Workflow:
    workflow_id: str
    state: str = "CREATED"
    version: int = 0
    events: list[dict[str, Any]] = field(default_factory=list)
    operations: dict[str, dict[str, Any]] = field(default_factory=dict)

    def transition(self, target: str, *, expected_version: int, actor: str) -> dict[str, Any]:
        if expected_version != self.version:
            raise RuntimeError("checkpoint version conflict")
        if target not in ALLOWED.get(self.state, set()):
            raise ValueError(f"illegal transition: {self.state} -> {target}")
        event = {"workflow_id": self.workflow_id, "from": self.state, "to": target,
                 "version": self.version + 1, "actor": actor}
        self.state = target
        self.version += 1
        self.events.append(event)
        return event

    def record_operation(self, key: str, result: dict[str, Any]) -> dict[str, Any]:
        if key in self.operations:
            return self.operations[key]
        self.operations[key] = dict(result)
        return self.operations[key]


def demo() -> Workflow:
    flow = Workflow("ORD-1042")
    flow.transition("VALIDATED", expected_version=0, actor="api")
    flow.transition("PAYMENT_PENDING", expected_version=1, actor="worker-A")
    # Simulate provider success before local transition persistence.
    charge = flow.record_operation("pay:ORD-1042:v1", {"status": "CHARGED", "charge_id": "ch_1042"})
    # Recovery retries the same logical operation and receives the original result.
    assert flow.record_operation("pay:ORD-1042:v1", {"status": "CHARGED", "charge_id": "duplicate"}) == charge
    flow.transition("PAYMENT_CONFIRMED", expected_version=2, actor="worker-B")
    flow.transition("SHIPMENT_BOOKED", expected_version=3, actor="shipping")
    flow.transition("COMPLETED", expected_version=4, actor="orchestrator")
    return flow

if __name__ == "__main__":
    result = demo()
    print({"workflow": result.workflow_id, "state": result.state, "version": result.version,
           "events": len(result.events), "provider_charge": result.operations["pay:ORD-1042:v1"]["charge_id"]})
