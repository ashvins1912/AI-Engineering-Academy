import unittest

from content.examples.attention_production import scaled_dot_product_attention


class ProductionAttentionTests(unittest.TestCase):
    def test_matches_reference_fixture(self):
        weights, output = scaled_dot_product_attention(
            [1, 0], [[1, 0], [0, 1]], [[2, 0], [0, 4]]
        )
        self.assertAlmostEqual(weights[0], 0.6697615493, places=8)
        self.assertAlmostEqual(weights[1], 0.3302384507, places=8)
        self.assertAlmostEqual(output[0], 1.3395230986, places=8)
        self.assertAlmostEqual(output[1], 1.3209538028, places=8)

    def test_rejects_dimension_mismatch(self):
        with self.assertRaises(ValueError):
            scaled_dot_product_attention([1, 0], [[1]], [[2, 0]])

    def test_rejects_non_finite_values(self):
        with self.assertRaises(ValueError):
            scaled_dot_product_attention([float("nan")], [[1]], [[2]])

    def test_temperature_changes_distribution(self):
        sharp, _ = scaled_dot_product_attention(
            [1, 0], [[1, 0], [0, 1]], [[2], [4]], temperature=0.5
        )
        flat, _ = scaled_dot_product_attention(
            [1, 0], [[1, 0], [0, 1]], [[2], [4]], temperature=2
        )
        self.assertGreater(sharp[0], flat[0])


if __name__ == "__main__":
    unittest.main()
