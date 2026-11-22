# Stage 12 Topic 4 — Evaluation at scale and continuous quality

Offline evaluation harness for versioned golden datasets, retrieval/answer/citation/abstention/tool/safety metrics, confidence intervals, deterministic judge calibration, human agreement, pairwise comparisons, slice analysis, drift monitoring and fail-closed release gates.

## Run

```bash
python examples/stage-12/evaluation_scale/evaluation_engine.py
python -m unittest discover -s examples/stage-12 -p 'test_*.py' -v
```

## Important boundaries

- The deterministic judge is a local baseline, not a substitute for expert human review or a calibrated production model judge.
- Bootstrap intervals require representative independent samples; repeated or correlated queries can overstate confidence.
- A high aggregate score cannot hide a critical safety failure or a broken tenant/language/difficulty slice.
- Dataset provenance and split isolation are part of the evaluation contract.
- The release gate fails closed when sample size, confidence, safety, latency, judge calibration or dataset provenance is missing.
