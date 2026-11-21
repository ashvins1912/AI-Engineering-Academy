"""SQLite experiment tracking backend with immutable params and metric history."""
import hashlib
import json
import sqlite3
import time

class TrackingConflict(Exception):pass

class ExperimentStore:
    def __init__(self,path=":memory:",clock=None):
        self.db=sqlite3.connect(path,isolation_level=None)
        self.db.row_factory=sqlite3.Row
        self.clock=clock or time.time
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS experiments(
          experiment_id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,name TEXT NOT NULL,
          created_at REAL NOT NULL,UNIQUE(tenant_id,name));
        CREATE TABLE IF NOT EXISTS runs(
          run_id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,experiment_id TEXT NOT NULL REFERENCES experiments(experiment_id),
          status TEXT NOT NULL,dataset_hash TEXT NOT NULL,split_hash TEXT NOT NULL,
          metric_protocol TEXT NOT NULL,metadata_json TEXT NOT NULL,started_at REAL NOT NULL,ended_at REAL);
        CREATE TABLE IF NOT EXISTS run_params(
          run_id TEXT NOT NULL REFERENCES runs(run_id),param_key TEXT NOT NULL,value_json TEXT NOT NULL,
          PRIMARY KEY(run_id,param_key));
        CREATE TABLE IF NOT EXISTS run_metrics(
          run_id TEXT NOT NULL REFERENCES runs(run_id),metric_key TEXT NOT NULL,step INTEGER NOT NULL,
          value REAL NOT NULL,logged_at REAL NOT NULL,PRIMARY KEY(run_id,metric_key,step));
        CREATE TABLE IF NOT EXISTS run_artifacts(
          run_id TEXT NOT NULL REFERENCES runs(run_id),artifact_name TEXT NOT NULL,
          sha256 TEXT NOT NULL,size_bytes INTEGER NOT NULL,media_type TEXT NOT NULL,uri TEXT NOT NULL,
          created_at REAL NOT NULL,PRIMARY KEY(run_id,artifact_name));
        CREATE TABLE IF NOT EXISTS run_datasets(
          run_id TEXT NOT NULL REFERENCES runs(run_id),dataset_name TEXT NOT NULL,
          dataset_version TEXT NOT NULL,content_hash TEXT NOT NULL,split_hash TEXT NOT NULL,
          manifest_json TEXT NOT NULL,PRIMARY KEY(run_id,dataset_name,dataset_version));
        """)
    def close(self):self.db.close()
    def create_experiment(self,tenant_id,experiment_id,name):
        self.db.execute("INSERT INTO experiments VALUES(?,?,?,?)",(experiment_id,tenant_id,name,self.clock()))
        return experiment_id
    def _run(self,tenant_id,run_id):
        row=self.db.execute("SELECT * FROM runs WHERE tenant_id=? AND run_id=?",(tenant_id,run_id)).fetchone()
        if row is None:raise KeyError("run not found")
        return row
    def start_run(self,tenant_id,experiment_id,run_id,dataset,metric_protocol,metadata):
        exp=self.db.execute("SELECT * FROM experiments WHERE tenant_id=? AND experiment_id=?",(tenant_id,experiment_id)).fetchone()
        if exp is None:raise KeyError("experiment not found")
        if not dataset.get("content_hash") or not dataset.get("split_hash"):raise ValueError("dataset hashes required")
        now=self.clock()
        self.db.execute("BEGIN IMMEDIATE")
        try:
            self.db.execute("INSERT INTO runs VALUES(?,?,?,?,?,?,?,?,?,NULL)",
                (run_id,tenant_id,experiment_id,"running",dataset["content_hash"],dataset["split_hash"],metric_protocol,json.dumps(metadata,sort_keys=True),now))
            self.db.execute("INSERT INTO run_datasets VALUES(?,?,?,?,?,?)",
                (run_id,dataset["name"],dataset["version"],dataset["content_hash"],dataset["split_hash"],json.dumps(dataset,sort_keys=True)))
            self.db.execute("COMMIT");return run_id
        except Exception:
            self.db.execute("ROLLBACK");raise
    def log_param(self,tenant_id,run_id,key,value):
        run=self._run(tenant_id,run_id)
        if run["status"]!="running":raise TrackingConflict("run is not active")
        encoded=json.dumps(value,sort_keys=True)
        prior=self.db.execute("SELECT value_json FROM run_params WHERE run_id=? AND param_key=?",(run_id,key)).fetchone()
        if prior:
            if prior["value_json"]!=encoded:raise TrackingConflict("run parameter is immutable")
            return False
        self.db.execute("INSERT INTO run_params VALUES(?,?,?)",(run_id,key,encoded));return True
    def log_metric(self,tenant_id,run_id,key,value,step):
        run=self._run(tenant_id,run_id)
        if run["status"]!="running":raise TrackingConflict("run is not active")
        if not isinstance(step,int) or step<0 or not isinstance(value,(int,float)):
            raise ValueError("metric requires non-negative integer step and numeric value")
        row=self.db.execute("SELECT MAX(step) last FROM run_metrics WHERE run_id=? AND metric_key=?",(run_id,key)).fetchone()
        if row["last"] is not None and step<=row["last"]:raise TrackingConflict("metric step must increase")
        self.db.execute("INSERT INTO run_metrics VALUES(?,?,?,?,?)",(run_id,key,step,float(value),self.clock()))
        return True
    def log_artifact(self,tenant_id,run_id,name,content,media_type,uri):
        run=self._run(tenant_id,run_id)
        if run["status"]!="running":raise TrackingConflict("run is not active")
        raw=content.encode() if isinstance(content,str) else bytes(content)
        digest=hashlib.sha256(raw).hexdigest()
        prior=self.db.execute("SELECT sha256 FROM run_artifacts WHERE run_id=? AND artifact_name=?",(run_id,name)).fetchone()
        if prior:
            if prior["sha256"]!=digest:raise TrackingConflict("artifact name already bound to different bytes")
            return {"sha256":digest,"duplicate":True}
        self.db.execute("INSERT INTO run_artifacts VALUES(?,?,?,?,?,?,?)",(run_id,name,digest,len(raw),media_type,uri,self.clock()))
        return {"sha256":digest,"duplicate":False}
    def finish_run(self,tenant_id,run_id,status="finished"):
        if status not in {"finished","failed","killed"}:raise ValueError("invalid run status")
        run=self._run(tenant_id,run_id)
        if run["status"]!="running":raise TrackingConflict("run is already terminal")
        self.db.execute("UPDATE runs SET status=?,ended_at=? WHERE tenant_id=? AND run_id=?",(status,self.clock(),tenant_id,run_id))
    def compare_runs(self,tenant_id,run_a,run_b,metric):
        a=self._run(tenant_id,run_a);b=self._run(tenant_id,run_b)
        if (a["dataset_hash"],a["split_hash"],a["metric_protocol"])!=(b["dataset_hash"],b["split_hash"],b["metric_protocol"]):
            raise TrackingConflict("runs use different evaluation protocol")
        def latest(run_id):
            row=self.db.execute("SELECT value,step FROM run_metrics WHERE run_id=? AND metric_key=? ORDER BY step DESC LIMIT 1",(run_id,metric)).fetchone()
            if row is None:raise KeyError("metric not found")
            return {"value":row["value"],"step":row["step"]}
        av=latest(run_a);bv=latest(run_b)
        return {"metric":metric,"a":av,"b":bv,"delta":bv["value"]-av["value"]}
    def snapshot(self,tenant_id,run_id):
        run=self._run(tenant_id,run_id)
        params=self.db.execute("SELECT param_key,value_json FROM run_params WHERE run_id=? ORDER BY param_key",(run_id,))
        metrics=self.db.execute("SELECT metric_key,step,value FROM run_metrics WHERE run_id=? ORDER BY metric_key,step",(run_id,))
        artifacts=self.db.execute("SELECT artifact_name,sha256,size_bytes,media_type,uri FROM run_artifacts WHERE run_id=? ORDER BY artifact_name",(run_id,))
        datasets=self.db.execute("SELECT dataset_name,dataset_version,content_hash,split_hash FROM run_datasets WHERE run_id=?",(run_id,))
        return {"run_id":run_id,"tenant_id":tenant_id,"experiment_id":run["experiment_id"],"status":run["status"],
          "dataset_hash":run["dataset_hash"],"split_hash":run["split_hash"],"metric_protocol":run["metric_protocol"],
          "metadata":json.loads(run["metadata_json"]),
          "params":{p["param_key"]:json.loads(p["value_json"]) for p in params},
          "metrics":[dict(m) for m in metrics],"artifacts":[dict(a) for a in artifacts],"datasets":[dict(d) for d in datasets]}
