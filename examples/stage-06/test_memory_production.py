import unittest
from memory_production import MemoryRecord,MemoryService
class ProductionMemoryTests(unittest.TestCase):
 def setUp(self):
  self.now=1000;self.events=[];self.service=MemoryService(lambda:self.now,self.events.append)
  self.a=MemoryRecord('m1','acme','u1','semantic','Prefers email','src-1',900,2000,.95,1,.9,25)
  self.service.write(self.a,tenant_id='acme',allowed_kinds={'semantic','episodic','working'})
 def test_tenant_and_user_scope_before_retrieval(self):
  self.service.write(MemoryRecord('m2','other','u2','semantic','Secret','src-2',900,2000,.99,1,1,10),tenant_id='other',allowed_kinds={'semantic'})
  self.assertEqual([x['id'] for x in self.service.retrieve(tenant_id='acme',user_id='u1',query='email',token_budget=100)['items']],['m1'])
 def test_write_rejects_wrong_tenant_and_missing_consent(self):
  with self.assertRaises(PermissionError): self.service.write(MemoryRecord('x','other','u','semantic','x','s',1,2000),tenant_id='acme',allowed_kinds={'semantic'})
  with self.assertRaises(PermissionError): self.service.write(MemoryRecord('y','acme','u','semantic','x','s',1,2000,consented=False),tenant_id='acme',allowed_kinds={'semantic'})
 def test_expired_records_excluded_before_cleanup(self):
  self.now=2100;self.assertEqual(self.service.retrieve(tenant_id='acme',user_id='u1',query='email',token_budget=100)['items'],[])
 def test_expire_marks_records_and_audits(self):
  self.now=2100;self.assertEqual(self.service.expire(),['m1']);self.assertTrue(self.a.deleted);self.assertEqual(self.events[-1]['event'],'memory.expire')
 def test_delete_returns_derived_ids_for_tombstone_propagation(self):
  self.service.link_derived('m1','summary-1',tenant_id='acme');self.service.link_derived('m1','embedding-1',tenant_id='acme')
  derived=self.service.delete('m1',tenant_id='acme');self.assertEqual(set(derived),{'summary-1','embedding-1'});self.assertEqual(self.service.retrieve(tenant_id='acme',user_id='u1',query='email',token_budget=100)['items'],[])
 def test_delete_cannot_cross_tenant(self):
  with self.assertRaises(PermissionError):self.service.delete('m1',tenant_id='other')
 def test_supersede_keeps_latest_verified_fact_active(self):
  newer=MemoryRecord('m3','acme','u1','semantic','Prefers SMS','src-3',1100,2500,.99,1,1,20)
  self.service.supersede('m1',newer,tenant_id='acme')
  items=self.service.retrieve(tenant_id='acme',user_id='u1',query='contact',token_budget=100)['items'];self.assertEqual([x['id'] for x in items],['m3']);self.assertTrue(self.a.deleted)
if __name__=='__main__':unittest.main()
