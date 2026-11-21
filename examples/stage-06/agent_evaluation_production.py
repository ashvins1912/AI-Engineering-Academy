"""SQLite evaluation ledger with immutable dataset/config fingerprints and idempotent case writes."""
import hashlib,json,sqlite3,time
class EvaluationLedger:
 def __init__(self,path=":memory:",clock=None):
  self.db=sqlite3.connect(path,isolation_level=None);self.db.row_factory=sqlite3.Row;self.clock=clock or time.time
  self.db.executescript("""
  CREATE TABLE IF NOT EXISTS eval_runs(run_id TEXT PRIMARY KEY,candidate TEXT NOT NULL,candidate_version TEXT NOT NULL,dataset_hash TEXT NOT NULL,config_hash TEXT NOT NULL,created_at REAL NOT NULL);
  CREATE TABLE IF NOT EXISTS eval_cases(run_id TEXT NOT NULL,case_id TEXT NOT NULL,result_json TEXT NOT NULL,created_at REAL NOT NULL,PRIMARY KEY(run_id,case_id),FOREIGN KEY(run_id) REFERENCES eval_runs(run_id));
  """)
 @staticmethod
 def fingerprint(value):
  return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
 def close(self):self.db.close()
 def start(self,run_id,candidate,version,dataset,config):
  self.db.execute("INSERT INTO eval_runs VALUES(?,?,?,?,?,?)",(run_id,candidate,version,self.fingerprint(dataset),self.fingerprint(config),self.clock()))
  return dict(self.db.execute("SELECT * FROM eval_runs WHERE run_id=?",(run_id,)).fetchone())
 def record_case(self,run_id,case_id,result):
  if self.db.execute("SELECT 1 FROM eval_runs WHERE run_id=?",(run_id,)).fetchone() is None:raise KeyError("evaluation run missing")
  self.db.execute("INSERT INTO eval_cases VALUES(?,?,?,?)",(run_id,case_id,json.dumps(result,sort_keys=True),self.clock()))
 def results(self,run_id):
  return [json.loads(x["result_json"]) for x in self.db.execute("SELECT result_json FROM eval_cases WHERE run_id=? ORDER BY case_id",(run_id,))]
 def metadata(self,run_id):
  row=self.db.execute("SELECT * FROM eval_runs WHERE run_id=?",(run_id,)).fetchone()
  return None if row is None else dict(row)
