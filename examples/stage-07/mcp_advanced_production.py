"""Durable task extension store with tenant-scoped reads and cooperative cancellation."""
import json,sqlite3,time
class MCPTaskStore:
 def __init__(self,path=":memory:",clock=None):
  self.db=sqlite3.connect(path,isolation_level=None);self.db.row_factory=sqlite3.Row;self.clock=clock or time.time
  self.db.execute("""CREATE TABLE IF NOT EXISTS mcp_tasks(
   task_id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,status TEXT NOT NULL,
   result_json TEXT,cancel_requested INTEGER NOT NULL DEFAULT 0,
   created_at REAL NOT NULL,updated_at REAL NOT NULL)""")
 def close(self):self.db.close()
 def create(self,task_id,tenant_id):
  now=self.clock();self.db.execute("INSERT INTO mcp_tasks(task_id,tenant_id,status,created_at,updated_at) VALUES(?,?,'working',?,?)",(task_id,tenant_id,now,now))
  return self.get(task_id,tenant_id)
 def get(self,task_id,tenant_id):
  row=self.db.execute("SELECT * FROM mcp_tasks WHERE task_id=? AND tenant_id=?",(task_id,tenant_id)).fetchone()
  if row is None:raise KeyError("task not found")
  out=dict(row);out["result"]=json.loads(out["result_json"]) if out["result_json"] else None;del out["result_json"];return out
 def update(self,task_id,tenant_id,status,result=None):
  if status not in {"working","input_required","completed","failed","cancelled"}:raise ValueError("invalid status")
  row=self.get(task_id,tenant_id)
  if row["status"] in {"completed","failed","cancelled"}:raise ValueError("terminal task")
  self.db.execute("UPDATE mcp_tasks SET status=?,result_json=?,updated_at=? WHERE task_id=? AND tenant_id=?",(status,json.dumps(result) if result is not None else None,self.clock(),task_id,tenant_id))
  return self.get(task_id,tenant_id)
 def cancel(self,task_id,tenant_id):
  row=self.get(task_id,tenant_id)
  if row["status"] not in {"completed","failed","cancelled"}:
   self.db.execute("UPDATE mcp_tasks SET cancel_requested=1,updated_at=? WHERE task_id=? AND tenant_id=?",(self.clock(),task_id,tenant_id))
  return self.get(task_id,tenant_id)
