"""Durable MCP side-effect idempotency ledger; remote calls stay outside DB transactions."""
import hashlib,json,sqlite3,time
class IdempotencyConflict(Exception):pass
class OperationInProgress(Exception):pass
class MCPIdempotencyLedger:
 def __init__(self,path=":memory:",clock=None):
  self.db=sqlite3.connect(path,isolation_level=None);self.db.row_factory=sqlite3.Row;self.clock=clock or time.time
  self.db.execute("""CREATE TABLE IF NOT EXISTS mcp_operations(
   tenant_id TEXT NOT NULL,tool_name TEXT NOT NULL,idempotency_key TEXT NOT NULL,
   payload_hash TEXT NOT NULL,status TEXT NOT NULL,result_json TEXT,created_at REAL NOT NULL,updated_at REAL NOT NULL,
   PRIMARY KEY(tenant_id,tool_name,idempotency_key))""")
 @staticmethod
 def payload_hash(payload):return hashlib.sha256(json.dumps(payload,sort_keys=True,separators=(",",":")).encode()).hexdigest()
 def close(self):self.db.close()
 def begin(self,tenant_id,tool_name,key,payload):
  if not all([tenant_id,tool_name,key]):raise ValueError("tenant, tool and idempotency key required")
  digest=self.payload_hash(payload);now=self.clock();self.db.execute("BEGIN IMMEDIATE")
  try:
   row=self.db.execute("SELECT * FROM mcp_operations WHERE tenant_id=? AND tool_name=? AND idempotency_key=?",(tenant_id,tool_name,key)).fetchone()
   if row:
    if row["payload_hash"]!=digest:raise IdempotencyConflict("same key used with different payload")
    self.db.execute("COMMIT")
    if row["status"]=="COMPLETED":return {"state":"COMPLETED","result":json.loads(row["result_json"])}
    return {"state":"IN_PROGRESS","result":None}
   self.db.execute("INSERT INTO mcp_operations VALUES(?,?,?,?,?,?,?,?)",(tenant_id,tool_name,key,digest,"PENDING",None,now,now))
   self.db.execute("COMMIT");return {"state":"RESERVED","result":None}
  except Exception:self.db.execute("ROLLBACK");raise
 def complete(self,tenant_id,tool_name,key,payload,result):
  digest=self.payload_hash(payload);now=self.clock()
  cur=self.db.execute("UPDATE mcp_operations SET status='COMPLETED',result_json=?,updated_at=? WHERE tenant_id=? AND tool_name=? AND idempotency_key=? AND payload_hash=? AND status='PENDING'",(json.dumps(result,sort_keys=True),now,tenant_id,tool_name,key,digest))
  if cur.rowcount!=1:raise IdempotencyConflict("operation not pending or payload mismatch")
  return result
 def reconcile(self,tenant_id,tool_name,key,payload,provider_lookup):
  digest=self.payload_hash(payload)
  row=self.db.execute("SELECT status,payload_hash FROM mcp_operations WHERE tenant_id=? AND tool_name=? AND idempotency_key=?",(tenant_id,tool_name,key)).fetchone()
  if row is None:raise KeyError("operation not found")
  if row["payload_hash"]!=digest:raise IdempotencyConflict("payload mismatch")
  if row["status"]=="COMPLETED":return {"state":"COMPLETED"}
  result=provider_lookup(key)
  if result is None:return {"state":"IN_PROGRESS"}
  self.complete(tenant_id,tool_name,key,payload,result)
  return {"state":"COMPLETED","result":result}
