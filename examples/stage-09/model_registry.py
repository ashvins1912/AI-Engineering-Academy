"""In-memory immutable model/prompt registry with release bundles and alias rollback."""
import hashlib
import json

class RegistryError(Exception):pass
class PromotionDenied(RegistryError):pass
class VersionConflict(RegistryError):pass

def digest(value):
    raw=value.encode() if isinstance(value,str) else bytes(value)
    return hashlib.sha256(raw).hexdigest()

class ArtifactRegistry:
    def __init__(self):
        self.models={};self.prompts={};self.bundles={};self.aliases={};self.alias_history=[];self.approvals={}
    def register_model(self,tenant,name,version,artifact,source_run,dataset_hash,code_commit,model_family,tokenizer_version,tool_schema_version,input_schema,output_schema,creator):
        if not all((tenant,name,version,source_run,dataset_hash,code_commit,model_family,tokenizer_version,tool_schema_version,creator)):
            raise RegistryError("model provenance and compatibility metadata required")
        key=(tenant,name,version);record={"tenant":tenant,"name":name,"version":version,"digest":digest(artifact),
          "source_run":source_run,"dataset_hash":dataset_hash,"code_commit":code_commit,"model_family":model_family,
          "tokenizer_version":tokenizer_version,"tool_schema_version":tool_schema_version,
          "input_schema":input_schema,"output_schema":output_schema,"creator":creator}
        prior=self.models.get(key)
        if prior and prior!=record:raise VersionConflict("model version is immutable")
        self.models[key]=record;return record
    def register_prompt(self,tenant,name,version,template,variables,model_family,tokenizer_version,tool_schema_version,safety_policy,creator):
        if not all((tenant,name,version,model_family,tokenizer_version,tool_schema_version,safety_policy,creator)):
            raise RegistryError("prompt compatibility metadata required")
        key=(tenant,name,version);record={"tenant":tenant,"name":name,"version":version,"digest":digest(template),
          "template":template,"variables":variables,"model_family":model_family,"tokenizer_version":tokenizer_version,
          "tool_schema_version":tool_schema_version,"safety_policy":safety_policy,"creator":creator}
        prior=self.prompts.get(key)
        if prior and prior!=record:raise VersionConflict("prompt version is immutable")
        self.prompts[key]=record;return record
    def build_bundle(self,tenant,bundle_id,model_ref,prompt_ref,evaluation_hash,quality_score):
        model=self.models.get((tenant,*model_ref));prompt=self.prompts.get((tenant,*prompt_ref))
        if not model or not prompt:raise RegistryError("model or prompt version not found")
        compatibility=(model["model_family"]==prompt["model_family"] and
          model["tokenizer_version"]==prompt["tokenizer_version"] and
          model["tool_schema_version"]==prompt["tool_schema_version"])
        if not compatibility:raise PromotionDenied("model/prompt compatibility mismatch")
        manifest={"model":{"name":model["name"],"version":model["version"],"digest":model["digest"]},
          "prompt":{"name":prompt["name"],"version":prompt["version"],"digest":prompt["digest"]},
          "tokenizer":model["tokenizer_version"],"tool_schema":model["tool_schema_version"],
          "safety_policy":prompt["safety_policy"],"evaluation_hash":evaluation_hash}
        manifest_hash=digest(json.dumps(manifest,sort_keys=True,separators=(",",":")))
        record={"tenant":tenant,"bundle_id":bundle_id,"manifest":manifest,"manifest_hash":manifest_hash,
          "quality_score":quality_score,"creator":model["creator"],"approval":None}
        prior=self.bundles.get((tenant,bundle_id))
        if prior and prior!=record:raise VersionConflict("release bundle ID is immutable")
        self.bundles[(tenant,bundle_id)]=record;return record
    def approve(self,tenant,bundle_id,approver,allowed_approvers):
        bundle=self.bundles.get((tenant,bundle_id))
        if not bundle:raise KeyError("bundle not found")
        if approver not in set(allowed_approvers) or approver==bundle["creator"]:
            raise PromotionDenied("independent authorized approval required")
        approval={"approver":approver,"manifest_hash":bundle["manifest_hash"],"approved":True}
        bundle["approval"]=approval;return approval
    def promote(self,tenant,alias,bundle_id,expected_alias_version,threshold=0.90):
        bundle=self.bundles.get((tenant,bundle_id))
        if not bundle:raise KeyError("bundle not found")
        if bundle["quality_score"]<threshold:raise PromotionDenied("quality threshold not met")
        if not bundle["approval"] or bundle["approval"]["manifest_hash"]!=bundle["manifest_hash"]:
            raise PromotionDenied("bundle approval missing or stale")
        key=(tenant,alias);current=self.aliases.get(key,{"version":0,"bundle_id":None})
        if current["version"]!=expected_alias_version:raise VersionConflict("alias version conflict")
        updated={"version":current["version"]+1,"bundle_id":bundle_id,"previous_bundle_id":current["bundle_id"]}
        self.aliases[key]=updated
        self.alias_history.append({"tenant":tenant,"alias":alias,**updated,"action":"promote"})
        return updated
    def rollback(self,tenant,alias,expected_alias_version):
        key=(tenant,alias);current=self.aliases.get(key)
        if not current or current["version"]!=expected_alias_version:raise VersionConflict("alias version conflict")
        previous=current["previous_bundle_id"]
        if not previous:raise PromotionDenied("no previous release to roll back to")
        old=self.bundles.get((tenant,previous))
        if not old or not old["approval"]:raise PromotionDenied("previous bundle is not approved")
        updated={"version":current["version"]+1,"bundle_id":previous,"previous_bundle_id":current["bundle_id"]}
        self.aliases[key]=updated
        self.alias_history.append({"tenant":tenant,"alias":alias,**updated,"action":"rollback"})
        return updated
    def resolve(self,tenant,alias):
        current=self.aliases.get((tenant,alias))
        if not current:return None
        return self.bundles[(tenant,current["bundle_id"])]

def demo():
    registry=ArtifactRegistry()
    registry.register_model("tenant-a","support","v13",b"weights","run-13","data-v3","commit-8f3a","support-llm","tok-4","tools-4",{"input":"text"},{"output":"json"},"researcher")
    registry.register_prompt("tenant-a","support-prompt","p9","Answer using approved tools.",{"question":"string"},"support-llm","tok-4","tools-4","safety-v3","researcher")
    registry.build_bundle("tenant-a","release-13",("support","v13"),("support-prompt","p9"),"eval-hash",0.94)
    registry.approve("tenant-a","release-13","reviewer",{"reviewer","release-manager"})
    print(registry.promote("tenant-a","production","release-13",0))
if __name__=="__main__":demo()
