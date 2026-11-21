import unittest
from data_feature_pipeline import *
class PipelineTests(unittest.TestCase):
 def setUp(self):
  self.contract=[Field("id","integer",minimum=1),Field("age","integer",minimum=0,maximum=120),Field("score","number",minimum=0,maximum=1),Field("segment","string",allowed=("A","B"))]
  self.rows=[{"id":1,"age":20,"score":.4,"segment":"A"},{"id":2,"age":35,"score":.7,"segment":"B"},{"id":3,"age":50,"score":.9,"segment":"A"},{"id":4,"age":40,"score":.5,"segment":"B"}]
 def test_contract_accepts_valid_data(self): self.assertTrue(validate_rows(self.rows,self.contract,"id").passed)
 def test_contract_rejects_missing_type_range_and_unknown(self):
  bad=[{**self.rows[0],"age":"old","score":2,"extra":1}]
  report=validate_rows(bad,self.contract)
  self.assertFalse(report.passed);self.assertGreaterEqual(len(report.errors),3)
 def test_duplicate_key_rejected(self): self.assertTrue(any("duplicate" in e for e in validate_rows(self.rows+[self.rows[0]],self.contract,"id").errors))
 def test_deterministic_split(self):
  a=deterministic_split(self.rows,7);b=deterministic_split(self.rows,7);self.assertEqual(a,b)
  self.assertFalse(set(x["id"] for x in a[0]) & set(x["id"] for x in a[1]))
 def test_invalid_fraction_rejected(self):
  with self.assertRaises(ValueError):deterministic_split(self.rows,1,1)
 def test_transform_fit_uses_training_only(self):
  train=self.rows[:3];spec=fit_numeric_feature(train,"age")
  self.assertEqual(spec["fit_rows"],3)
  transformed=transform_numeric(self.rows[3:],spec)
  self.assertAlmostEqual(transformed[0]["age_z"],(40-spec["mean"])/spec["std"])
 def test_empty_fit_fails(self):
  with self.assertRaises(DataContractError):fit_numeric_feature([{"x":None}],"x")
 def test_drift_zero_for_same_distribution_and_positive_after_shift(self):
  ref=[0,1,2,3,4,5,6,7,8,9]
  self.assertAlmostEqual(population_stability_index(ref,ref),0)
  self.assertGreater(population_stability_index(ref,[30,31,32,33,34,35,36,37,38,39]),0)
 def test_drift_values_below_reference_minimum_use_first_bin(self):\n  score=population_stability_index([10,11,12,13,14,15,16,17,18,19],[-10,-9,-8,-7,-6,-5,-4,-3,-2,-1])\n  self.assertGreater(score,0)\n def test_manifest_changes_with_code_and_source(self):
  m=build_manifest(self.rows,self.contract,{"field":"age"},"v1","abc",17)
  n=build_manifest(self.rows,self.contract,{"field":"age"},"v2","abc",17)
  self.assertNotEqual(m["manifest_hash"],n["manifest_hash"])
 def test_boolean_is_not_integer(self):
  bad=[{**self.rows[0],"id":True}]
  self.assertFalse(validate_rows(bad,self.contract).passed)
if __name__=="__main__":unittest.main()
