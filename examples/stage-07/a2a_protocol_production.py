"""Durable, tenant-scoped A2A task store and Agent Card validation."""
import json,sqlite3,time
class A2APolicyError(PermissionError):pass
class A2ATaskStore:
 def __init__(self,path=":memory:",clock=None):
  self.db=sqlite3.connect(path,isolation_level=None);self.db.row_factory=sqlite3.Row;self.clock=clock or time.time
  self.db.execute("""CREATE TABLE IF NOT EXISTS a2a_tasks(
   task_id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,context_id TEXT NOT NULL,
   status TEXT NOT NULL,history_json TEXT NOT NULL,artifacts_json TEXT NOT NULL,
   status_message TEXT,created_at REAL NOT NULL,updated_at REAL NOT NULL)""")
 def close(self):self.db.close()
 def create(self,task_id,tenant_id,context_id,message):
  now=self.clock();self.db.execute("INSERT INTO a2a_tasks VALUES(?,?,?,'working',?,'[]','Accepted',?,?)",(task_id,tenant_id,context_id,json.dumps([message]),now,now))
  return self.get(task_id,tenant_id)
 def get(self,task_id,tenant_id):
  row=self.db.execute("SELECT * FROM a2a_tasks WHERE task_id=? AND tenant_id=?",(task_id,tenant_id)).fetchone()
  if row is None:raise KeyError("task not found")
  out=dict(row);out["history"]=json.loads(out.pop("history_json"));out["artifacts"]=json.loads(out.pop("artifacts_json"));return out
 def transition(self,task_id,tenant_id,status,status_message=None):
  allowed={"working","input-required","auth-required","completed","failed","canceled","rejected"}
  if status not in allowed:raise ValueError("invalid A2A task state")
  task=self.get(task_id,tenant_id)
  if task["status"] in {"completed","failed","canceled","rejected"}:raise ValueError("terminal task")
  self.db.execute("UPDATE a2a_tasks SET status=?,status_message=?,updated_at=? WHERE task_id=? AND tenant_id=?",(status,status_message,self.clock(),task_id,tenant_id))
  return self.get(task_id,tenant_id)

def validate_agent_card(card):
 if not card.get("name") or not card.get("supportedInterfaces"):raise ValueError("Agent Card identity and interfaces are required")
 versions={x.get("protocolVersion") for x in card["supportedInterfaces"]}
 if card.get("protocolVersion") not in versions:raise ValueError("Agent Card protocol version mismatch")
 if any(x.get("protocolBinding") not in {"JSONRPC","GRPC","HTTP+JSON"} for x in card["supportedInterfaces"]):raise ValueError("unsupported protocol binding")
 return True
