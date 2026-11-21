import pathlib,unittest
ROOT=pathlib.Path(__file__).parent
class CICDTemplateTests(unittest.TestCase):
 def test_ci_template_is_read_only_and_builds_without_push(self):
  text=(ROOT/"ci-cd/ci.yml").read_text()
  self.assertIn("contents: read",text)
  self.assertIn("push: false",text)
  self.assertIn("trivy-action",text)
  self.assertIn("sbom-action",text)
  self.assertIn("docker inspect",text)
 def test_release_template_requires_explicit_opt_in(self):
  text=(ROOT/"ci-cd/release-promotion.yml").read_text()
  self.assertIn("default: false",text)
  self.assertIn("if: inputs.promote == true",text)
  self.assertIn("environment:",text)
  self.assertIn("sha256:",text)
 def test_release_policy_blocks_bad_evidence_and_canary(self):
  from release_pipeline import ReleasePipeline,Candidate,ReleaseDenied
  p=ReleasePipeline()
  c=Candidate("bad","a"*40,"sha256:"+"1"*64,"sha256:"+"2"*64,False,True,True,0,0,.95,300,.2)
  p.register(c)
  with self.assertRaises(ReleaseDenied):p.promote("bad","dev","bot","engineer","bad")
if __name__=="__main__":unittest.main()
