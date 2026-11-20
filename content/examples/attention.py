"""Small, dependency-free scaled dot-product attention example."""
import json
import math
from pathlib import Path

fixture = json.loads(Path("content/examples/fixtures/attention-small.json").read_text())
query = fixture["query"]
keys = fixture["keys"]
values = fixture["values"]

scores = [sum(q * k for q, k in zip(query, key)) / math.sqrt(len(query)) for key in keys]
maximum = max(scores)
exponentials = [math.exp(score - maximum) for score in scores]
total = sum(exponentials)
weights = [value / total for value in exponentials]
output = [sum(weights[i] * values[i][column] for i in range(len(values))) for column in range(len(values[0]))]

print(json.dumps({"scores": scores, "weights": weights, "output": output}, indent=2))
