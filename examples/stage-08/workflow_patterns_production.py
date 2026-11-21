"""SQLite workflow run journal with tenant isolation and step idempotency."""
import hashlib
import json
import sqlite3
import time

class WorkflowConflict(Exception): pass

class WorkflowJournal:
    def __init__(self,path=":memory:",clock=None):
        self.db=sqlite3.connect(path,isolation_level=None)
        self.db.row_factory=sqlite3.Row
        self.clock=clock or time.time
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS workflow_runs(
          run_id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,workflow_name TEXT NOT NULL,
          state TEXT NOT NULL,version INTEGER NOT NULL,context_json TEXT NOT NULL,
          created_at REAL NOT NULL,updated_at REAL NOT NULL);
        CREATE INDEX IF NOT EXISTS ix_workflow_tenant ON workflow_runs(tenant_id,workflow_name);
        CREATE TABLE IF NOT EXISTS workflow_steps(
          run_id TEXT NOT NULL REFERENCES workflow_runs(run_id),step_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,payload_hash TEXT NOT NULL,state TEXT NOT NULL,
          result_json TEXT,compensation_state TEXT NOT NULL,created_at REAL NOT NULL,
          updated_at REAL NOT NULL,PRIMARY KEY(run_id,step_id),UNIQUE(run_id,idempotency_key));
        CREATE TABLE IF NOT EXISTS workflow_events(
          run_id TEXT NOT NULL REFERENCES workflow_runs(run_id),sequence INTEGER NOT NULL,
          event_type TEXT NOT NULL,payload_json TEXT NOT NULL,created_at REAL NOT NULL,
          PRIMARY KEY(run_id,sequence));
        """)
    def close(self):
        self.db.close()
    @staticmethod
    def fingerprint(value):
        raw=json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)
        return hashlib.sha256(raw.encode()).hexdigest()
    def _run(self,tenant_id,run_id):
        row=self.db.execute("SELECT * FROM workflow_runs WHERE tenant_id=? AND run_id=?",(tenant_id,run_id)).fetchone()
        if row is None:raise KeyError("workflow run not found")
        return row
    def _event(self,run_id,event_type,payload):
        row=self.db.execute("SELECT COALESCE(MAX(sequence),0)+1 n FROM workflow_events WHERE run_id=?",(run_id,)).fetchone()
        sequence=row["n"]
        self.db.execute("INSERT INTO workflow_events VALUES(?,?,?,?,?)",(run_id,sequence,event_type,json.dumps(payload,sort_keys=True),self.clock()))
        return sequence
    def create_run(self,tenant_id,run_id,workflow_name,context):
        if not all((tenant_id,run_id,workflow_name)) or not isinstance(context,dict):
            raise ValueError("tenant, run, workflow and object context are required")
        now=self.clock()
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self.db.execute("INSERT INTO workflow_runs VALUES(?,?,?,?,?,?,?,?)",
                (run_id,tenant_id,workflow_name,"running",0,json.dumps(context,sort_keys=True),now,now))
            self._event(run_id,"workflow_started",{"workflow":workflow_name,"version":0})
            self.db.execute("COMMIT")
            return self.get_run(tenant_id,run_id)
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def record_step(self,tenant_id,run_id,step_id,idempotency_key,expected_version,result):
        if not all((step_id,idempotency_key)) or not isinstance(result,dict):
            raise ValueError("step ID, idempotency key and object result are required")
        payload_hash=self.fingerprint(result)
        self.db.execute("BEGIN IMMEDIATE")
        try:
            run=self._run(tenant_id,run_id)
            prior=self.db.execute("SELECT * FROM workflow_steps WHERE run_id=? AND step_id=?",(run_id,step_id)).fetchone()
            if prior:
                if prior["idempotency_key"]!=idempotency_key or prior["payload_hash"]!=payload_hash:
                    raise WorkflowConflict("step already committed with a different key or result")
                self.db.execute("COMMIT")
                return {"duplicate":True,"run":self.get_run(tenant_id,run_id)}
            if run["state"]!="running":raise WorkflowConflict("workflow is not accepting new steps")
            if run["version"]!=expected_version:raise WorkflowConflict("workflow version conflict")
            now=self.clock()
            self.db.execute("INSERT INTO workflow_steps VALUES(?,?,?,?,?,?,?,?,?)",
                (run_id,step_id,idempotency_key,payload_hash,"completed",json.dumps(result,sort_keys=True),"pending",now,now))
            version=expected_version+1
            cursor=self.db.execute("UPDATE workflow_runs SET version=?,updated_at=? WHERE run_id=? AND tenant_id=? AND version=?",
                (version,now,run_id,tenant_id,expected_version))
            if cursor.rowcount!=1:raise WorkflowConflict("workflow version conflict")
            self._event(run_id,"step_completed",{"step_id":step_id,"version":version})
            self.db.execute("COMMIT")
            return {"duplicate":False,"run":self.get_run(tenant_id,run_id)}
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def record_compensation(self,tenant_id,run_id,step_id,expected_version,state,error=None):
        if state not in {"compensated","failed","not_required"}:raise ValueError("invalid compensation state")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            run=self._run(tenant_id,run_id)
            if run["version"]!=expected_version:raise WorkflowConflict("workflow version conflict")
            step=self.db.execute("SELECT * FROM workflow_steps WHERE run_id=? AND step_id=?",(run_id,step_id)).fetchone()
            if step is None:raise KeyError("workflow step not found")
            if step["compensation_state"] in {"compensated","not_required"}:
                if step["compensation_state"]==state:
                    self.db.execute("COMMIT")
                    return self.get_run(tenant_id,run_id)
                raise WorkflowConflict("compensation result is immutable")
            now=self.clock()
            self.db.execute("UPDATE workflow_steps SET compensation_state=?,updated_at=? WHERE run_id=? AND step_id=?",
                (state,now,run_id,step_id))
            version=expected_version+1
            self.db.execute("UPDATE workflow_runs SET version=?,updated_at=? WHERE run_id=? AND tenant_id=? AND version=?",
                (version,now,run_id,tenant_id,expected_version))
            self._event(run_id,"step_compensation",{"step_id":step_id,"state":state,"error":error,"version":version})
            self.db.execute("COMMIT")
            return self.get_run(tenant_id,run_id)
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def finish_run(self,tenant_id,run_id,expected_version,state):
        if state not in {"completed","failed","compensated","compensation_required","cancelled"}:
            raise ValueError("invalid terminal workflow state")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            run=self._run(tenant_id,run_id)
            if run["state"]!="running":raise WorkflowConflict("workflow is already terminal")
            if run["version"]!=expected_version:raise WorkflowConflict("workflow version conflict")
            steps=list(self.db.execute("SELECT state,compensation_state FROM workflow_steps WHERE run_id=?",(run_id,)))
            if state=="completed" and any(step["state"]!="completed" for step in steps):
                raise WorkflowConflict("cannot complete while a step is unfinished")
            if state=="compensated" and any(step["compensation_state"] not in {"compensated","not_required"} for step in steps):
                raise WorkflowConflict("cannot claim compensation while a step is pending or failed")
            now=self.clock()
            cursor=self.db.execute("UPDATE workflow_runs SET state=?,version=?,updated_at=? WHERE run_id=? AND tenant_id=? AND version=?",
                (state,expected_version+1,now,run_id,tenant_id,expected_version))
            if cursor.rowcount!=1:raise WorkflowConflict("workflow version conflict")
            self._event(run_id,"workflow_finished",{"state":state,"version":expected_version+1})
            self.db.execute("COMMIT")
            return self.get_run(tenant_id,run_id)
        except Exception:
            self.db.execute("ROLLBACK")
            raise
    def get_run(self,tenant_id,run_id):
        run=self._run(tenant_id,run_id)
        steps=self.db.execute("SELECT step_id,idempotency_key,state,result_json,compensation_state FROM workflow_steps WHERE run_id=? ORDER BY created_at,step_id",(run_id,))
        events=self.db.execute("SELECT sequence,event_type,payload_json FROM workflow_events WHERE run_id=? ORDER BY sequence",(run_id,))
        return {"run_id":run_id,"tenant_id":tenant_id,"workflow_name":run["workflow_name"],"state":run["state"],"version":run["version"],"context":json.loads(run["context_json"]),
                "steps":[{"step_id":s["step_id"],"idempotency_key":s["idempotency_key"],"state":s["state"],"result":json.loads(s["result_json"]),"compensation_state":s["compensation_state"]} for s in steps],
                "events":[{"sequence":e["sequence"],"type":e["event_type"],"payload":json.loads(e["payload_json"])} for e in events]}
