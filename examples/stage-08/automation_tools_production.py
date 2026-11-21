"""SQLite automation journal with tenant-scoped, payload-bound approval decisions."""
import hashlib
import json
import sqlite3
import time

class AutomationConflict(Exception):pass
class ApprovalDenied(Exception):pass

class AutomationJournal:
    def __init__(self,path=":memory:",clock=None):
        self.db=sqlite3.connect(path,isolation_level=None)
        self.db.row_factory=sqlite3.Row
        self.clock=clock or time.time
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS automation_runs(
          run_id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,workflow_name TEXT NOT NULL,
          state TEXT NOT NULL,version INTEGER NOT NULL,created_at REAL NOT NULL,updated_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS automation_steps(
          run_id TEXT NOT NULL REFERENCES automation_runs(run_id),step_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,payload_hash TEXT NOT NULL,status TEXT NOT NULL,
          result_json TEXT NOT NULL,created_at REAL NOT NULL,
          PRIMARY KEY(run_id,step_id),UNIQUE(run_id,idempotency_key));
        CREATE TABLE IF NOT EXISTS automation_approvals(
          approval_id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES automation_runs(run_id),
          tenant_id TEXT NOT NULL,payload_hash TEXT NOT NULL,resource TEXT NOT NULL,
          allowed_approvers_json TEXT NOT NULL,expires_at REAL NOT NULL,status TEXT NOT NULL,
          used INTEGER NOT NULL,created_at REAL NOT NULL,decided_by TEXT,decided_at REAL);
        CREATE TABLE IF NOT EXISTS automation_audit(
          run_id TEXT NOT NULL,sequence INTEGER NOT NULL,event_type TEXT NOT NULL,
          payload_json TEXT NOT NULL,created_at REAL NOT NULL,PRIMARY KEY(run_id,sequence));
        """)
    def close(self):self.db.close()
    @staticmethod
    def fingerprint(value):
        raw=json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False)
        return hashlib.sha256(raw.encode()).hexdigest()
    def _run(self,tenant_id,run_id):
        row=self.db.execute("SELECT * FROM automation_runs WHERE tenant_id=? AND run_id=?",(tenant_id,run_id)).fetchone()
        if row is None:raise KeyError("automation run not found")
        return row
    def _audit(self,run_id,event_type,payload):
        row=self.db.execute("SELECT COALESCE(MAX(sequence),0)+1 n FROM automation_audit WHERE run_id=?",(run_id,)).fetchone()
        self.db.execute("INSERT INTO automation_audit VALUES(?,?,?,?,?)",(run_id,row["n"],event_type,json.dumps(payload,sort_keys=True),self.clock()))
    def start_run(self,tenant_id,run_id,workflow_name):
        now=self.clock()
        self.db.execute("INSERT INTO automation_runs VALUES(?,?,?,?,?,?,?)",(run_id,tenant_id,workflow_name,"running",0,now,now))
        self._audit(run_id,"run_started",{"workflow":workflow_name})
        return self.snapshot(tenant_id,run_id)
    def record_step(self,tenant_id,run_id,step_id,idempotency_key,payload,result,expected_version):
        digest=self.fingerprint(payload)
        self.db.execute("BEGIN IMMEDIATE")
        try:
            run=self._run(tenant_id,run_id)
            prior=self.db.execute("SELECT * FROM automation_steps WHERE run_id=? AND step_id=?",(run_id,step_id)).fetchone()
            if prior:
                if prior["idempotency_key"]!=idempotency_key or prior["payload_hash"]!=digest:
                    raise AutomationConflict("step idempotency payload changed")
                self.db.execute("COMMIT")
                return {"duplicate":True,"result":json.loads(prior["result_json"])}
            if run["state"]!="running" or run["version"]!=expected_version:
                raise AutomationConflict("run state or version conflict")
            now=self.clock()
            self.db.execute("INSERT INTO automation_steps VALUES(?,?,?,?,?,?,?)",
                (run_id,step_id,idempotency_key,digest,"completed",json.dumps(result,sort_keys=True),now))
            self.db.execute("UPDATE automation_runs SET version=?,updated_at=? WHERE run_id=? AND tenant_id=? AND version=?",
                (expected_version+1,now,run_id,tenant_id,expected_version))
            self._audit(run_id,"step_completed",{"step_id":step_id,"version":expected_version+1})
            self.db.execute("COMMIT")
            return {"duplicate":False,"result":result}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def request_approval(self,tenant_id,run_id,approval_id,action,resource,allowed_approvers,expires_at):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            run=self._run(tenant_id,run_id)
            if run["state"]!="running":raise AutomationConflict("run is not active")
            self.db.execute("INSERT INTO automation_approvals VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                (approval_id,run_id,tenant_id,self.fingerprint(action),resource,json.dumps(sorted(allowed_approvers)),expires_at,"pending",0,self.clock(),None,None))
            self._audit(run_id,"approval_requested",{"approval_id":approval_id,"resource":resource,"payload_hash":self.fingerprint(action)})
            self.db.execute("COMMIT")
            return {"approval_id":approval_id,"status":"pending","payload_hash":self.fingerprint(action)}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def decide_approval(self,tenant_id,approval_id,approver,action,decision):
        if decision not in {"approved","rejected"}:raise ValueError("invalid approval decision")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute("SELECT * FROM automation_approvals WHERE tenant_id=? AND approval_id=?",(tenant_id,approval_id)).fetchone()
            if row is None:raise KeyError("approval not found")
            if row["status"]!="pending" or row["used"]:raise ApprovalDenied("approval is not pending")
            if row["expires_at"]<=self.clock():raise ApprovalDenied("approval expired")
            if row["payload_hash"]!=self.fingerprint(action):raise ApprovalDenied("action payload changed")
            if approver not in json.loads(row["allowed_approvers_json"]):raise ApprovalDenied("approver is not authorized")
            self.db.execute("UPDATE automation_approvals SET status=?,decided_by=?,decided_at=? WHERE approval_id=? AND tenant_id=?",
                (decision,approver,self.clock(),approval_id,tenant_id))
            self._audit(row["run_id"],"approval_decided",{"approval_id":approval_id,"decision":decision,"approver":approver})
            self.db.execute("COMMIT")
            return {"status":decision}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def consume_approval(self,tenant_id,approval_id,action):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute("SELECT * FROM automation_approvals WHERE tenant_id=? AND approval_id=?",(tenant_id,approval_id)).fetchone()
            if row is None or row["status"]!="approved" or row["used"]:raise ApprovalDenied("approval is not available")
            if row["expires_at"]<=self.clock() or row["payload_hash"]!=self.fingerprint(action):
                raise ApprovalDenied("approval expired or payload changed")
            self.db.execute("UPDATE automation_approvals SET used=1 WHERE approval_id=? AND tenant_id=? AND used=0",(approval_id,tenant_id))
            self._audit(row["run_id"],"approval_consumed",{"approval_id":approval_id})
            self.db.execute("COMMIT");return True
        except Exception:
            self.db.execute("ROLLBACK");raise
    def snapshot(self,tenant_id,run_id):
        run=self._run(tenant_id,run_id)
        steps=self.db.execute("SELECT step_id,idempotency_key,status,result_json FROM automation_steps WHERE run_id=? ORDER BY created_at,step_id",(run_id,))
        approvals=self.db.execute("SELECT approval_id,resource,status,used,expires_at,decided_by FROM automation_approvals WHERE run_id=? ORDER BY created_at",(run_id,))
        audit=self.db.execute("SELECT sequence,event_type,payload_json FROM automation_audit WHERE run_id=? ORDER BY sequence",(run_id,))
        return {"run_id":run_id,"tenant_id":tenant_id,"workflow_name":run["workflow_name"],"state":run["state"],"version":run["version"],
          "steps":[{"step_id":s["step_id"],"idempotency_key":s["idempotency_key"],"status":s["status"],"result":json.loads(s["result_json"])} for s in steps],
          "approvals":[dict(a) for a in approvals],
          "audit":[{"sequence":a["sequence"],"type":a["event_type"],"payload":json.loads(a["payload_json"])} for a in audit]}
