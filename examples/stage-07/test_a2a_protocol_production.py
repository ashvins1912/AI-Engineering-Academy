import os,tempfile,unittest
from a2a_protocol import agent_card
from a2a_protocol_production import A2ATaskStore,validate_agent_card
class A2AProductionTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=os.path.join(self.tmp.name,"a2a.db");self.store=A2ATaskStore(self.path,clock=lambda:100)
 def tearDown(self):self.store.close();self.tmp.cleanup()
 def test_tenant_scoped_durable_task(self):
  self.store.create("t1","tenant-a","ctx-a",{"role":"user","parts":[]})
  with self.assertRaises(KeyError):self.store.get("t1","tenant-b")
  self.store.transition("t1","tenant-a","completed","done")
  self.store.close();self.store=A2ATaskStore(self.path,clock=lambda:101)
  self.assertEqual(self.store.get("t1","tenant-a")["status"],"completed")
 def test_terminal_state_is_immutable(self):
  self.store.create("t2","tenant-a","ctx-a",{"role":"user","parts":[]})
  self.store.transition("t2","tenant-a","completed")
  with self.assertRaises(ValueError):self.store.transition("t2","tenant-a","working")
 def test_agent_card_protocol_consistency(self):
  self.assertTrue(validate_agent_card(agent_card()))
  card=agent_card();card["supportedInterfaces"][0]["protocolVersion"]="0.2.0"
  with self.assertRaises(ValueError):validate_agent_card(card)
if __name__=="__main__":unittest.main()
