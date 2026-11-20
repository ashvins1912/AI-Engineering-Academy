# Stage 01 — Verified implementation and failure-lab workbook

This pack is an executable companion to [the Stage 01 theory guide](../01-mathematics-python-data.md). Run from the repository root with Python 3.11+. Core examples use the standard library; NumPy/Pandas comparisons activate when those optional packages are installed.

## Shared commands

```bash
python examples/stage-01/foundations.py vectors
python examples/stage-01/foundations.py probability --trials 100000 --seed 7
python examples/stage-01/foundations.py calculus
python examples/stage-01/foundations.py optimization --learning-rate 0.1
python examples/stage-01/foundations.py python-core --input examples/stage-01/fixtures/people.csv
python examples/stage-01/foundations.py numpy-pandas
python examples/stage-01/foundations.py data-quality
python -m unittest discover -s examples/stage-01 -p 'test_*.py' -v
```

## Topic 1 — vectors

**Reference implementation:** checked dot product and matrix multiplication; NumPy parity when available.

**Worked fixture:** A=[[1,2],[3,4]], x=[2,1]. Expected Ax=[4,10] and A²=[[7,10],[15,22]].

**Failure injection:** incompatible inner dimensions, ragged matrix and empty vector. Each must raise a descriptive ValueError rather than truncate or broadcast accidentally.

**Assessment evidence:** handwritten derivation, shape table, passing parity tests and a short explanation of batch/sequence/image axes.

## Topic 2 — probability

**Reference implementation:** seeded Bernoulli simulation, conditional-frequency estimate, Bayes posterior and population/sample statistics.

**Worked fixture:** P(A)=0.2, P(B|A)=0.8, P(B|¬A)=0.1. Expected P(A|B)=2/3.

**Failure injection:** reverse the conditional probability, use zero observations in the conditioning event, and compare a tiny sample with a large sample. The API must reject undefined conditional estimates.

**Assessment evidence:** prior/likelihood/evidence/posterior labels, seed/trial count, empirical-theoretical comparison and uncertainty note.

## Topic 3 — calculus

**Reference implementation:** analytic derivative, forward difference and central difference.

**Worked fixture:** f(w)=(w−3)² at w=1. Expected derivative −4.

**Failure injection:** reversed subtraction, unstable epsilon and non-finite input. Tolerances must be explicit; tests should not demand bitwise equality from floating-point arithmetic.

**Assessment evidence:** gradient table at three points, epsilon comparison and chain-rule explanation.

## Topic 4 — optimization

**Reference implementation:** full-batch gradient descent for one-feature linear regression, per-step loss and gradient norm, explicit stop reason.

**Worked fixture:** x=[1,2,3], y=[2,4,6], w₀=0, η=0.1. Loss should decrease and w approach 2.

**Failure injection:** η=10, negative learning rate, NaN input and iteration budget exhaustion. Divergence must be reported, not labelled convergence.

**Assessment evidence:** compare small/stable/large rates and explain conditioning and batch-size trade-offs.

## Topic 5 — Python data engineering

**Reference implementation:** CSV ingestion with schema checks, row-level errors, duplicate detection and valid-row retention.

**Fixture:** valid record, missing ID, non-numeric value and duplicate ID.

**Failure injection:** missing file, empty file, malformed CSV, Unicode and missing required header.

**Assessment evidence:** CLI output, exit code, tests and separation of pure validation from I/O.

## Topic 6 — NumPy/Pandas

**Reference implementation:** standard-library reference plus optional vectorized NumPy and Pandas implementation.

**Fixture:** team=[A,A,B], score=[10,20,5], active=[1,0,1]. Expected active group sums A=10, B=5.

**Failure injection:** duplicate join keys, null propagation, index alignment and timezone conversion.

**Assessment evidence:** parity result, join cardinality assertions, row counts and memory note.

## Topic 7 — data quality and leakage

**Reference implementation:** schema/range/uniqueness validation, entity-aware split and train-only fit/transform boundary.

**Fixture:** train [0,2,4], validation [1000]. Train mean must be 2; a global mean of 251.5 is the deliberate leakage case.

**Failure injection:** entity overlap, future timestamps, target-derived feature and global preprocessing fit. Each test must name the violated invariant.

**Assessment evidence:** data-quality report, split audit, data card and a red/green leakage test.

## Required submission checklist

- [ ] Seven commands run from a clean Python environment.
- [ ] All automated tests pass, including negative tests.
- [ ] Expected numerical values match within stated tolerances.
- [ ] Each math topic has an inspectable numerical trace or animation storyboard.
- [ ] CSV pipeline handles invalid rows without silently losing evidence.
- [ ] NumPy/Pandas parity is recorded when those optional packages are available.
- [ ] Integrated project contains at least 10 tests and a data card.
- [ ] Learner can explain one injected failure, its root cause and regression test.
