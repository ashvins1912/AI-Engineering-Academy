"""Immutable evaluation report store and fail-closed CI gate."""
import json,sqlite3,time
from evaluation import evaluate_suite,compare_candidate_to_baseline,EvaluationPolicy,canonical_hash

class EvaluationConflict(Exception):pass

class EvaluationReportStore:
 def __init__(self,path=":memory:",clock=None):
  self.db=sqlite3.connect(path,isolation_level=None);self.db.row_factory=sqlite3.Row;self.clock=clock or time.time
  self.db.execute("""CREATE TABLE IF NOT EXISTS evaluation_reports(
   tenant_id TEXT NOT NULL,run_id TEXT NOT NULL,bundle_digest TEXT NOT NULL,
   dataset_hash TEXT NOT NULL,evaluator_version TEXT NOT NULL,report_hash TEXT NOT NULL,
   report_json TEXT NOT NULL,passed INTEGER NOT NULL,created_at REAL NOT NULL,
   PRIMARY KEY(tenant_id,run_id))""")
 def close(self):self.db.close()
 def save(self,tenant_id,run_id,bundle_digest,report):
  if not tenant_id or not run_id or not bundle_digest:raise ValueError("tenant, run and bundle identity required")
  if not report.get("dataset_hash") or not report.get("evaluator_version"):raise ValueError("evaluation provenance required")
  body=json.dumps(report,sort_keys=True,separators=(",",":"));digest=canonical_hash(report)
  self.db.execute("BEGIN IMMEDIATE")
  try:
   prior=self.db.execute("SELECT report_hash FROM evaluation_reports WHERE tenant_id=? AND run_id=?",(tenant_id,run_id)).fetchone()
   if prior:
    if prior["report_hash"]!=digest:raise EvaluationConflict("evaluation run ID is immutable")
    self.db.execute("COMMIT");return {"run_id":run_id,"report_hash":digest,"duplicate":True}
   self.db.execute("INSERT INTO evaluation_reports VALUES(?,?,?,?,?,?,?,?,?)",
    (tenant_id,run_id,bundle_digest,report["dataset_hash"],report["evaluator_version"],digest,body,int(report["passed"]),self.clock()))
   self.db.execute("COMMIT");return {"run_id":run_id,"report_hash":digest,"duplicate":False}
  except Exception:self.db.execute("ROLLBACK");raise
 def get(self,tenant_id,run_id):
  row=self.db.execute("SELECT * FROM evaluation_reports WHERE tenant_id=? AND run_id=?",(tenant_id,run_id)).fetchone()
  return None if row is None else {**dict(row),"report":json.loads(row["report_json"])}

def run_release_gate(cases,outputs,tenant_id,run_id,bundle_digest,store,policy=EvaluationPolicy(),baseline=None,latencies=None,costs=None):
 report=evaluate_suite(cases,outputs,policy,latencies,costs)
 if baseline is not None:
  report["comparison"]=compare_candidate_to_baseline(report,baseline,policy)
  report["passed"]=report["passed"] and report["comparison"]["passed"]
 saved=store.save(tenant_id,run_id,bundle_digest,report)
 return {"exit_code":0 if report["passed"] else 1,"report":report,"persisted":saved}

