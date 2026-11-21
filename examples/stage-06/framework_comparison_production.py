"""Durable benchmark ledger: reproducible runs, hard safety gates and idempotent candidate records."""
import hashlib,json,sqlite3,time

class BenchmarkLedger:
 def __init__(self,path=":memory:",clock=None):
  self.db=sqlite3.connect(path,isolation_level=None);self.db.row_factory=sqlite3.Row
  self.clock=clock or time.time
  self.db.executescript("""
  CREATE TABLE IF NOT EXISTS benchmark_runs(
   run_id TEXT PRIMARY KEY, fixture_hash TEXT NOT NULL, config_json TEXT NOT NULL,
   created_at REAL NOT NULL);
  CREATE TABLE IF NOT EXISTS candidate_results(
   run_id TEXT NOT NULL, framework TEXT NOT NULL, framework_version TEXT NOT NULL,
   result_json TEXT NOT NULL, metrics_json TEXT NOT NULL, hard_gates_passed INTEGER NOT NULL,
   recorded_at REAL NOT NULL, PRIMARY KEY(run_id,framework),
   FOREIGN KEY(run_id) REFERENCES benchmark_runs(run_id));
  """)
 def close(self):self.db.close()
 @staticmethod
 def canonical_hash(value):
  return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
 def create_run(self,run_id,fixture,config):
  self.db.execute("INSERT INTO benchmark_runs VALUES(?,?,?,?)",(run_id,self.canonical_hash(fixture),json.dumps(config,sort_keys=True),self.clock()))
  return self.db.execute("SELECT fixture_hash FROM benchmark_runs WHERE run_id=?",(run_id,)).fetchone()[0]
 def record(self,run_id,framework,version,result,metrics,hard_gates):
  if not framework or not version:raise ValueError("framework and pinned version are required")
  row=self.db.execute("SELECT 1 FROM benchmark_runs WHERE run_id=?",(run_id,)).fetchone()
  if row is None:raise KeyError("benchmark run not found")
  body=json.dumps(result,sort_keys=True);metric_body=json.dumps(metrics,sort_keys=True)
  self.db.execute("INSERT INTO candidate_results VALUES(?,?,?,?,?,?,?)",(run_id,framework,version,body,metric_body,int(bool(hard_gates)),self.clock()))
  return self.get(run_id,framework)
 def get(self,run_id,framework):
  row=self.db.execute("SELECT * FROM candidate_results WHERE run_id=? AND framework=?",(run_id,framework)).fetchone()
  return None if row is None else {"framework":row["framework"],"version":row["framework_version"],"result":json.loads(row["result_json"]),"metrics":json.loads(row["metrics_json"]),"hard_gates_passed":bool(row["hard_gates_passed"])}
 def decision_candidates(self,run_id):
  rows=self.db.execute("SELECT framework,framework_version,hard_gates_passed,metrics_json FROM candidate_results WHERE run_id=? ORDER BY framework",(run_id,))
  return [{"framework":r["framework"],"version":r["framework_version"],"eligible":bool(r["hard_gates_passed"]),"metrics":json.loads(r["metrics_json"])} for r in rows]
