"""SQLite-backed graph checkpoints with tenant-scoped threads and optimistic versions."""
import json,sqlite3,time

class SQLiteGraphCheckpoints:
 def __init__(self,path=":memory:",clock=None):
  self.db=sqlite3.connect(path,isolation_level=None);self.db.row_factory=sqlite3.Row
  self.clock=clock or time.time
  self.db.execute("""CREATE TABLE IF NOT EXISTS graph_checkpoints(
   tenant_id TEXT NOT NULL,thread_id TEXT NOT NULL,version INTEGER NOT NULL,
   state_json TEXT NOT NULL,updated_at REAL NOT NULL,
   PRIMARY KEY(tenant_id,thread_id))""")
  self.db.execute("""CREATE TABLE IF NOT EXISTS graph_events(
   id INTEGER PRIMARY KEY AUTOINCREMENT,tenant_id TEXT NOT NULL,thread_id TEXT NOT NULL,
   version INTEGER NOT NULL,node TEXT NOT NULL,event_json TEXT NOT NULL,created_at REAL NOT NULL,
   UNIQUE(tenant_id,thread_id,version))""")
 def close(self): self.db.close()
 def load(self,tenant_id,thread_id):
  row=self.db.execute("SELECT version,state_json FROM graph_checkpoints WHERE tenant_id=? AND thread_id=?",(tenant_id,thread_id)).fetchone()
  return None if row is None else {"version":row["version"],"state":json.loads(row["state_json"])}
 def save(self,tenant_id,thread_id,expected_version,state,node,event):
  self.db.execute("BEGIN IMMEDIATE")
  try:
   row=self.db.execute("SELECT version FROM graph_checkpoints WHERE tenant_id=? AND thread_id=?",(tenant_id,thread_id)).fetchone()
   actual=row["version"] if row else 0
   if actual!=expected_version: raise RuntimeError("checkpoint version conflict")
   version=actual+1
   body=json.dumps(state,sort_keys=True)
   if row:
    self.db.execute("UPDATE graph_checkpoints SET version=?,state_json=?,updated_at=? WHERE tenant_id=? AND thread_id=? AND version=?",(version,body,self.clock(),tenant_id,thread_id,actual))
   else:
    self.db.execute("INSERT INTO graph_checkpoints VALUES(?,?,?,?,?)",(tenant_id,thread_id,version,body,self.clock()))
   self.db.execute("INSERT INTO graph_events(tenant_id,thread_id,version,node,event_json,created_at) VALUES(?,?,?,?,?,?)",(tenant_id,thread_id,version,node,json.dumps(event,sort_keys=True),self.clock()))
   self.db.execute("COMMIT");return version
  except Exception:self.db.execute("ROLLBACK");raise
 def events(self,tenant_id,thread_id):
  return [dict(x) for x in self.db.execute("SELECT version,node,event_json,created_at FROM graph_events WHERE tenant_id=? AND thread_id=? ORDER BY version",(tenant_id,thread_id))]

def state_to_json(state):
 return {"values":state.values,"next_node":state.next_node,"status":state.status,"steps":state.steps}
