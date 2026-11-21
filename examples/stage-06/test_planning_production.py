import unittest
from planning_production import Task,execute_plan
class ProductionPlanningTests(unittest.TestCase):
 def setUp(self):
  self.tasks=[Task('validate',(),{}),Task('reserve',('validate',),{}),Task('ship',('reserve',),{})]; self.calls=[]
  self.handlers={task.id:self.handler(task.id) for task in self.tasks}
 def handler(self,name):
  def run(payload,key): self.calls.append((name,key)); return {'ok':True}
  return run
 def test_allowlisted_dependency_order_and_idempotency_key(self):
  r=execute_plan(self.tasks,self.handlers,run_id='order-7'); self.assertEqual(r['status'],'completed'); self.assertEqual([x[0] for x in self.calls],['validate','reserve','ship']); self.assertEqual(self.calls[1][1],'order-7:reserve')
 def test_missing_handler_fails_closed(self):
  r=execute_plan(self.tasks,{'validate':self.handlers['validate']}); self.assertEqual(r['task_status']['reserve'],'failed'); self.assertEqual(r['task_status']['ship'],'blocked')
 def test_handler_failure_blocks_descendants(self):
  def fail(payload,key): raise RuntimeError('stock unavailable')
  h=dict(self.handlers); h['reserve']=fail; r=execute_plan(self.tasks,h); self.assertEqual(r['task_status']['ship'],'blocked'); self.assertEqual(len(self.calls),1)
 def test_cycle_rejected_before_side_effects(self):
  with self.assertRaisesRegex(ValueError,'cycle'): execute_plan([Task('a',('b',),{}),Task('b',('a',),{})],self.handlers)
  self.assertEqual(self.calls,[])
 def test_unknown_dependency_rejected_before_side_effects(self):
  with self.assertRaisesRegex(ValueError,'unknown'): execute_plan([Task('a',('missing',),{})],self.handlers)
  self.assertEqual(self.calls,[])
 def test_budget(self): self.assertEqual(execute_plan(self.tasks,self.handlers,max_tasks=1)['status'],'incomplete')
if __name__=='__main__': unittest.main()
