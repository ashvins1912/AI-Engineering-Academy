import math,unittest
from transformers import (causal_mask,decode_logits,embedding_lookup,kv_cache_bytes,layer_norm,lora_parameter_count,
                          merge_heads,perplexity,scaled_dot_product_attention,shifted_lm_examples,softmax,split_heads,
                          tokenize_greedy,transformer_block_residual)
class TransformerReferenceTests(unittest.TestCase):
    def test_greedy_subword_tokenization(self):
        self.assertEqual(tokenize_greedy("transformer",["trans","form","er"]),["trans","form","er"])
    def test_tokenization_unknown_piece_fails(self):
        with self.assertRaisesRegex(ValueError,"unknown subword"):tokenize_greedy("xyz",["x","y"])
    def test_tokenization_max_length(self):
        self.assertEqual(tokenize_greedy("hello world",["hello","world"],1),["hello"])
    def test_embedding_lookup_and_positions(self):
        result=embedding_lookup([1,0],[[0,0],[1,2]],[[.1,.2],[.3,.4]])
        self.assertEqual(result,[[1.1,2.2],[.3,.4]])
    def test_embedding_out_of_range(self):
        with self.assertRaisesRegex(ValueError,"outside vocabulary"):embedding_lookup([3],[[0,0]])
    def test_softmax_stable_and_normalized(self):
        values=softmax([1000,1001]);self.assertAlmostEqual(sum(values),1);self.assertGreater(values[1],values[0])
    def test_causal_mask_is_lower_triangular(self):
        self.assertEqual(causal_mask(3),[[True,False,False],[True,True,False],[True,True,True]])
    def test_attention_weights_and_output(self):
        result=scaled_dot_product_attention([1,0],[[1,0],[0,1]],[[2,0],[0,4]])
        self.assertAlmostEqual(sum(result["weights"]),1)
        self.assertAlmostEqual(result["output"][0],1.3395,places=3)
    def test_attention_causal_mask_zeroes_future(self):
        result=scaled_dot_product_attention([1,0],[[1,0],[0,1]],[[2,0],[0,4]],[True,False])
        self.assertEqual(result["weights"][1],0)
    def test_attention_rejects_all_masked(self):
        with self.assertRaisesRegex(ValueError,"block every key"):scaled_dot_product_attention([1],[[1]],[[1]],[False])
    def test_split_and_merge_heads(self):
        heads=split_heads([1,2,3,4,5,6,7,8],2)
        self.assertEqual(heads,[[1,2,3,4],[5,6,7,8]])
        self.assertEqual(merge_heads(heads),[1,2,3,4,5,6,7,8])
    def test_head_width_must_divide(self):
        with self.assertRaisesRegex(ValueError,"divisible"):split_heads([1,2,3],2)
    def test_layer_norm_centers_values(self):
        result=layer_norm([1,2,3])
        self.assertAlmostEqual(sum(result),0,places=7)
    def test_transformer_residual_shape(self):
        result=transformer_block_residual([1,2],[.1,.2],[.3,.4])
        self.assertEqual(len(result),2)
    def test_shifted_language_model_targets(self):
        self.assertEqual(shifted_lm_examples([10,11,12]),([10,11],[11,12]))
    def test_decode_is_deterministic_and_filtered(self):
        result=decode_logits([2,1,0],temperature=.8,top_k=2,top_p=.9,seed=7)
        self.assertIn(result["token_id"],result["candidates"]);self.assertEqual(result,decode_logits([2,1,0],.8,2,.9,7))
    def test_decode_rejects_invalid_sampling_config(self):
        with self.assertRaisesRegex(ValueError,"temperature"):decode_logits([1,2],0)
    def test_lora_and_kv_cache_estimates(self):
        self.assertEqual(lora_parameter_count(4096,4096,8),65536)
        self.assertEqual(kv_cache_bytes(2,10,4,8,2),2560)
    def test_perplexity(self):
        self.assertAlmostEqual(perplexity(0),1)
if __name__=="__main__":unittest.main()
