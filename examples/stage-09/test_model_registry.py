import unittest
from model_registry import *

class ModelRegistryTests(unittest.TestCase):
 def setUp(self):
  self.registry=ArtifactRegistry()
  self.model_args=("tenant-a","support","v1",b"weights-v1","run-1","dataset-h1","commit-a","support-llm","tok-1","tools-1",{"input":"text"},{"output":"json"},"researcher")
  self.prompt_args=("tenant-a","support-prompt","p1","Use approved tools.",{"question":"string"},"support-llm","tok-1","tools-1","safety-v1","researcher")
  self.registry.register_model(*self.model_args)
  self.registry.register_prompt(*self.prompt_args)
 def bundle(self,bundle_id="release-1",score=0.95):
  return self.registry.build_bundle("tenant-a",bundle_id,("support","v1"),("support-prompt","p1"),"eval-h1",score)
 def test_model_and_prompt_versions_are_immutable(self):
  with self.assertRaises(VersionConflict):self.registry.register_model(*self.model_args[:3],b"changed",*self.model_args[4:])
  with self.assertRaises(VersionConflict):self.registry.register_prompt(*self.prompt_args[:3],"changed",*self.prompt_args[4:])
 def test_bundle_rejects_incompatible_prompt(self):
  self.registry.register_prompt("tenant-a","bad","p1","prompt",{},"other-model","tok-1","tools-1","safety-v1","researcher")
  with self.assertRaises(PromotionDenied):self.registry.build_bundle("tenant-a","bad-release",("support","v1"),("bad","p1"),"eval",0.95)
 def test_provenance_is_required(self):
  args=list(self.model_args);args[4]=""
  with self.assertRaises(RegistryError):self.registry.register_model(*args)
 def test_promotion_requires_quality_and_independent_approval(self):
  self.bundle(score=0.85)
  self.registry.approve("tenant-a","release-1","reviewer",{"reviewer"})
  with self.assertRaises(PromotionDenied):self.registry.promote("tenant-a","production","release-1",0)
  self.bundle(bundle_id="release-1-good",score=0.95)
  self.registry.approve("tenant-a","release-1-good","reviewer",{"reviewer"})
  self.assertEqual(self.registry.promote("tenant-a","production","release-1-good",0)["bundle_id"],"release-1-good")
 def test_creator_cannot_self_approve(self):
  self.bundle()
  with self.assertRaises(PromotionDenied):self.registry.approve("tenant-a","release-1","researcher",{"researcher","reviewer"})
 def test_alias_cas_and_rollback_preserve_history(self):
  self.bundle("release-1");self.registry.approve("tenant-a","release-1","reviewer",{"reviewer"})
  self.registry.promote("tenant-a","production","release-1",0)
  self.registry.register_model("tenant-a","support","v2",b"weights-v2","run-2","dataset-h2","commit-b","support-llm","tok-1","tools-1",{"input":"text"},{"output":"json"},"researcher")
  self.registry.register_prompt("tenant-a","support-prompt","p2","New prompt",{"question":"string"},"support-llm","tok-1","tools-1","safety-v1","researcher")
  self.registry.build_bundle("tenant-a","release-2",("support","v2"),("support-prompt","p2"),"eval-h2",0.96)
  self.registry.approve("tenant-a","release-2","reviewer",{"reviewer"})
  self.registry.promote("tenant-a","production","release-2",1)
  with self.assertRaises(VersionConflict):self.registry.rollback("tenant-a","production",1)
  rolled=self.registry.rollback("tenant-a","production",2)
  self.assertEqual(rolled["bundle_id"],"release-1")
  self.assertEqual([x["action"] for x in self.registry.alias_history],["promote","promote","rollback"])
 def test_tenant_isolation(self):
  self.bundle()
  self.assertIsNone(self.registry.resolve("tenant-b","production"))
if __name__=="__main__":unittest.main()
