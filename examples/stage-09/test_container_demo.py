import pathlib,sys,unittest
ROOT=pathlib.Path(__file__).parent
sys.path.insert(0,str(ROOT/"container-demo"))
from app import load_model,predict

class ContainerDemoTests(unittest.TestCase):
 def test_demo_model_produces_stable_numeric_score(self):
  model=load_model(str(ROOT/"container-demo/model/model.json"))
  self.assertAlmostEqual(predict([1,2,3],model)["score"],.15)
  self.assertEqual(len(model["sha256"]),64)
 def test_invalid_feature_shape_and_types_fail(self):
  model=load_model(str(ROOT/"container-demo/model/model.json"))
  with self.assertRaises(ValueError):predict([1],model)
  with self.assertRaises(ValueError):predict([True,2,3],model)
 def test_dockerfile_is_multistage_nonroot_and_health_checked(self):
  docker=(ROOT/"container-demo/Dockerfile").read_text()
  self.assertIn("AS builder",docker);self.assertIn("AS runtime",docker)
  self.assertIn("USER 10001:10001",docker);self.assertIn("HEALTHCHECK",docker)
 def test_compose_applies_runtime_restrictions(self):
  compose=(ROOT/"container-demo/compose.yaml").read_text()
  for value in ("read_only: true","cap_drop:","no-new-privileges:true","mem_limit: 256m","pids_limit: 64"):
   self.assertIn(value,compose)
 def test_dockerignore_excludes_credentials_and_build_noise(self):
  ignored=(ROOT/"container-demo/.dockerignore").read_text()
  self.assertIn(".env",ignored);self.assertIn(".git",ignored);self.assertIn("__pycache__",ignored)
if __name__=="__main__":unittest.main()
