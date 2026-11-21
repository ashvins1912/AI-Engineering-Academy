"""SQLite model/prompt registry with immutable versions, approvals and atomic aliases."""
import hashlib
import json
import sqlite3
import time

class RegistryConflict(Exception):pass
class PromotionDenied(Exception):pass

def sha256(value):
    raw=value.encode() if isinstance(value,str) else bytes(value)
    return hashlib.sha256(raw).hexdigest()

class ModelPromptRegistry:
    def __init__(self,path=":memory:",clock=None):
        self.db=sqlite3.connect(path,isolation_level=None)
        self.db.row_factory=sqlite3.Row
        self.clock=clock or time.time
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS registry_models(
          tenant_id TEXT NOT NULL,name TEXT NOT NULL,version TEXT NOT NULL,digest TEXT NOT NULL,
          artifact_uri TEXT NOT NULL,source_run TEXT NOT NULL,dataset_hash TEXT NOT NULL,
          code_commit TEXT NOT NULL,model_family TEXT NOT NULL,tokenizer_version TEXT NOT NULL,
          tool_schema_version TEXT NOT NULL,input_schema_json TEXT NOT NULL,output_schema_json TEXT NOT NULL,
          creator TEXT NOT NULL,created_at REAL NOT NULL,PRIMARY KEY(tenant_id,name,version));
        CREATE TABLE IF NOT EXISTS registry_prompts(
          tenant_id TEXT NOT NULL,name TEXT NOT NULL,version TEXT NOT NULL,digest TEXT NOT NULL,
          template TEXT NOT NULL,variables_json TEXT NOT NULL,model_family TEXT NOT NULL,
          tokenizer_version TEXT NOT NULL,tool_schema_version TEXT NOT NULL,safety_policy TEXT NOT NULL,
          creator TEXT NOT NULL,created_at REAL NOT NULL,PRIMARY KEY(tenant_id,name,version));
        CREATE TABLE IF NOT EXISTS release_bundles(
          tenant_id TEXT NOT NULL,bundle_id TEXT NOT NULL,model_name TEXT NOT NULL,model_version TEXT NOT NULL,
          prompt_name TEXT NOT NULL,prompt_version TEXT NOT NULL,manifest_json TEXT NOT NULL,manifest_hash TEXT NOT NULL,
          quality_score REAL NOT NULL,creators_json TEXT NOT NULL,created_at REAL NOT NULL,
          PRIMARY KEY(tenant_id,bundle_id));
        CREATE TABLE IF NOT EXISTS release_approvals(
          tenant_id TEXT NOT NULL,bundle_id TEXT NOT NULL,approver TEXT NOT NULL,
          manifest_hash TEXT NOT NULL,approved_at REAL NOT NULL,
          PRIMARY KEY(tenant_id,bundle_id));
        CREATE TABLE IF NOT EXISTS release_aliases(
          tenant_id TEXT NOT NULL,alias TEXT NOT NULL,bundle_id TEXT NOT NULL,
          alias_version INTEGER NOT NULL,previous_bundle_id TEXT,updated_at REAL NOT NULL,
          PRIMARY KEY(tenant_id,alias));
        CREATE TABLE IF NOT EXISTS alias_history(
          tenant_id TEXT NOT NULL,alias TEXT NOT NULL,sequence INTEGER NOT NULL,
          action TEXT NOT NULL,bundle_id TEXT NOT NULL,previous_bundle_id TEXT,
          alias_version INTEGER NOT NULL,actor TEXT NOT NULL,created_at REAL NOT NULL,
          PRIMARY KEY(tenant_id,alias,sequence));
        CREATE TABLE IF NOT EXISTS registry_audit(
          id INTEGER PRIMARY KEY AUTOINCREMENT,tenant_id TEXT NOT NULL,event_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,payload_json TEXT NOT NULL,created_at REAL NOT NULL);
        """)
    def close(self):self.db.close()
    def register_model(self,tenant,name,version,artifact,artifact_uri,source_run,dataset_hash,code_commit,model_family,tokenizer_version,tool_schema_version,input_schema,output_schema,creator):
        if not all((tenant,name,version,artifact_uri,source_run,dataset_hash,code_commit,model_family,tokenizer_version,tool_schema_version,creator)):
            raise ValueError("model provenance and compatibility metadata required")
        digest=sha256(artifact);metadata=(digest,artifact_uri,source_run,dataset_hash,code_commit,model_family,tokenizer_version,tool_schema_version,json.dumps(input_schema,sort_keys=True),json.dumps(output_schema,sort_keys=True),creator)
        prior=self.db.execute("SELECT * FROM registry_models WHERE tenant_id=? AND name=? AND version=?",(tenant,name,version)).fetchone()
        if prior:
            existing=tuple(prior[k] for k in ("digest","artifact_uri","source_run","dataset_hash","code_commit","model_family","tokenizer_version","tool_schema_version","input_schema_json","output_schema_json","creator"))
            if existing!=metadata:raise RegistryConflict("model version is immutable")
            return {"version":version,"digest":digest,"duplicate":True}
        self.db.execute("INSERT INTO registry_models VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(tenant,name,version,*metadata,self.clock()))
        self.db.execute("INSERT INTO registry_audit(tenant_id,event_type,entity_id,payload_json,created_at) VALUES(?,?,?,?,?)",(tenant,"model_registered",f"{name}:{version}",json.dumps({"digest":digest,"source_run":source_run}),self.clock()))
        return {"version":version,"digest":digest,"duplicate":False}
    def register_prompt(self,tenant,name,version,template,variables,model_family,tokenizer_version,tool_schema_version,safety_policy,creator):
        if not all((tenant,name,version,model_family,tokenizer_version,tool_schema_version,safety_policy,creator)):
            raise ValueError("prompt compatibility metadata required")
        digest=sha256(template);metadata=(digest,template,json.dumps(variables,sort_keys=True),model_family,tokenizer_version,tool_schema_version,safety_policy,creator)
        prior=self.db.execute("SELECT * FROM registry_prompts WHERE tenant_id=? AND name=? AND version=?",(tenant,name,version)).fetchone()
        if prior:
            existing=tuple(prior[k] for k in ("digest","template","variables_json","model_family","tokenizer_version","tool_schema_version","safety_policy","creator"))
            if existing!=metadata:raise RegistryConflict("prompt version is immutable")
            return {"version":version,"digest":digest,"duplicate":True}
        self.db.execute("INSERT INTO registry_prompts VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",(tenant,name,version,*metadata,self.clock()))
        self.db.execute("INSERT INTO registry_audit(tenant_id,event_type,entity_id,payload_json,created_at) VALUES(?,?,?,?,?)",(tenant,"prompt_registered",f"{name}:{version}",json.dumps({"digest":digest}),self.clock()))
        return {"version":version,"digest":digest,"duplicate":False}
    def build_bundle(self,tenant,bundle_id,model_ref,prompt_ref,evaluation_hash,quality_score):
        if not tenant or not bundle_id or not evaluation_hash:
            raise ValueError("tenant, bundle ID and evaluation evidence hash are required")
        if not 0.0 <= quality_score <= 1.0:
            raise ValueError("quality score must be between 0 and 1")
        model=self.db.execute("SELECT * FROM registry_models WHERE tenant_id=? AND name=? AND version=?",(tenant,*model_ref)).fetchone()
        prompt=self.db.execute("SELECT * FROM registry_prompts WHERE tenant_id=? AND name=? AND version=?",(tenant,*prompt_ref)).fetchone()
        if not model or not prompt:raise KeyError("model or prompt version not found")
        if (model["model_family"],model["tokenizer_version"],model["tool_schema_version"])!=(prompt["model_family"],prompt["tokenizer_version"],prompt["tool_schema_version"]):
            raise PromotionDenied("model/prompt compatibility mismatch")
        manifest={"model":{"name":model["name"],"version":model["version"],"digest":model["digest"],
              "artifact_uri":model["artifact_uri"],"source_run":model["source_run"],
              "dataset_hash":model["dataset_hash"],"code_commit":model["code_commit"],
              "family":model["model_family"],"input_schema":json.loads(model["input_schema_json"]),
              "output_schema":json.loads(model["output_schema_json"])},
          "prompt":{"name":prompt["name"],"version":prompt["version"],"digest":prompt["digest"],
              "variables":json.loads(prompt["variables_json"]),"safety_policy":prompt["safety_policy"]},
          "tokenizer":model["tokenizer_version"],"tool_schema":model["tool_schema_version"],
          "evaluation_hash":evaluation_hash,"quality_score":quality_score}
        manifest_json=json.dumps(manifest,sort_keys=True);manifest_hash=sha256(manifest_json)
        creators=sorted({model["creator"],prompt["creator"]})
        prior=self.db.execute("SELECT * FROM release_bundles WHERE tenant_id=? AND bundle_id=?",(tenant,bundle_id)).fetchone()
        if prior:
            if (prior["manifest_hash"],prior["quality_score"],prior["creators_json"])!=(manifest_hash,quality_score,json.dumps(creators)):
                raise RegistryConflict("release bundle ID is immutable")
            return {"bundle_id":bundle_id,"manifest_hash":manifest_hash,"duplicate":True}
        self.db.execute("INSERT INTO release_bundles VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (tenant,bundle_id,model["name"],model["version"],prompt["name"],prompt["version"],manifest_json,manifest_hash,quality_score,json.dumps(creators),self.clock()))
        self.db.execute("INSERT INTO registry_audit(tenant_id,event_type,entity_id,payload_json,created_at) VALUES(?,?,?,?,?)",(tenant,"bundle_created",bundle_id,json.dumps({"manifest_hash":manifest_hash,"quality_score":quality_score}),self.clock()))
        return {"bundle_id":bundle_id,"manifest_hash":manifest_hash,"duplicate":False}
    def approve(self,tenant,bundle_id,approver,allowed_approvers):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            bundle=self.db.execute("SELECT * FROM release_bundles WHERE tenant_id=? AND bundle_id=?",(tenant,bundle_id)).fetchone()
            if not bundle:raise KeyError("bundle not found")
            creators=set(json.loads(bundle["creators_json"]))
            if approver not in set(allowed_approvers) or approver in creators:
                raise PromotionDenied("independent authorized approval required")
            self.db.execute("INSERT INTO release_approvals VALUES(?,?,?,?,?)",(tenant,bundle_id,approver,bundle["manifest_hash"],self.clock()))
            self.db.execute("INSERT INTO registry_audit(tenant_id,event_type,entity_id,payload_json,created_at) VALUES(?,?,?,?,?)",(tenant,"bundle_approved",bundle_id,json.dumps({"approver":approver,"manifest_hash":bundle["manifest_hash"]}),self.clock()))
            self.db.execute("COMMIT");return {"approved":True,"approver":approver}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def _alias_history(self,tenant,alias,action,bundle_id,previous,version,actor):
        row=self.db.execute("SELECT COALESCE(MAX(sequence),0)+1 n FROM alias_history WHERE tenant_id=? AND alias=?",(tenant,alias)).fetchone()
        self.db.execute("INSERT INTO alias_history VALUES(?,?,?,?,?,?,?,?,?)",(tenant,alias,row["n"],action,bundle_id,previous,version,actor,self.clock()))
    def promote(self,tenant,alias,bundle_id,expected_alias_version,actor,allowed_promoters,threshold=0.90):
        if actor not in set(allowed_promoters):
            raise PromotionDenied("authorized release-manager role required")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            bundle=self.db.execute("SELECT * FROM release_bundles WHERE tenant_id=? AND bundle_id=?",(tenant,bundle_id)).fetchone()
            if not bundle:raise KeyError("bundle not found")
            if bundle["quality_score"]<threshold:raise PromotionDenied("quality threshold not met")
            approval=self.db.execute("SELECT * FROM release_approvals WHERE tenant_id=? AND bundle_id=?",(tenant,bundle_id)).fetchone()
            if not approval or approval["manifest_hash"]!=bundle["manifest_hash"]:raise PromotionDenied("bundle approval missing or stale")
            current=self.db.execute("SELECT * FROM release_aliases WHERE tenant_id=? AND alias=?",(tenant,alias)).fetchone()
            actual=current["alias_version"] if current else 0
            if actual!=expected_alias_version:raise RegistryConflict("alias version conflict")
            version=actual+1;previous=current["bundle_id"] if current else None
            if current:
                self.db.execute("UPDATE release_aliases SET bundle_id=?,alias_version=?,previous_bundle_id=?,updated_at=? WHERE tenant_id=? AND alias=? AND alias_version=?",
                    (bundle_id,version,previous,self.clock(),tenant,alias,actual))
            else:
                self.db.execute("INSERT INTO release_aliases VALUES(?,?,?,?,?,?)",(tenant,alias,bundle_id,version,previous,self.clock()))
            self._alias_history(tenant,alias,"promote",bundle_id,previous,version,actor)
            self.db.execute("INSERT INTO registry_audit(tenant_id,event_type,entity_id,payload_json,created_at) VALUES(?,?,?,?,?)",(tenant,"alias_promoted",alias,json.dumps({"bundle_id":bundle_id,"version":version,"actor":actor}),self.clock()))
            self.db.execute("COMMIT");return {"alias":alias,"bundle_id":bundle_id,"version":version,"previous_bundle_id":previous}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def rollback(self,tenant,alias,expected_alias_version,actor,allowed_promoters):
        if actor not in set(allowed_promoters):
            raise PromotionDenied("authorized release-manager role required")
        self.db.execute("BEGIN IMMEDIATE")
        try:
            current=self.db.execute("SELECT * FROM release_aliases WHERE tenant_id=? AND alias=?",(tenant,alias)).fetchone()
            if not current or current["alias_version"]!=expected_alias_version:raise RegistryConflict("alias version conflict")
            target=current["previous_bundle_id"]
            if not target:raise PromotionDenied("no previous bundle to roll back to")
            bundle=self.db.execute("SELECT * FROM release_bundles WHERE tenant_id=? AND bundle_id=?",(tenant,target)).fetchone()
            approval=self.db.execute("SELECT * FROM release_approvals WHERE tenant_id=? AND bundle_id=?",(tenant,target)).fetchone()
            if not bundle or not approval or approval["manifest_hash"]!=bundle["manifest_hash"]:raise PromotionDenied("previous bundle is not approved")
            version=expected_alias_version+1;previous=current["bundle_id"]
            self.db.execute("UPDATE release_aliases SET bundle_id=?,alias_version=?,previous_bundle_id=?,updated_at=? WHERE tenant_id=? AND alias=? AND alias_version=?",
                (target,version,previous,self.clock(),tenant,alias,expected_alias_version))
            self._alias_history(tenant,alias,"rollback",target,previous,version,actor)
            self.db.execute("INSERT INTO registry_audit(tenant_id,event_type,entity_id,payload_json,created_at) VALUES(?,?,?,?,?)",(tenant,"alias_rolled_back",alias,json.dumps({"bundle_id":target,"version":version,"actor":actor}),self.clock()))
            self.db.execute("COMMIT");return {"alias":alias,"bundle_id":target,"version":version}
        except Exception:
            self.db.execute("ROLLBACK");raise
    def resolve_alias(self,tenant,alias):
        row=self.db.execute("SELECT bundle_id,alias_version FROM release_aliases WHERE tenant_id=? AND alias=?",(tenant,alias)).fetchone()
        if not row:return None
        bundle=self.db.execute("SELECT * FROM release_bundles WHERE tenant_id=? AND bundle_id=?",(tenant,row["bundle_id"])).fetchone()
        return {"bundle_id":row["bundle_id"],"alias_version":row["alias_version"],"manifest":json.loads(bundle["manifest_json"]),"manifest_hash":bundle["manifest_hash"]}
    def alias_history(self,tenant,alias):
        rows=self.db.execute("SELECT sequence,action,bundle_id,previous_bundle_id,alias_version,actor FROM alias_history WHERE tenant_id=? AND alias=? ORDER BY sequence",(tenant,alias))
        return [dict(row) for row in rows]
