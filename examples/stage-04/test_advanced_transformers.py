import unittest

from advanced_transformers import (
    apply_rope, estimate_inference_memory, generate_autoregressive,
    multi_head_attention, tokenize_bpe, transformer_block,
)


class AdvancedTransformerTests(unittest.TestCase):
    def test_bpe_merges_ordered_pairs(self):
        self.assertEqual(tokenize_bpe("low", [("l", "o"), ("lo", "w")]), ["low"])
        self.assertEqual(tokenize_bpe("low", [("l", "o")], max_tokens=1), ["lo"])

    def test_bpe_handles_unicode_and_invalid_limit(self):
        self.assertEqual(tokenize_bpe("猫", []), ["猫"])
        with self.assertRaisesRegex(ValueError, "positive"):
            tokenize_bpe("abc", [], max_tokens=0)

    def test_rope_rotates_pairs_and_preserves_norm(self):
        vector = [1.0, 0.0, 0.0, 2.0]
        rotated = apply_rope(vector, position=1)
        self.assertAlmostEqual(rotated[0]**2 + rotated[1]**2, 1.0)
        self.assertAlmostEqual(rotated[2]**2 + rotated[3]**2, 4.0)
        self.assertNotEqual(rotated, vector)

    def test_rope_rejects_odd_width(self):
        with self.assertRaisesRegex(ValueError, "even-width"):
            apply_rope([1, 2, 3], 0)

    def test_multi_head_attention_shapes_and_normalized_weights(self):
        seq = [[1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 0, 0]]
        result = multi_head_attention(seq, seq, seq, heads=2, causal=True)
        self.assertEqual(len(result["output"]), 3)
        self.assertEqual(len(result["output"][0]), 4)
        for head in result["weights"]:
            for row in head:
                self.assertAlmostEqual(sum(row), 1.0)

    def test_multi_head_causal_mask_blocks_future(self):
        seq = [[1, 0, 0, 1], [0, 1, 1, 0], [1, 1, 0, 0]]
        result = multi_head_attention(seq, seq, seq, heads=2, causal=True)
        self.assertEqual(result["weights"][0][0][1:], [0.0, 0.0])
        self.assertEqual(result["weights"][1][1][2], 0.0)

    def test_multi_head_rejects_invalid_head_count(self):
        with self.assertRaisesRegex(ValueError, "divisible"):
            multi_head_attention([[1, 2, 3]], [[1, 2, 3]], [[1, 2, 3]], heads=2)

    def test_transformer_block_preserves_sequence_shape(self):
        seq = [[0.1, 0.2, 0.3, 0.4], [0.4, 0.3, 0.2, 0.1]]
        w1 = [[0.1, 0.2, 0.1, 0.2] for _ in range(6)]
        b1 = [0.0] * 6
        w2 = [[0.1] * 6 for _ in range(4)]
        b2 = [0.0] * 4
        result = transformer_block(seq, 2, w1, b1, w2, b2)
        self.assertEqual(result["shapes"]["input"], [2, 4])
        self.assertEqual(result["shapes"]["output"], [2, 4])
        self.assertEqual(len(result["ffn_hidden"][0]), 6)

    def test_transformer_block_rejects_projection_shape(self):
        with self.assertRaisesRegex(ValueError, "projection shape"):
            transformer_block([[1, 2]], 1, [[1]], [0], [[1, 2]], [0, 0])

    def test_autoregressive_generation_stops_and_tracks_cache_positions(self):
        transitions = {1: [3.0, 0.0, 1.0], 2: [3.0, 0.0, 1.0]}
        result = generate_autoregressive([1], transitions, 5, stop_id=0, top_k=1, seed=3)
        self.assertEqual(result["stop_reason"], "stop_token")
        self.assertEqual(result["token_ids"][-1], 0)
        self.assertEqual(len(result["kv_cache_positions"]), len(result["steps"]))

    def test_autoregressive_generation_enforces_budget(self):
        transitions = {1: [0.0, 1.0], 0: [0.0, 1.0]}
        result = generate_autoregressive([1], transitions, 2, stop_id=None)
        self.assertEqual(result["stop_reason"], "max_new_tokens")
        self.assertEqual(len(result["steps"]), 2)

    def test_autoregressive_rejects_missing_context(self):
        with self.assertRaisesRegex(ValueError, "no next-token"):
            generate_autoregressive([99], {1: [0, 1]}, 2)

    def test_memory_estimate_components(self):
        result = estimate_inference_memory(1000, 2, 2, 10, 2, 4, batch=1, hidden_width=8)
        self.assertEqual(result["weight_bytes"], 2000)
        self.assertEqual(result["kv_cache_bytes"], 640)
        self.assertGreater(result["estimated_total_bytes"], result["weight_bytes"])

    def test_memory_estimate_rejects_invalid_dimensions(self):
        with self.assertRaisesRegex(ValueError, "positive"):
            estimate_inference_memory(0, 2, 2, 10, 2, 4)


if __name__ == "__main__":
    unittest.main()
