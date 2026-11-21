"""SQLite durable A2A task store with tenant scope, optimistic versions and callback dedup."""
import json
import sqlite3
import time
import uuid
from a2a_protocol import TRANSITIONS, TERMINAL, validate_artifact, validate_push_callback

class A2ATaskStore:
    def __init__(self, path=":memory:", clock=None):
        self.db = sqlite3.connect(path, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.clock = clock or time.time
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS a2a_tasks(
          task_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, context_id TEXT NOT NULL,
          status TEXT NOT NULL, version INTEGER NOT NULL, history_json TEXT NOT NULL,
          artifacts_json TEXT NOT NULL, created_at REAL NOT NULL, updated_at REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS ix_a2a_tasks_tenant_context
          ON a2a_tasks(tenant_id, context_id);
        CREATE TABLE IF NOT EXISTS a2a_events(
          task_id TEXT NOT NULL REFERENCES a2a_tasks(task_id),
          sequence INTEGER NOT NULL, event_type TEXT NOT NULL, event_json TEXT NOT NULL,
          created_at REAL NOT NULL, PRIMARY KEY(task_id, sequence));
        CREATE TABLE IF NOT EXISTS a2a_push_events(
          tenant_id TEXT NOT NULL, event_id TEXT NOT NULL, task_id TEXT NOT NULL,
          payload_json TEXT NOT NULL, received_at REAL NOT NULL,
          PRIMARY KEY(tenant_id, event_id),
          FOREIGN KEY(task_id) REFERENCES a2a_tasks(task_id));
        """)

    def close(self):
        self.db.close()

    def _task(self, tenant_id, task_id, context_id=None):
        row = self.db.execute(
            "SELECT * FROM a2a_tasks WHERE tenant_id=? AND task_id=?",
            (tenant_id, task_id),
        ).fetchone()
        if row is None or (context_id is not None and row["context_id"] != context_id):
            raise KeyError("task not found")
        return row

    def _append_event(self, task_id, event_type, event):
        row = self.db.execute(
            "SELECT COALESCE(MAX(sequence),0)+1 AS next_seq FROM a2a_events WHERE task_id=?",
            (task_id,),
        ).fetchone()
        sequence = row["next_seq"]
        self.db.execute(
            "INSERT INTO a2a_events VALUES(?,?,?,?,?)",
            (task_id, sequence, event_type, json.dumps(event, sort_keys=True), self.clock()),
        )
        return sequence

    def create_task(self, tenant_id, context_id, message, task_id=None):
        if not tenant_id or not context_id or not isinstance(message, dict) or not message.get("parts"):
            raise ValueError("tenant, context and message parts are required")
        task_id = task_id or str(uuid.uuid4())
        now = self.clock()
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self.db.execute(
                "INSERT INTO a2a_tasks VALUES(?,?,?,?,?,?,?,?,?)",
                (task_id, tenant_id, context_id, "submitted", 0, json.dumps([message], sort_keys=True),
                 "[]", now, now),
            )
            self._append_event(task_id, "status", {"status": "submitted"})
            self.db.execute("COMMIT")
        except Exception:
            self.db.execute("ROLLBACK")
            raise
        return task_id

    def get_task(self, tenant_id, task_id, context_id=None):
        row = self._task(tenant_id, task_id, context_id)
        return {
            "task_id": row["task_id"], "tenant_id": row["tenant_id"],
            "context_id": row["context_id"], "status": row["status"],
            "version": row["version"], "history": json.loads(row["history_json"]),
            "artifacts": json.loads(row["artifacts_json"]),
        }

    def transition(self, tenant_id, task_id, target, expected_version, message=None, context_id=None):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row = self._task(tenant_id, task_id, context_id)
            if row["version"] != expected_version:
                raise RuntimeError("task version conflict")
            if target not in TRANSITIONS.get(row["status"], set()):
                raise ValueError(f"invalid task transition: {row['status']} -> {target}")
            history = json.loads(row["history_json"])
            if message is not None:
                history.append(message)
            new_version = row["version"] + 1
            cursor = self.db.execute(
                "UPDATE a2a_tasks SET status=?,version=?,history_json=?,updated_at=? "
                "WHERE task_id=? AND tenant_id=? AND version=?",
                (target, new_version, json.dumps(history, sort_keys=True), self.clock(),
                 task_id, tenant_id, expected_version),
            )
            if cursor.rowcount != 1:
                raise RuntimeError("task version conflict")
            self._append_event(task_id, "status", {"status": target, "version": new_version})
            self.db.execute("COMMIT")
            return self.get_task(tenant_id, task_id, context_id)
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def add_artifact(self, tenant_id, task_id, artifact, context_id=None):
        validate_artifact(artifact)
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row = self._task(tenant_id, task_id, context_id)
            if row["status"] in TERMINAL:
                raise ValueError("cannot append artifact to terminal task")
            artifacts = json.loads(row["artifacts_json"])
            item = {
                "artifact_id": artifact.artifact_id, "name": artifact.name,
                "mime_type": artifact.mime_type, "parts": artifact.parts,
                "provenance": artifact.provenance,
            }
            if any(existing["artifact_id"] == artifact.artifact_id for existing in artifacts):
                raise ValueError("duplicate artifact ID")
            artifacts.append(item)
            self.db.execute(
                "UPDATE a2a_tasks SET artifacts_json=?,updated_at=? WHERE task_id=? AND tenant_id=?",
                (json.dumps(artifacts, sort_keys=True), self.clock(), task_id, tenant_id),
            )
            self._append_event(task_id, "artifact", {"artifactId": artifact.artifact_id})
            self.db.execute("COMMIT")
            return item
        except Exception:
            self.db.execute("ROLLBACK")
            raise

    def events(self, tenant_id, task_id, after_sequence=0, context_id=None):
        self._task(tenant_id, task_id, context_id)
        rows = self.db.execute(
            "SELECT sequence,event_type,event_json,created_at FROM a2a_events "
            "WHERE task_id=? AND sequence>? ORDER BY sequence",
            (task_id, after_sequence),
        )
        return [
            {"sequence": row["sequence"], "type": row["event_type"],
             "event": json.loads(row["event_json"]), "created_at": row["created_at"]}
            for row in rows
        ]

    def receive_push(self, tenant_id, task_id, event_id, callback_url, allowed_hosts, payload):
        self._task(tenant_id, task_id)
        validate_push_callback(callback_url, allowed_hosts)
        if not event_id or not isinstance(payload, dict):
            raise ValueError("event ID and object payload are required")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self.db.execute(
                "INSERT INTO a2a_push_events VALUES(?,?,?,?,?)",
                (tenant_id, event_id, task_id, json.dumps(payload, sort_keys=True), self.clock()),
            )
            self._append_event(task_id, "push", {"eventId": event_id, "payload": payload})
            self.db.execute("COMMIT")
            return {"accepted": True, "duplicate": False}
        except sqlite3.IntegrityError:
            self.db.execute("ROLLBACK")
            existing = self.db.execute(
                "SELECT task_id FROM a2a_push_events WHERE tenant_id=? AND event_id=?",
                (tenant_id, event_id),
            ).fetchone()
            if existing and existing["task_id"] == task_id:
                return {"accepted": True, "duplicate": True}
            raise ValueError("push event ID already belongs to another task")
        except Exception:
            self.db.execute("ROLLBACK")
            raise
