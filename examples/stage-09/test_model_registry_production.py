import os,tempfile,unittest
from model_registry_production import ModelPromptRegistry,RegistryConflict,PromotionDenied

class ModelPromptRegistryTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"registry.db")
  self.store=ModelPromptRegistry(self.path,clock=lambda:100.0)
  self.store.register_model("tenant-a","support","v1",b"weights-v1","s3://model/v1","run-1","data-h1","commit-a","support-llm","tok-1","tools-1",{"input":"text"},{"output":"json"},"researcher")
  self.store.register_prompt("tenant-a","support-prompt","p1","Use approved tools.",{"question":"string"},"support-llm","tok-1","tools-1","safety-v1","researcher")
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def bundle(self,bundle_id,model_version="v1",prompt_version="p1",quality=0.95):
  return self.store.build_bundle("tenant-a",bundle_id,("support",model_version),("support-prompt",prompt_version),"eval-h1",quality)
 def approve(self,bundle_id):
  return self.store.approve("tenant-a",bundle_id,"reviewer",{"reviewer","release-manager"})
 def test_model_and_prompt_versions_are_immutable(self):
  with self.assertRaises(RegistryConflict):self.store.register_model("tenant-a","support","v1",b"changed","s3://model/v1","run-1","data-h1","commit-a","support-llm","tok-1","tools-1",{"input":"text"},{"output":"json"},"researcher")
  with self.assertRaises(RegistryConflict):self.store.register_prompt("tenant-a","support-prompt","p1","changed",{"question":"string"},"support-llm","tok-1","tools-1","safety-v1","researcher")
 def test_incompatible_model_prompt_rejected(self):
  self.store.register_prompt("tenant-a","bad","p1","prompt",{},"other","tok-1","tools-1","safety-v1","researcher")
  with self.assertRaises(PromotionDenied):self.store.build_bundle("tenant-a","bad",("support","v1"),("bad","p1"),"eval",0.95)
 def test_quality_and_independent_approval_required(self):
  self.bundle("low",quality=0.5);self.approve("low")
  with self.assertRaises(PromotionDenied):self.store.promote("tenant-a","production","low",0,"release-manager",{"release-manager"})
  self.bundle("good");self.approve("good")
  self.assertEqual(self.store.promote("tenant-a","production","good",0,"release-manager",{"release-manager"})["bundle_id"],"good")
  with self.assertRaises(RegistryConflict):self.store.approve("tenant-a","good","researcher",{"researcher"})
 def test_alias_cas_and_full_bundle_rollback(self):
  self.bundle("release-1");self.approve("release-1");self.store.promote("tenant-a","production","release-1",0,"release-manager",{"release-manager"})
  self.store.register_model("tenant-a","support","v2",b"weights-v2","s3://model/v2","run-2","data-h2","commit-b","support-llm","tok-1","tools-1",{"input":"text"},{"output":"json"},"researcher")
  self.store.register_prompt("tenant-a","support-prompt","p2","New prompt",{"question":"string"},"support-llm","tok-1","tools-1","safety-v1","researcher")
  self.bundle("release-2","v2","p2");self.approve("release-2");self.store.promote("tenant-a","production","release-2",1,"release-manager",{"release-manager"})
  with self.assertRaises(RegistryConflict):self.store.rollback("tenant-a","production",1,"release-manager",{"release-manager"})
  self.assertEqual(self.store.rollback("tenant-a","production",2,"release-manager",{"release-manager"})["bundle_id"],"release-1")
  self.assertEqual([x["action"] for x in self.store.alias_history("tenant-a","production")],["promote","promote","rollback"])
 def test_tenant_isolation_and_reopen(self):
  self.bundle("release-1");self.approve("release-1");self.store.promote("tenant-a","production","release-1",0,"release-manager",{"release-manager"})
  self.assertIsNone(self.store.resolve_alias("tenant-b","production"))
  self.store.close();self.store=ModelPromptRegistry(self.path,clock=lambda:101.0)
  self.assertEqual(self.store.resolve_alias("tenant-a","production")["bundle_id"],"release-1")

 def test_unauthorized_promoter_is_rejected_for_promote_and_rollback(self):
  self.bundle("release-1");self.approve("release-1")
  with self.assertRaises(PromotionDenied):
   self.store.promote("tenant-a","production","release-1",0,"researcher",{"release-manager"})
  self.store.promote("tenant-a","production","release-1",0,"release-manager",{"release-manager"})
  with self.assertRaises(PromotionDenied):
   self.store.rollback("tenant-a","production",1,"researcher",{"release-manager"})
 def test_bundle_quality_range_and_evaluation_evidence_required(self):
  with self.assertRaises(ValueError):
   self.store.build_bundle("tenant-a","bad",("support","v1"),("support-prompt","p1"),"",0.95)
  with self.assertRaises(ValueError):
   self.store.build_bundle("tenant-a","bad",("support","v1"),("support-prompt","p1"),"eval-h",1.5)
 def test_release_manifest_binds_provenance_and_contract(self):
  bundle=self.bundle("release-1")
  row=self.store.db.execute("SELECT manifest_json FROM release_bundles WHERE tenant_id=? AND bundle_id=?",("tenant-a","release-1")).fetchone()
  import json
  manifest=json.loads(row["manifest_json"])
  self.assertEqual(manifest["model"]["source_run"],"run-1")
  self.assertEqual(manifest["model"]["dataset_hash"],"data-h1")
  self.assertEqual(manifest["model"]["code_commit"],"commit-a")
  self.assertEqual(manifest["prompt"]["variables"],{"question":"string"})
  self.assertEqual(manifest["evaluation_hash"],"eval-h1")
\nif __name__=="__main__":unittest.main()
