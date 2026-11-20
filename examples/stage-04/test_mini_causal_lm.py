import unittest
from mini_causal_lm import run_trace
class MiniCausalLMProjectTests(unittest.TestCase):
    def test_end_to_end_token_and_shape_trace(self):
        result=run_trace()
        self.assertEqual(result["tokens"],["hello","world","!"])
        self.assertEqual(result["token_ids"],[1,2,3])
        self.assertEqual(result["shapes"]["embeddings"],[1,3,4])
        self.assertEqual(result["shapes"]["logits"],[4])
    def test_causal_mask_blocks_future_positions(self):
        result=run_trace()
        self.assertEqual(result["causal_mask"][0],[True,False,False])
        self.assertEqual(result["causal_mask"][1],[True,True,False])
    def test_attention_weights_are_normalized(self):
        result=run_trace()
        self.assertAlmostEqual(sum(result["attention_weights"]),1)
    def test_decoded_token_is_in_vocabulary(self):
        result=run_trace()
        self.assertIn(result["decoded_token"],["<bos>","hello","world","!"])
    def test_parameter_and_kv_cache_estimates(self):
        result=run_trace()
        self.assertEqual(result["lora_rank8_params"],65536)
        self.assertEqual(result["kv_cache_bytes"],96)
    def test_custom_text_is_tokenized(self):
        result=run_trace("hello world")
        self.assertEqual(result["token_ids"],[1,2])
    def test_rope_and_multihead_trace_are_included(self):
        result=run_trace()
        self.assertEqual(len(result["rope_embeddings"]),3)
        self.assertEqual(len(result["multihead_output"]),3)
        self.assertEqual(len(result["multihead_output"][0]),4)
    def test_transformer_block_trace_includes_ffn_shapes(self):
        result=run_trace()
        self.assertEqual(result["full_transformer_block"]["shapes"]["output"],[3,4])
        self.assertEqual(len(result["full_transformer_block"]["ffn_hidden"]),3)
    def test_generation_trace_has_budget_and_stop_reason(self):
        result=run_trace()
        self.assertIn(result["generation"]["stop_reason"],{"stop_token","max_new_tokens"})
        self.assertLessEqual(len(result["generation"]["steps"]),4)
    def test_project_includes_bpe_and_memory_breakdown(self):
        result=run_trace()
        self.assertEqual(result["bpe_tokens"],["low"])
        self.assertGreater(result["inference_memory"]["estimated_total_bytes"],0)
if __name__=="__main__":unittest.main()
