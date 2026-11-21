import unittest
from memory import FIXTURE,memory_score,select_memories
class MemorySelectionTests(unittest.TestCase):
 def test_expected_authorized_records_fit_budget(self):
  result=select_memories(FIXTURE['records'],'acme',1000,120)
  self.assertEqual([x['id'] for x in result['items']],['A','C']);self.assertEqual(result['tokens_used'],60)
 def test_cross_tenant_and_expired_records_never_enter_context(self):
  result=select_memories(FIXTURE['records'],'acme',1000,500)
  ids=[x['id'] for x in result['items']];self.assertNotIn('X',ids);self.assertNotIn('E',ids)
 def test_budget_is_never_exceeded(self):
  result=select_memories(FIXTURE['records'],'acme',1000,55);self.assertLessEqual(result['tokens_used'],55)
 def test_source_provenance_is_preserved(self):
  result=select_memories(FIXTURE['records'],'acme',1000,120)
  self.assertTrue(all(item['source_id'] for item in result['items']))
 def test_deleted_records_are_excluded(self):
  records=[dict(FIXTURE['records'][0],deleted=True)]
  self.assertEqual(select_memories(records,'acme',1000,120)['items'],[])
 def test_score_is_deterministic(self):
  self.assertAlmostEqual(memory_score(FIXTURE['records'][0]),.925)
if __name__=='__main__':unittest.main()
