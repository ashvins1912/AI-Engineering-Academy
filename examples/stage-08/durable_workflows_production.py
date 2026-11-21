"""Durable SQLite workflow/activity store with leases, heartbeats, fencing and signals."""
import json
import sqlite3
import time

class WorkflowStoreError(Exception): pass
class LeaseBusy(WorkflowStoreError): pass
class StaleWorker(WorkflowStoreError): pass
class WorkflowConflict(WorkflowStoreError): pass

class DurableWorkflowStore:
    def __init__(self,path=":memory:",clock=None):
        self.db=sqlite3.connect(path,isolation_level=None)
        self.db.row_factory=sqlite3.Row
        self.clock=clock or time.time
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS durable_runs(
          workflow_id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,workflow_type TEXT NOT NULL,
          code_version INTEGER NOT NULL,state TEXT NOT NULL,compact_state_json TEXT NOT NULL,
          continued_to TEXT,created_at REAL NOT NULL,updated_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS durable_history(
          workflow_id TEXT NOT NULL REFERENCES durable_runs(workflow_id),
          sequence INTEGER NOT NULL,event_type TEXT NOT NULL,payload_json TEXT NOT NULL,
          created_at REAL NOT NULL,PRIMARY KEY(workflow_id,sequence));
        CREATE TABLE IF NOT EXISTS durable_activities(
          workflow_id TEXT NOT NULL REFERENCES durable_runs(workflow_id),activity_id TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,input_json TEXT NOT NULL,status TEXT NOT NULL,
          attempt INTEGER NOT NULL,max_attempts INTEGER NOT NULL,result_json TEXT,error TEXT,
          lease_owner TEXT,lease_expires REAL,fence INTEGER NOT NULL,
          created_at REAL NOT NULL,updated_at REAL NOT NULL,
          PRIMARY KEY(workflow_id,activity_id),UNIQUE(workflow_id,idempotency_key));
        CREATE TABLE IF NOT EXISTS durable_signals(
          workflow_id TEXT NOT NULL REFERENCES durable_runs(workflow_id),signal_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,created_at REAL NOT NULL,PRIMARY KEY(workflow_id,signal_id));
        """)
    def close(self):self.db.close()
    def _run(self,tenant_id,workflow_id):
        row=self.db.execute("SELECT * FROM durable_runs WHERE tenant_id=? AND workflow_id=?",(tenant_id,workflow_id)).fetchone()
        if row is None:raise KeyError("workflow not found")
        return row
    def _append(self,workflow_id,event_type,payload):
        row=self.db.execute("SELECT COALESCE(MAX(sequence),0)+1 n FROM durable_history WHERE workflow_id=?",(workflow_id,)).fetchone()
        seq=row["n"]
        self.db.execute("INSERT INTO durable_history VALUES(?,?,?,?,?)",(workflow_id,seq,event_type,json.dumps(payload,sort_keys=True),self.clock()))
        return seq
    def start(self,tenant_id,workflow_id,workflow_type,code_version,initial_state):
        if not all((tenant_id,workflow_id,workflow_type)) or code_version<1 or not isinstance(initial_state,dict):
            raise ValueError("invalid workflow start request")
        now=self.clock()
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self.db.execute("INSERT INTO durable_runs VALUES(?,?,?,?,?,?,?,?,?)",
                (workflow_id,tenant_id,workflow_type,code_version,"running",json.dumps(initial_state,sort_keys=True),None,now,now))
            self._append(workflow_id,"WorkflowStarted",{"code_version":code_version,"initial_state":initial_state})
            self.db.execute("COMMIT")
            return self.snapshot(tenant_id,workflow_id)
        except Exception:
            self.db.execute("ROLLBACK");raise
    def schedule_activity(self,tenant_id,workflow_id,activity_id,idempotency_key,activity_input,max_attempts=3):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            run=self._run(tenant_id,workflow_id)
            if run["state"]!="running":raise WorkflowConflict("workflow is not running")
            row=self.db.execute("SELECT * FROM durable_activities WHERE workflow_id=? AND activity_id=?",(workflow_id,activity_id)).fetchone()
            if row:
                if row["idempotency_key"]!=idempotency_key or json.loads(row["input_json"])!=activity_input:
                    raise WorkflowConflict("activity identity or input changed")
                if row["status"]=="completed":
                    self.db.execute("COMMIT")
                    return {"dispatch":False,"status":"completed","result":json.loads(row["result_json"])}
                if row["status"] in {"pending","in_progress"}:
                    self.db.execute("COMMIT")
                    return {"dispatch":False,"status":row["status"]}
                if row["attempt"]>=row["max_attempts"]:
                    self.db.execute("COMMIT")
                    return {"dispatch":False,"status":"exhausted"}
                self.db.execute("UPDATE durable_activities SET status='pending',error=NULL,updated_at=? WHERE workflow_id=? AND activity_id=?",(self.clock(),workflow_id,activity_id))
            else:
                now=self.clock()
                self.db.execute("INSERT INTO durable_activities VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (workflow_id,activity_id,idempotency_key,json.dumps(activity_input,sort_keys=True),"pending",0,max_attempts,None,None,None,None,0,now,now))
            self._append(workflow_id,"ActivityScheduled",{"activity_id":activity_id,"idempotency_key":idempotency_key})
            self.db.execute("COMMIT")
            return {"dispatch":True,"status":"pending"}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def claim_activity(self,tenant_id,workflow_id,activity_id,worker_id,lease_seconds):
        if lease_seconds<=0:raise ValueError("lease duration must be positive")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self._run(tenant_id,workflow_id)
            row=self.db.execute("SELECT * FROM durable_activities WHERE workflow_id=? AND activity_id=?",(workflow_id,activity_id)).fetchone()
            if row is None:raise KeyError("activity not found")
            if row["status"]=="completed":
                self.db.execute("COMMIT");return {"status":"completed","result":json.loads(row["result_json"])}
            now=self.clock()
            if row["status"]=="in_progress" and row["lease_expires"] and row["lease_expires"]>now:
                raise LeaseBusy("activity lease is held")
            if row["attempt"]>=row["max_attempts"]:
                raise WorkflowConflict("activity retry budget exhausted")
            fence=row["fence"]+1;attempt=row["attempt"]+1
            self.db.execute("UPDATE durable_activities SET status='in_progress',attempt=?,lease_owner=?,lease_expires=?,fence=?,updated_at=? WHERE workflow_id=? AND activity_id=?",
                (attempt,worker_id,now+lease_seconds,fence,now,workflow_id,activity_id))
            self._append(workflow_id,"ActivityClaimed",{"activity_id":activity_id,"worker_id":worker_id,"fence":fence,"attempt":attempt})
            self.db.execute("COMMIT")
            return {"status":"in_progress","worker_id":worker_id,"fence":fence,"attempt":attempt,"lease_expires":now+lease_seconds}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def _owned_activity(self,tenant_id,workflow_id,activity_id,worker_id,fence):
        self._run(tenant_id,workflow_id)
        row=self.db.execute("SELECT * FROM durable_activities WHERE workflow_id=? AND activity_id=?",(workflow_id,activity_id)).fetchone()
        if row is None or row["status"]!="in_progress" or row["lease_owner"]!=worker_id or row["fence"]!=fence or row["lease_expires"]<=self.clock():
            raise StaleWorker("activity lease or fencing token is stale")
        return row
    def heartbeat(self,tenant_id,workflow_id,activity_id,worker_id,fence,lease_seconds):
        if lease_seconds<=0:raise ValueError("lease duration must be positive")
        row=self._owned_activity(tenant_id,workflow_id,activity_id,worker_id,fence)
        expires=self.clock()+lease_seconds
        self.db.execute("UPDATE durable_activities SET lease_expires=?,updated_at=? WHERE workflow_id=? AND activity_id=? AND fence=?",
            (expires,self.clock(),workflow_id,activity_id,fence))
        self._append(workflow_id,"ActivityHeartbeat",{"activity_id":activity_id,"fence":fence,"lease_expires":expires})
        return expires
    def complete_activity(self,tenant_id,workflow_id,activity_id,worker_id,fence,result):
        if not isinstance(result,dict):raise ValueError("activity result must be an object")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self._owned_activity(tenant_id,workflow_id,activity_id,worker_id,fence)
            self.db.execute("UPDATE durable_activities SET status='completed',result_json=?,lease_owner=NULL,lease_expires=NULL,updated_at=? WHERE workflow_id=? AND activity_id=? AND fence=?",
                (json.dumps(result,sort_keys=True),self.clock(),workflow_id,activity_id,fence))
            self._append(workflow_id,"ActivityCompleted",{"activity_id":activity_id,"fence":fence,"result":result})
            self.db.execute("COMMIT")
            return {"status":"completed","result":result}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def fail_activity(self,tenant_id,workflow_id,activity_id,worker_id,fence,error):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self._owned_activity(tenant_id,workflow_id,activity_id,worker_id,fence)
            status="pending" if row["attempt"]<row["max_attempts"] else "failed"
            self.db.execute("UPDATE durable_activities SET status=?,error=?,lease_owner=NULL,lease_expires=NULL,updated_at=? WHERE workflow_id=? AND activity_id=? AND fence=?",
                (status,str(error),self.clock(),workflow_id,activity_id,fence))
            self._append(workflow_id,"ActivityFailed",{"activity_id":activity_id,"fence":fence,"error":str(error),"next_status":status})
            self.db.execute("COMMIT")
            return {"status":status,"attempt":row["attempt"]}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def signal(self,tenant_id,workflow_id,signal_id,payload):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self._run(tenant_id,workflow_id)
            row=self.db.execute("SELECT payload_json FROM durable_signals WHERE workflow_id=? AND signal_id=?",(workflow_id,signal_id)).fetchone()
            if row:
                if json.loads(row["payload_json"])!=payload:raise WorkflowConflict("signal ID reused with different payload")
                self.db.execute("COMMIT");return {"duplicate":True}
            self.db.execute("INSERT INTO durable_signals VALUES(?,?,?,?)",(workflow_id,signal_id,json.dumps(payload,sort_keys=True),self.clock()))
            self._append(workflow_id,"SignalReceived",{"signal_id":signal_id,"payload":payload})
            self.db.execute("COMMIT");return {"duplicate":False}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def continue_as_new(self,tenant_id,workflow_id,new_workflow_id,compact_state):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            run=self._run(tenant_id,workflow_id)
            if run["state"]!="running":raise WorkflowConflict("workflow is not running")
            now=self.clock()
            self.db.execute("UPDATE durable_runs SET state='continued_as_new',continued_to=?,updated_at=? WHERE workflow_id=? AND tenant_id=?",
                (new_workflow_id,now,workflow_id,tenant_id))
            self._append(workflow_id,"WorkflowContinuedAsNew",{"new_workflow_id":new_workflow_id,"compact_state":compact_state})
            self.db.execute("INSERT INTO durable_runs VALUES(?,?,?,?,?,?,?,?,?)",
                (new_workflow_id,tenant_id,run["workflow_type"],run["code_version"],"running",json.dumps(compact_state,sort_keys=True),None,now,now))
            self._append(new_workflow_id,"WorkflowStarted",{"continued_from":workflow_id,"initial_state":compact_state})
            self.db.execute("COMMIT")
            return self.snapshot(tenant_id,new_workflow_id)
        except Exception:
            self.db.execute("ROLLBACK");raise
    def snapshot(self,tenant_id,workflow_id):
        run=self._run(tenant_id,workflow_id)
        history=self.db.execute("SELECT sequence,event_type,payload_json FROM durable_history WHERE workflow_id=? ORDER BY sequence",(workflow_id,))
        activities=self.db.execute("SELECT activity_id,status,attempt,max_attempts,result_json,error,lease_owner,lease_expires,fence FROM durable_activities WHERE workflow_id=? ORDER BY created_at,activity_id",(workflow_id,))
        signals=self.db.execute("SELECT signal_id,payload_json FROM durable_signals WHERE workflow_id=? ORDER BY created_at,signal_id",(workflow_id,))
        return {"workflow_id":workflow_id,"tenant_id":tenant_id,"workflow_type":run["workflow_type"],"code_version":run["code_version"],"state":run["state"],"compact_state":json.loads(run["compact_state_json"]),"continued_to":run["continued_to"],
                "history":[{"sequence":r["sequence"],"type":r["event_type"],"payload":json.loads(r["payload_json"])} for r in history],
                "activities":[{"activity_id":a["activity_id"],"status":a["status"],"attempt":a["attempt"],"max_attempts":a["max_attempts"],"result":json.loads(a["result_json"]) if a["result_json"] else None,"error":a["error"],"lease_owner":a["lease_owner"],"lease_expires":a["lease_expires"],"fence":a["fence"]} for a in activities],
                "signals":[{"signal_id":s["signal_id"],"payload":json.loads(s["payload_json"])} for s in signals]}
