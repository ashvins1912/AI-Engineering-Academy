"""SQLite-backed approval store. Use PostgreSQL + RLS and trusted identity in production."""
import hashlib, json, sqlite3, time

def digest(action):
    return hashlib.sha256(json.dumps(action,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()

class ApprovalStore:
    def __init__(self,path=":memory:",clock=None):
        self.clock=clock or (lambda:int(time.time()))
        self.db=sqlite3.connect(path,isolation_level=None)
        self.db.row_factory=sqlite3.Row
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS requests(
          request_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, workflow_id TEXT NOT NULL,
          requester TEXT NOT NULL, action_json TEXT NOT NULL, action_hash TEXT NOT NULL,
          workflow_version INTEGER NOT NULL, policy_version TEXT NOT NULL,
          allowed_roles TEXT NOT NULL, quorum INTEGER NOT NULL, expires_at INTEGER NOT NULL,
          status TEXT NOT NULL, consumed_at INTEGER);
        CREATE TABLE IF NOT EXISTS decisions(
          id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL, tenant_id TEXT NOT NULL,
          reviewer TEXT NOT NULL, role TEXT NOT NULL, decision TEXT NOT NULL,
          action_hash TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL,
          UNIQUE(request_id,reviewer), FOREIGN KEY(request_id) REFERENCES requests(request_id));
        CREATE TABLE IF NOT EXISTS audit(
          id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL, tenant_id TEXT NOT NULL,
          event TEXT NOT NULL, actor TEXT NOT NULL, detail TEXT NOT NULL, created_at INTEGER NOT NULL,
          FOREIGN KEY(request_id) REFERENCES requests(request_id));
        CREATE TABLE IF NOT EXISTS operations(
          request_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE,
          action_hash TEXT NOT NULL, result_json TEXT NOT NULL, FOREIGN KEY(request_id) REFERENCES requests(request_id));
        """)
    def close(self): self.db.close()
    def _audit(self,rid,tenant,event,actor,detail):
        self.db.execute("INSERT INTO audit(request_id,tenant_id,event,actor,detail,created_at) VALUES(?,?,?,?,?,?)",
          (rid,tenant,event,actor,json.dumps(detail,sort_keys=True),self.clock()))
    def create_request(self,rid,wid,*,tenant_id,requester,action,workflow_version,policy_version,allowed_roles,quorum,expires_at):
        now=self.clock()
        if not tenant_id or not requester or not action or quorum<1 or expires_at<=now or not allowed_roles:
            raise ValueError("invalid approval request")
        body=json.dumps(action,sort_keys=True,separators=(",",":"),ensure_ascii=False); h=digest(action)
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self.db.execute("INSERT INTO requests VALUES(?,?,?,?,?,?,?,?,?,?,?,'PENDING',NULL)",
              (rid,tenant_id,wid,requester,body,h,workflow_version,policy_version,json.dumps(sorted(set(allowed_roles))),quorum,expires_at))
            self._audit(rid,tenant_id,"REQUESTED",requester,{"hash":h,"version":workflow_version,"policy":policy_version})
            self.db.execute("COMMIT")
        except Exception: self.db.execute("ROLLBACK"); raise
        return self.get_request(rid,tenant_id=tenant_id)
    def get_request(self,rid,*,tenant_id):
        row=self.db.execute("SELECT * FROM requests WHERE request_id=? AND tenant_id=?",(rid,tenant_id)).fetchone()
        if row is None: raise KeyError("approval request not found in tenant scope")
        out=dict(row); out["action"]=json.loads(out.pop("action_json")); out["allowed_roles"]=json.loads(out.pop("allowed_roles"))
        out["decisions"]=[dict(x) for x in self.db.execute("SELECT reviewer,role,decision,action_hash,reason,created_at FROM decisions WHERE request_id=? AND tenant_id=? ORDER BY id",(rid,tenant_id))]
        return out
    def decide(self,rid,*,tenant_id,reviewer,verified_roles,decision,reason="",current_action=None,current_version=None):
        if decision not in {"APPROVE","REJECT"}: raise ValueError("invalid decision")
        now=self.clock(); self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute("SELECT * FROM requests WHERE request_id=? AND tenant_id=?",(rid,tenant_id)).fetchone()
            if row is None: raise KeyError("approval request not found in tenant scope")
            if row["status"]!="PENDING" or now>=row["expires_at"]: raise PermissionError("request is not active")
            if reviewer==row["requester"]: raise PermissionError("requester cannot approve own action")
            allowed=set(json.loads(row["allowed_roles"])); matched=sorted(set(verified_roles)&allowed)
            if not matched: raise PermissionError("reviewer lacks required role")
            if current_action is not None and digest(current_action)!=row["action_hash"]: raise ValueError("action changed")
            if current_version is not None and current_version!=row["workflow_version"]: raise ValueError("workflow version changed")
            self.db.execute("INSERT INTO decisions(request_id,tenant_id,reviewer,role,decision,action_hash,reason,created_at) VALUES(?,?,?,?,?,?,?,?)",
              (rid,tenant_id,reviewer,matched[0],decision,row["action_hash"],reason,now))
            if decision=="REJECT": status="REJECTED"
            else:
                count=self.db.execute("SELECT COUNT(DISTINCT reviewer) FROM decisions WHERE request_id=? AND tenant_id=? AND decision='APPROVE' AND action_hash=?",(rid,tenant_id,row["action_hash"])).fetchone()[0]
                status="APPROVED" if count>=row["quorum"] else "PENDING"
            self.db.execute("UPDATE requests SET status=? WHERE request_id=? AND tenant_id=?",(status,rid,tenant_id))
            self._audit(rid,tenant_id,"DECISION",reviewer,{"decision":decision,"status":status,"hash":row["action_hash"]})
            self.db.execute("COMMIT")
        except Exception: self.db.execute("ROLLBACK"); raise
        return self.get_request(rid,tenant_id=tenant_id)
    def execute_once(self,rid,*,tenant_id,current_action,current_version,idempotency_key,provider):
        now=self.clock(); self.db.execute("BEGIN IMMEDIATE")
        try:
            row=self.db.execute("SELECT * FROM requests WHERE request_id=? AND tenant_id=?",(rid,tenant_id)).fetchone()
            if row is None: raise KeyError("approval request not found in tenant scope")
            existing=self.db.execute("SELECT result_json,action_hash FROM operations WHERE request_id=?",(rid,)).fetchone()
            if existing:
                if existing["action_hash"]!=row["action_hash"]: raise PermissionError("operation hash mismatch")
                self.db.execute("COMMIT"); return json.loads(existing["result_json"])
            if row["status"]!="APPROVED" or row["consumed_at"] is not None: raise PermissionError("approval is not executable")
            if now>=row["expires_at"] or digest(current_action)!=row["action_hash"] or current_version!=row["workflow_version"]:
                raise PermissionError("approval expired or action/workflow is stale")
            count=self.db.execute("SELECT COUNT(DISTINCT reviewer) FROM decisions WHERE request_id=? AND tenant_id=? AND decision='APPROVE' AND action_hash=?",(rid,tenant_id,row["action_hash"])).fetchone()[0]
            if count<row["quorum"]: raise PermissionError("quorum incomplete")
            result=provider(current_action,idempotency_key)
            self.db.execute("UPDATE requests SET consumed_at=? WHERE request_id=? AND tenant_id=?",(now,rid,tenant_id))
            self.db.execute("INSERT INTO operations VALUES(?,?,?,?,?)",(rid,tenant_id,idempotency_key,row["action_hash"],json.dumps(result,sort_keys=True)))
            self._audit(rid,tenant_id,"EXECUTED","system",{"idempotency_key":idempotency_key,"hash":row["action_hash"]})
            self.db.execute("COMMIT"); return result
        except Exception: self.db.execute("ROLLBACK"); raise
    def events(self,rid,*,tenant_id):
        if self.db.execute("SELECT 1 FROM requests WHERE request_id=? AND tenant_id=?",(rid,tenant_id)).fetchone() is None:
            raise KeyError("approval request not found in tenant scope")
        return [dict(x) for x in self.db.execute("SELECT event,actor,detail,created_at FROM audit WHERE request_id=? AND tenant_id=? ORDER BY id",(rid,tenant_id))]
