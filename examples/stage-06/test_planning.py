import unittest
from planning import FIXTURE,execute_plan,priority_score,validate_and_order
class PlanningTests(unittest.TestCase):
 def test_happy_path(self):
  result=execute_plan(FIXTURE['tasks']); self.assertEqual(result['status'],'completed')
  pos={row['task']:i for i,row in enumerate(result['trace'])}
  for task in FIXTURE['tasks']:
   for dep in task['dependsOn']: self.assertLess(pos[dep],pos[task['id']])
 def test_stockout_blocks_descendants(self):
  r=execute_plan(FIXTURE['tasks'],fail_task='reserve_inventory'); self.assertEqual(r['task_status']['book_shipment'],'blocked'); self.assertEqual(r['task_status']['notify_customer'],'blocked'); self.assertEqual(r['task_status']['authorize_payment'],'succeeded')
 def test_cycle(self):
  with self.assertRaisesRegex(ValueError,'cycle'): validate_and_order([{'id':'a','dependsOn':['b']},{'id':'b','dependsOn':['a']}])
 def test_unknown_dependency(self):
  with self.assertRaisesRegex(ValueError,'unknown'): validate_and_order([{'id':'a','dependsOn':['missing']}])
 def test_duplicate_id(self):
  with self.assertRaisesRegex(ValueError,'duplicate'): validate_and_order([{'id':'a','dependsOn':[]},{'id':'a','dependsOn':[]}])
 def test_priority(self): self.assertEqual(priority_score({'value':9,'urgency':3,'effort':3}),9)
 def test_budget(self): self.assertEqual(execute_plan(FIXTURE['tasks'],max_tasks=1)['status'],'incomplete')
if __name__=='__main__': unittest.main()
