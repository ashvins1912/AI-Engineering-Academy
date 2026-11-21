import json, sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'serving'))
from simulator import AdmissionController, Request, kv_cache_bytes_per_token, estimate_kv_cache_bytes, simulate

class ServingTests(unittest.TestCase):
    def test_cache_per_token_is_128_kib(self): self.assertEqual(kv_cache_bytes_per_token(32,8,128,2),131072)
    def test_eight_long_sequences_need_four_gib(self): self.assertEqual(estimate_kv_cache_bytes(131072,4096,0,8),4*1024**3)
    def test_invalid_dimensions_rejected(self):
        with self.assertRaises(ValueError): kv_cache_bytes_per_token(0,8,128,2)
    def test_invalid_token_inputs_rejected(self):
        with self.assertRaises(ValueError): estimate_kv_cache_bytes(128,0,4,1)
    def test_queue_cap_is_enforced(self):
        c=AdmissionController(1,1); self.assertEqual(c.admit(Request('a',10,5)),'accepted'); self.assertEqual(c.admit(Request('b',10,5)),'queued'); self.assertEqual(c.admit(Request('c',10,5)),'rejected')
    def test_finish_promotes_waiter(self):
        c=AdmissionController(1,1); c.admit(Request('a',10,5)); c.admit(Request('b',10,5)); self.assertTrue(c.finish('a')); self.assertIn('b',c.active)
    def test_cancel_promotes_waiter(self):
        c=AdmissionController(1,1); c.admit(Request('a',10,5)); c.admit(Request('b',10,5)); self.assertTrue(c.cancel('a')); self.assertIn('b',c.active)
    def test_unknown_cancel_is_safe(self): self.assertFalse(AdmissionController(1,0).cancel('missing'))
    def test_duplicate_id_rejected(self):
        c=AdmissionController(1,1); c.admit(Request('a',10,5))
        with self.assertRaises(ValueError): c.admit(Request('a',10,5))
    def test_memory_budget_rejects_long_prompt(self):
        s={'model':{'layers':32,'kv_heads':8,'head_dim':128,'bytes_per_element':2,'kv_cache_budget_mib':128},'scheduler':{'max_active':2,'max_queue':2,'synthetic_decode_tokens_per_second':20},'requests':[{'id':'long','prompt_tokens':4096,'output_tokens':128}]}
        self.assertEqual(simulate(s)['records'][0]['status'],'rejected_memory')
    def test_scenario_reports_synthetic_metrics(self):
        s=json.loads((Path(__file__).parent/'serving'/'benchmark.json').read_text()); self.assertIn('synthetic',simulate(s)['metrics_are'])
    def test_zero_decode_rate_rejected(self):
        s={'model':{'layers':1,'kv_heads':1,'head_dim':8,'bytes_per_element':2,'kv_cache_budget_mib':64},'scheduler':{'max_active':1,'max_queue':1,'synthetic_decode_tokens_per_second':0},'requests':[]}
        with self.assertRaises(ValueError): simulate(s)

if __name__ == '__main__': unittest.main()
