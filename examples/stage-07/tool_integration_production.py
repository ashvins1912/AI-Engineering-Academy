"""SQLite idempotency ledger for replay-safe tool side effects."""
import hashlib
import json
import sqlite3
import time

class IdempotencyConflict(Exception): pass
class OperationPending(Exception): pass

class IdempotencyLedger:
    def __init__(self,path=":memory:",clock=None):
        self.db=sqlite3.connect(path,isolation_level=None)
        self.db.row_factory=sqlite3.Row
        self.clock=clock or time.time
        self.db.execute("""
        CREATE TABLE IF NOT EXISTS tool_operations(
          tenant_id TEXT NOT NULL, tool_name TEXT NOT NULL, idempotency_key TEXT NOT NULL,
          payload_hash TEXT NOT NULL, status TEXT NOT NULL, result_json TEXT,
          provider_operation_id TEXT, created_at REAL NOT NULL, updated_at REAL NOT NULL,
          PRIMARY KEY(tenant_id,tool_name,idempotency_key))
        """)
    def close(self):
        self.db.close()
    @staticmethod
    def fingerprint(payload):
        raw=json.dumps(payload,sort_keys=True,separators=(",",":"),ensure_ascii=False)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()
    def reserve(self,tenant_id,tool_name,key,payload):
        if not all((tenant_id,tool_name,key)):
            raise ValueError("tenant, tool and idempotency key are required")
        digest=self.fingerprint(payload)
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute(
                "SELECT * FROM tool_operations WHERE tenant_id=? AND tool_name=? AND idempotency_key=?",
                (tenant_id,tool_name,key)).fetchone()
            if row:
                if row["payload_hash"]!=digest:
                    raise IdempotencyConflict("same idempotency key used with different payload")
                self.db.execute("COMMIT")
                if row["status"]=="succeeded":
                    return {"state":"replay","result":json.loads(row["result_json"]),"provider_operation_id":row["provider_operation_id"]}
                if row["status"] in {"pending","unknown"}:
                    return {"state":"reconcile","result":None,"provider_operation_id":row["provider_operation_id"]}
                return {"state":"failed","result":None,"provider_operation_id":row["provider_operation_id"]}
            now=self.clock()
            self.db.execute("INSERT INTO tool_operations VALUES(?,?,?,?,?,?,?,?,?)",
                (tenant_id,tool_name,key,digest,"pending",None,None,now,now))
            self.db.execute("COMMIT")
            return {"state":"execute","result":None,"provider_operation_id":None}
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def complete(self,tenant_id,tool_name,key,result,provider_operation_id):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute(
                "SELECT * FROM tool_operations WHERE tenant_id=? AND tool_name=? AND idempotency_key=?",
                (tenant_id,tool_name,key)).fetchone()
            if row is None:raise KeyError("idempotency reservation not found")
            if row["status"]=="succeeded":
                if json.loads(row["result_json"])!=result:raise IdempotencyConflict("completed result is immutable")
                self.db.execute("COMMIT")
                return self.get(tenant_id,tool_name,key)
            if row["status"] not in {"pending","unknown"}:
                raise ValueError("operation is not completable")
            self.db.execute(
                "UPDATE tool_operations SET status='succeeded',result_json=?,provider_operation_id=?,updated_at=? "
                "WHERE tenant_id=? AND tool_name=? AND idempotency_key=?",
                (json.dumps(result,sort_keys=True),provider_operation_id,self.clock(),tenant_id,tool_name,key))
            self.db.execute("COMMIT")
            return self.get(tenant_id,tool_name,key)
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def mark_unknown(self,tenant_id,tool_name,key):
        cursor=self.db.execute(
            "UPDATE tool_operations SET status='unknown',updated_at=? "
            "WHERE tenant_id=? AND tool_name=? AND idempotency_key=? AND status='pending'",
            (self.clock(),tenant_id,tool_name,key))
        if cursor.rowcount!=1:raise ValueError("only pending operation can become unknown")
        return self.get(tenant_id,tool_name,key)
    def mark_failed(self,tenant_id,tool_name,key):
        cursor=self.db.execute(
            "UPDATE tool_operations SET status='failed',updated_at=? "
            "WHERE tenant_id=? AND tool_name=? AND idempotency_key=? AND status='pending'",
            (self.clock(),tenant_id,tool_name,key))
        if cursor.rowcount!=1:raise ValueError("only pending operation can fail")
        return self.get(tenant_id,tool_name,key)
    def get(self,tenant_id,tool_name,key):
        row=self.db.execute(
            "SELECT * FROM tool_operations WHERE tenant_id=? AND tool_name=? AND idempotency_key=?",
            (tenant_id,tool_name,key)).fetchone()
        if row is None:return None
        result=dict(row)
        result["result"]=json.loads(row["result_json"]) if row["result_json"] else None
        return result
