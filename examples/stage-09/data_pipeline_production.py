"""SQLite lineage catalog: immutable dataset versions and atomic pipeline run records."""
import json,sqlite3,time
from data_feature_pipeline import canonical_hash

class LineageConflict(RuntimeError):pass
class LineageCatalog:
 def __init__(self,path=":memory:",clock=None):
  self.db=sqlite3.connect(path,isolation_level=None);self.db.row_factory=sqlite3.Row;self.clock=clock or time.time
  self.db.execute("""CREATE TABLE IF NOT EXISTS dataset_versions(
   tenant_id TEXT NOT NULL,dataset_name TEXT NOT NULL,version TEXT NOT NULL,
   manifest_hash TEXT NOT NULL,manifest_json TEXT NOT NULL,created_at REAL NOT NULL,
   PRIMARY KEY(tenant_id,dataset_name,version),UNIQUE(tenant_id,dataset_name,manifest_hash))""")
  self.db.execute("""CREATE TABLE IF NOT EXISTS pipeline_runs(
   tenant_id TEXT NOT NULL,run_id TEXT NOT NULL,dataset_name TEXT NOT NULL,version TEXT NOT NULL,
   status TEXT NOT NULL,code_revision TEXT NOT NULL,started_at REAL NOT NULL,finished_at REAL,
   metrics_json TEXT NOT NULL,PRIMARY KEY(tenant_id,run_id),
   FOREIGN KEY(tenant_id,dataset_name,version) REFERENCES dataset_versions(tenant_id,dataset_name,version))""")
 def close(self):self.db.close()
 def register_dataset(self,tenant_id,dataset_name,version,manifest):
  body=json.dumps(manifest,sort_keys=True,separators=(",",":"));digest=canonical_hash(manifest)
  self.db.execute("BEGIN IMMEDIATE")
  try:
   row=self.db.execute("SELECT manifest_hash,manifest_json FROM dataset_versions WHERE tenant_id=? AND dataset_name=? AND version=?",(tenant_id,dataset_name,version)).fetchone()
   if row:
    if row["manifest_hash"]!=digest:raise LineageConflict("dataset version is immutable")
    self.db.execute("COMMIT");return digest
   self.db.execute("INSERT INTO dataset_versions VALUES(?,?,?,?,?,?)",(tenant_id,dataset_name,version,digest,body,self.clock()))
   self.db.execute("COMMIT");return digest
  except Exception:self.db.execute("ROLLBACK");raise
 def start_run(self,tenant_id,run_id,dataset_name,version,code_revision):
  exists=self.db.execute("SELECT 1 FROM dataset_versions WHERE tenant_id=? AND dataset_name=? AND version=?",(tenant_id,dataset_name,version)).fetchone()
  if not exists:raise KeyError("dataset version not registered for tenant")
  self.db.execute("INSERT INTO pipeline_runs VALUES(?,?,?,?,?,?,?,NULL,'{}')",(tenant_id,run_id,dataset_name,version,"running",code_revision,self.clock()))
 def finish_run(self,tenant_id,run_id,status,metrics):
  if status not in ("succeeded","failed"):raise ValueError("terminal status must be succeeded or failed")
  cur=self.db.execute("UPDATE pipeline_runs SET status=?,finished_at=?,metrics_json=? WHERE tenant_id=? AND run_id=? AND status='running'",(status,self.clock(),json.dumps(metrics,sort_keys=True),tenant_id,run_id))
  if cur.rowcount!=1:raise LineageConflict("run missing, tenant mismatch or already terminal")
 def get_dataset(self,tenant_id,name,version):
  row=self.db.execute("SELECT * FROM dataset_versions WHERE tenant_id=? AND dataset_name=? AND version=?",(tenant_id,name,version)).fetchone()
  return None if row is None else {**dict(row),"manifest":json.loads(row["manifest_json"])}
 def get_run(self,tenant_id,run_id):
  row=self.db.execute("SELECT * FROM pipeline_runs WHERE tenant_id=? AND run_id=?",(tenant_id,run_id)).fetchone()
  return None if row is None else {**dict(row),"metrics":json.loads(row["metrics_json"])}
