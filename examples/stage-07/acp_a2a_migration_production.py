"""Durable migration ledger for IBM ACP to A2A cutover decisions."""
import hashlib
import json
import sqlite3
import time

class MigrationLedger:
    def __init__(self, path=":memory:", clock=None):
        self.db = sqlite3.connect(path, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        self.clock = clock or time.time
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS migration_mappings(
          tenant_id TEXT NOT NULL, legacy_run_id TEXT NOT NULL, legacy_session_id TEXT NOT NULL,
          task_id TEXT NOT NULL, mapping_version TEXT NOT NULL, request_hash TEXT NOT NULL,
          created_at REAL NOT NULL, PRIMARY KEY(tenant_id,legacy_run_id));
        CREATE TABLE IF NOT EXISTS migration_evaluations(
          evaluation_id TEXT PRIMARY KEY, mapping_version TEXT NOT NULL, fixture_hash TEXT NOT NULL,
          parity_rate REAL NOT NULL, critical_security_failures INTEGER NOT NULL,
          duplicate_side_effects INTEGER NOT NULL, canary_percent INTEGER NOT NULL,
          status TEXT NOT NULL, decision_json TEXT NOT NULL, created_at REAL NOT NULL,
          updated_at REAL NOT NULL);
        """)
    def close(self):
        self.db.close()
    @staticmethod
    def fingerprint(value):
        return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",",":"), ensure_ascii=False).encode()).hexdigest()
    def map_run(self, tenant_id, legacy_run_id, legacy_session_id, task_id, mapping_version, request):
        if not all((tenant_id, legacy_run_id, legacy_session_id, task_id, mapping_version)):
            raise ValueError("mapping identity fields are required")
        request_hash = self.fingerprint(request)
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row = self.db.execute(
                "SELECT * FROM migration_mappings WHERE tenant_id=? AND legacy_run_id=?",
                (tenant_id, legacy_run_id),
            ).fetchone()
            if row:
                if (row["request_hash"] != request_hash or row["task_id"] != task_id
                    or row["legacy_session_id"] != legacy_session_id
                    or row["mapping_version"] != mapping_version):
                    raise ValueError("legacy run already mapped to a different request/task")
                self.db.execute("COMMIT")
                return {"task_id": row["task_id"], "duplicate": True}
            self.db.execute(
                "INSERT INTO migration_mappings VALUES(?,?,?,?,?,?,?)",
                (tenant_id, legacy_run_id, legacy_session_id, task_id, mapping_version, request_hash, self.clock()),
            )
            self.db.execute("COMMIT")
            return {"task_id": task_id, "duplicate": False}
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def record_evaluation(self, evaluation_id, mapping_version, fixture, parity_rate,
                          critical_security_failures, duplicate_side_effects, canary_percent=5,
                          minimum_parity=99.0):
        if not evaluation_id or not mapping_version:
            raise ValueError("evaluation and mapping version are required")
        if not 0 <= parity_rate <= 100 or not 0 <= canary_percent <= 100:
            raise ValueError("parity and canary percentages must be within 0..100")
        if critical_security_failures < 0 or duplicate_side_effects < 0:
            raise ValueError("failure counts cannot be negative")
        eligible = parity_rate >= minimum_parity and critical_security_failures == 0 and duplicate_side_effects == 0
        status = "canary_eligible" if eligible else "blocked"
        decision = {"eligible": eligible, "reason": "all gates pass" if eligible else "parity or hard safety gate failed"}
        now = self.clock()
        self.db.execute(
            "INSERT INTO migration_evaluations VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (evaluation_id, mapping_version, self.fingerprint(fixture), parity_rate,
             critical_security_failures, duplicate_side_effects, canary_percent if eligible else 0,
             status, json.dumps(decision, sort_keys=True), now, now),
        )
        return self.get_evaluation(evaluation_id)
    def rollback(self, evaluation_id, reason):
        if not reason:
            raise ValueError("rollback reason is required")
        cursor = self.db.execute(
            "UPDATE migration_evaluations SET status='rolled_back',canary_percent=0,"
            "decision_json=?,updated_at=? WHERE evaluation_id=?",
            (json.dumps({"eligible":False,"reason":reason}, sort_keys=True), self.clock(), evaluation_id),
        )
        if cursor.rowcount != 1:
            raise KeyError("migration evaluation not found")
        return self.get_evaluation(evaluation_id)
    def get_evaluation(self, evaluation_id):
        row = self.db.execute("SELECT * FROM migration_evaluations WHERE evaluation_id=?", (evaluation_id,)).fetchone()
        return None if row is None else dict(row)
