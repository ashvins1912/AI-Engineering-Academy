import json
import math
import unittest
from pathlib import Path


class AttentionFixtureTest(unittest.TestCase):
    def test_attention_weights_and_output_match_reference(self):
        fixture = json.loads(Path("content/examples/fixtures/attention-small.json").read_text())
        query, keys, values = fixture["query"], fixture["keys"], fixture["values"]
        scores = [sum(a * b for a, b in zip(query, key)) / math.sqrt(len(query)) for key in keys]
        exp = [math.exp(score - max(scores)) for score in scores]
        weights = [item / sum(exp) for item in exp]
        output = [sum(weights[i] * values[i][j] for i in range(len(values))) for j in range(len(values[0]))]
        for actual, expected in zip(weights, fixture["expectedWeights"]):
            self.assertAlmostEqual(actual, expected, places=8)
        for actual, expected in zip(output, fixture["expectedOutput"]):
            self.assertAlmostEqual(actual, expected, places=8)


if __name__ == "__main__":
    unittest.main()
