import unittest
from release_pipeline import Candidate,ReleasePipeline,ReleaseDenied,ReleaseConflict
def candidate(name="r1",**overrides):
 data=dict(release_id=name,commit_sha="a"*40,image_digest="sha256:"+"1"*64,sbom_digest="sha256:"+"b"*64,tests_passed=True,signature_verified=True,provenance_verified=True,critical_vulnerabilities=0,high_vulnerabilities=0,quality_score=.96,p95_latency_ms=350,cost_per_1k=.25)
 data.update(overrides);return Candidate(**data)
class ReleasePipelineTests(unittest.TestCase):
 def setUp(self):self.pipeline=ReleasePipeline();self.pipeline.register(candidate())
 def test_gated_promotion_requires_sequential_environments(self):
  with self.assertRaises(ReleaseDenied):self.pipeline.promote("r1","production","bot","production-approver","x")
  self.pipeline.promote("r1","dev","bot","engineer","d")
  self.pipeline.promote("r1","staging","manager","release-manager","s")
  self.pipeline.promote("r1","production","approver","production-approver","p")
  self.assertEqual(self.pipeline.aliases["production"],"r1")
 def test_failed_tests_and_security_block_promotion(self):
  self.pipeline.register(candidate("bad",tests_passed=False))
  with self.assertRaises(ReleaseDenied):self.pipeline.promote("bad","dev","bot","engineer","bad")
  self.pipeline.register(candidate("vuln",critical_vulnerabilities=1))
  with self.assertRaises(ReleaseDenied):self.pipeline.promote("vuln","dev","bot","engineer","v")
 def test_quality_latency_and_cost_gates(self):
  for c in [candidate("q",quality_score=.5),candidate("l",p95_latency_ms=900),candidate("c",cost_per_1k=2)]:
   self.pipeline.register(c)
   with self.assertRaises(ReleaseDenied):self.pipeline.promote(c.release_id,"dev","bot","engineer",c.release_id)
 def test_promotion_role_is_environment_specific(self):
  with self.assertRaises(ReleaseDenied):self.pipeline.promote("r1","production","dev","engineer","x")
 def test_idempotent_promotion(self):
  first=self.pipeline.promote("r1","dev","bot","engineer","same")
  second=self.pipeline.promote("r1","dev","bot","engineer","same")
  self.assertEqual(first,second);self.assertEqual(len(self.pipeline.events),1)
 def test_release_id_is_immutable(self):
  with self.assertRaises(ReleaseConflict):self.pipeline.register(candidate("r1",image_digest="sha256:"+"2"*64))
 def test_canary_rolls_back_to_previous_good_release(self):
  self.pipeline.register(candidate("r0"))
  self.pipeline.promote("r0","dev","bot","engineer","d0")
  self.pipeline.promote("r1","dev","bot","engineer","d1")
  result=self.pipeline.evaluate_canary("dev",error_rate=.08,p95_latency_ms=1200)
  self.assertEqual(result["decision"],"rollback");self.assertEqual(self.pipeline.aliases["dev"],"r0")
 def test_healthy_canary_continues(self):
  self.pipeline.promote("r1","dev","bot","engineer","d")
  self.assertEqual(self.pipeline.evaluate_canary("dev",.001,250)["decision"],"continue")
 def test_audit_hash_is_deterministic(self):
  self.pipeline.promote("r1","dev","bot","engineer","d")
  self.assertEqual(self.pipeline.audit_hash(),self.pipeline.audit_hash())
if __name__=="__main__":unittest.main()
