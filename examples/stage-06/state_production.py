"""SQLite-backed durable workflow reference implementation.

SQLite is used to make the transaction and recovery mechanics executable with the
Python standard library. Production deployments should use PostgreSQL and enforce
tenant scope with authenticated server context and row-level security.
"""
import json
import sqlite3
import time
from typing import Any

ALLOWED = {
    "CREATED": {"VALIDATED"},
    "VALIDATED": {"PAYMENT_PENDING"},
    "PAYMENT_PENDING": {"PAYMENT_CONFIRMED", "FAILED"},
    "PAYMENT_CONFIRMED": {"PAUSED_FOR_APPROVAL", "SHIPMENT_BOOKED"},
    "PAUSED_FOR_APPROVAL": {"SHIPMENT_BOOKED", "CANCELLED"},
    "SHIPMENT_BOOKED": {"COMPLETED"},
}

class DurableWorkflowStore:
    def __init__(self, path=":memory:", clock=None):
        self.clock = clock or (lambda: int(time.time()))
        self.db = sqlite3.connect(path, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS checkpoints(
          workflow_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, state TEXT NOT NULL,
          version INTEGER NOT NULL, data_json TEXT NOT NULL, lease_owner TEXT,
          lease_until INTEGER NOT NULL DEFAULT 0, fence INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS events(
          event_id INTEGER PRIMARY KEY AUTOINCREMENT, workflow_id TEXT NOT NULL,
          tenant_id TEXT NOT NULL, version INTEGER NOT NULL, event_type TEXT NOT NULL,
          payload_json TEXT NOT NULL, created_at INTEGER NOT NULL,
          UNIQUE(workflow_id, version),
          FOREIGN KEY(workflow_id) REFERENCES checkpoints(workflow_id)
        );
        CREATE TABLE IF NOT EXISTS operations(
          workflow_id TEXT NOT NULL, idempotency_key TEXT NOT NULL,
          result_json TEXT NOT NULL, created_at INTEGER NOT NULL,
          PRIMARY KEY(workflow_id, idempotency_key),
          FOREIGN KEY(workflow_id) REFERENCES checkpoints(workflow_id)
        );
        CREATE TABLE IF NOT EXISTS approvals(
          approval_id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, tenant_id TEXT NOT NULL,
          action TEXT NOT NULL, expected_version INTEGER NOT NULL, expires_at INTEGER NOT NULL,
          consumed INTEGER NOT NULL DEFAULT 0, decision TEXT,
          FOREIGN KEY(workflow_id) REFERENCES checkpoints(workflow_id)
        );
        """)

    def create(self, workflow_id: str, tenant_id: str, data: dict[str, Any] | None = None):
        payload = data or {}
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self.db.execute(
                "INSERT INTO checkpoints(workflow_id,tenant_id,state,version,data_json) VALUES(?,?,?,?,?)",
                (workflow_id, tenant_id, "CREATED", 0, json.dumps(payload)))
            self.db.execute(
                "INSERT INTO events(workflow_id,tenant_id,version,event_type,payload_json,created_at) VALUES(?,?,?,?,?,?)",
                (workflow_id, tenant_id, 0, "WORKFLOW_CREATED", json.dumps(payload), self.clock()))
            self.db.execute("COMMIT")
        except Exception:
            self.db.execute("ROLLBACK")
            raise
        return self.load(workflow_id, tenant_id=tenant_id)

    def load(self, workflow_id: str, *, tenant_id: str):
        row = self.db.execute(
            "SELECT * FROM checkpoints WHERE workflow_id=? AND tenant_id=?",
            (workflow_id, tenant_id)).fetchone()
        if row is None:
            raise KeyError("workflow not found in tenant scope")
        result = dict(row)
        result["data"] = json.loads(result.pop("data_json"))
        return result

    def claim(self, workflow_id: str, *, tenant_id: str, worker_id: str, lease_seconds: int):
        if lease_seconds <= 0:
            raise ValueError("lease duration must be positive")
        now = self.clock()
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row = self.db.execute(
                "SELECT lease_owner,lease_until,fence FROM checkpoints WHERE workflow_id=? AND tenant_id=?",
                (workflow_id, tenant_id)).fetchone()
            if row is None:
                raise KeyError("workflow not found in tenant scope")
            if row["lease_until"] > now and row["lease_owner"] != worker_id:
                raise RuntimeError("workflow lease is held by another worker")
            fence = row["fence"] + 1
            self.db.execute(
                "UPDATE checkpoints SET lease_owner=?,lease_until=?,fence=? WHERE workflow_id=? AND tenant_id=?",
                (worker_id, now + lease_seconds, fence, workflow_id, tenant_id))
            self.db.execute("COMMIT")
            return {"worker_id": worker_id, "fence": fence, "lease_until": now + lease_seconds}
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def transition(self, workflow_id: str, target: str, *, tenant_id: str,
                   worker_id: str, fence: int, expected_version: int, actor: str):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row = self.db.execute(
                "SELECT * FROM checkpoints WHERE workflow_id=? AND tenant_id=?",
                (workflow_id, tenant_id)).fetchone()
            if row is None:
                raise KeyError("workflow not found in tenant scope")
            if row["version"] != expected_version:
                raise RuntimeError("checkpoint version conflict")
            if row["lease_owner"] != worker_id or row["fence"] != fence or row["lease_until"] <= self.clock():
                raise PermissionError("worker lease or fencing token is stale")
            if target not in ALLOWED.get(row["state"], set()):
                raise ValueError(f"illegal transition: {row['state']} -> {target}")
            next_version = expected_version + 1
            payload = {"from": row["state"], "to": target, "actor": actor,
                       "worker_id": worker_id, "fence": fence}
            self.db.execute(
                "INSERT INTO events(workflow_id,tenant_id,version,event_type,payload_json,created_at) VALUES(?,?,?,?,?,?)",
                (workflow_id, tenant_id, next_version, "STATE_TRANSITION", json.dumps(payload), self.clock()))
            changed = self.db.execute(
                "UPDATE checkpoints SET state=?,version=? WHERE workflow_id=? AND tenant_id=? AND version=? AND fence=?",
                (target, next_version, workflow_id, tenant_id, expected_version, fence)).rowcount
            if changed != 1:
                raise RuntimeError("checkpoint compare-and-swap failed")
            self.db.execute("COMMIT")
            return self.load(workflow_id, tenant_id=tenant_id)
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def record_operation(self, workflow_id: str, key: str, result: dict[str, Any], *, tenant_id: str):
        if self.db.execute("SELECT 1 FROM checkpoints WHERE workflow_id=? AND tenant_id=?",
                           (workflow_id, tenant_id)).fetchone() is None:
            raise KeyError("workflow not found in tenant scope")
        self.db.execute(
            "INSERT OR IGNORE INTO operations(workflow_id,idempotency_key,result_json,created_at) VALUES(?,?,?,?)",
            (workflow_id, key, json.dumps(result), self.clock()))
        row = self.db.execute(
            "SELECT result_json FROM operations WHERE workflow_id=? AND idempotency_key=?",
            (workflow_id, key)).fetchone()
        return json.loads(row["result_json"])

    def request_approval(self, approval_id: str, workflow_id: str, *, tenant_id: str,
                         action: str, expected_version: int, expires_at: int):
        current = self.load(workflow_id, tenant_id=tenant_id)
        if expires_at <= self.clock():
            raise ValueError("approval expiry must be in the future")
        if current["version"] != expected_version:
            raise RuntimeError("checkpoint version conflict")
        if current["state"] != "PAUSED_FOR_APPROVAL":
            raise ValueError("workflow is not paused for approval")
        self.db.execute(
            "INSERT INTO approvals(approval_id,workflow_id,tenant_id,action,expected_version,expires_at) VALUES(?,?,?,?,?,?)",
            (approval_id, workflow_id, tenant_id, action, expected_version, expires_at))

    def decide_approval(self, approval_id: str, *, tenant_id: str, approver: str,
                        allowed_approvers: set[str], decision: str, action: str):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            approval = self.db.execute(
                "SELECT * FROM approvals WHERE approval_id=? AND tenant_id=?",
                (approval_id, tenant_id)).fetchone()
            if approval is None:
                raise KeyError("approval not found")
            if approver not in allowed_approvers:
                raise PermissionError("approver is not authorized")
            if decision not in {"approved", "rejected"}:
                raise ValueError("decision must be approved or rejected")
            if approval["consumed"] or approval["expires_at"] <= self.clock():
                raise PermissionError("approval expired or already consumed")
            if approval["action"] != action:
                raise PermissionError("approval does not match pending action")
            workflow = self.db.execute(
                "SELECT version,state FROM checkpoints WHERE workflow_id=? AND tenant_id=?",
                (approval["workflow_id"], tenant_id)).fetchone()
            if workflow["version"] != approval["expected_version"] or workflow["state"] != "PAUSED_FOR_APPROVAL":
                raise RuntimeError("workflow changed after approval was requested")
            self.db.execute("UPDATE approvals SET consumed=1,decision=? WHERE approval_id=?",
                            (decision, approval_id))
            self.db.execute("COMMIT")
            return {"approval_id": approval_id, "decision": decision, "approver": approver}
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def events(self, workflow_id: str, *, tenant_id: str):
        rows = self.db.execute(
            "SELECT version,event_type,payload_json,created_at FROM events WHERE workflow_id=? AND tenant_id=? ORDER BY version",
            (workflow_id, tenant_id)).fetchall()
        return [{**dict(row), "payload": json.loads(row["payload_json"])} for row in rows]

    def close(self):
        self.db.close()
