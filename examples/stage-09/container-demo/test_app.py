import json,os,tempfile,unittest
from app import load_model,predict
class ContainerInferenceTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.NamedTemporaryFile(mode="w",suffix=".json",delete=False)
  json.dump({"weights":[.4,-.2,.1],"bias":.05},self.tmp);self.tmp.close()
  self.model=load_model(self.tmp.name)
 def tearDown(self):os.unlink(self.tmp.name)
 def test_model_digest_and_numeric_prediction(self):
  result=predict([1,2,3],self.model)
  self.assertAlmostEqual(result["score"],.15)
  self.assertEqual(len(result["model_sha256"]),64)
 def test_rejects_wrong_feature_count(self):
  with self.assertRaises(ValueError):predict([1],self.model)
 def test_rejects_boolean_features(self):
  with self.assertRaises(ValueError):predict([True,2,3],self.model)
 def test_rejects_invalid_model_artifact(self):
  with tempfile.NamedTemporaryFile(mode="w",delete=False) as f:
   json.dump({"weights":"not-array","bias":0},f);path=f.name
  try:
   with self.assertRaises(ValueError):load_model(path)
  finally:os.unlink(path)
if __name__=="__main__":unittest.main()
