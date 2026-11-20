# Stage 01 — Individual lesson lab pack: Mathematics, Python & Data Foundations

This workbook turns every Stage 1 lesson into a verifiable implementation. Run from the repository root using Python 3.11+. Core examples use the standard library; NumPy and Pandas comparisons are optional.

## vectors — Vectors, matrices and tensor shapes

**Implementation task:** Implement checked dot product and matrix multiplication, then compare with NumPy when available. Run `python examples/stage-01/foundations.py vectors`.

**Worked fixture:** A=[[1,2],[3,4]], x=[2,1]. Calculate each row dot product by hand.

**Expected result:** Ax=[[4],[10]] and A²=[[7,10],[15,22]]. The matrix product dimensions are (2×2)(2×1)=(2×1).

**Verification tests:** Test valid multiplication, incompatible inner dimensions, ragged matrices, empty matrices and vector length mismatch. Compare against NumPy if installed.

**Debugging checklist:** Print operand shapes before multiplication; inspect one row/column multiply-accumulate; check transpose and axis order; never silently truncate mismatched dimensions.

**Interview checks:** Why must inner dimensions match? What does each axis mean in (batch, sequence, features)? Explain broadcasting with one valid and one invalid example.

**Submission evidence:** Include source, CLI output, shape table, passing positive/negative tests and a 3–5 sentence explanation of one shape bug.

---

## probability — Probability and statistics

**Implementation task:** Implement Bayes' rule and a seeded conditional-probability simulation. Run `python examples/stage-01/foundations.py probability --trials 100000 --seed 7`.

**Worked fixture:** P(A)=0.2, P(B|A)=0.8, P(B|¬A)=0.1. Derive P(B) and P(A|B).

**Expected result:** P(B)=0.24 and P(A|B)=0.16/0.24=2/3≈0.667. Empirical results should approach the theoretical posterior as trials grow.

**Verification tests:** Check the exact posterior, reject probabilities outside [0,1], reject zero evidence probability, verify deterministic seed behaviour and test zero trials.

**Debugging checklist:** Label prior, likelihood and evidence separately; inspect denominators; distinguish P(A|B) from P(B|A); record trial count and random seed.

**Interview checks:** Explain base-rate effects, conditional probability, sampling error, variance and correlation versus causation.

**Submission evidence:** Include derivation, seeded simulation output, theoretical-versus-empirical comparison and an uncertainty note describing sample size.

---

## calculus — Derivatives and gradients

**Implementation task:** Implement analytic, forward-difference and central-difference derivatives. Run `python examples/stage-01/foundations.py calculus`.

**Worked fixture:** f(w)=(w−3)² at w=1; ε=1e−5.

**Expected result:** f'(1)=−4. Central difference should be approximately −4 within the stated tolerance.

**Verification tests:** Check several points, compare multiple epsilon values, reject epsilon≤0 and test a deliberately reversed subtraction sign.

**Debugging checklist:** Confirm the numerator order; compare with an analytic derivative; vary epsilon; check finite values; state when the derivative does not exist.

**Interview checks:** Why is central difference usually more accurate than forward difference? Explain partial derivatives and the chain rule.

**Submission evidence:** Include implementation, a derivative comparison table, tolerance rationale, negative test and a worked chain-rule example.

---

## optimization — Optimization foundations

**Implementation task:** Train a one-weight linear model using full-batch gradient descent and log loss/gradient at each step. Run `python examples/stage-01/foundations.py optimization --learning-rate 0.1`.

**Worked fixture:** x=[1,2,3], y=[2,4,6], w₀=0, η=0.1, MSE objective.

**Expected result:** Loss decreases and w approaches 2. The run must report a stop reason and finite loss. Excessive learning rates must not be reported as convergence.

**Verification tests:** Test stable learning rate, oversized learning rate, negative rate, mismatched data lengths, non-finite inputs and max-step termination.

**Debugging checklist:** Verify gradient sign and scaling; inspect feature scale; compare pre/post-update loss; track gradient norm; detect NaN/Inf and divergence.

**Interview checks:** Compare batch, stochastic and mini-batch gradient descent. Explain learning rate, convexity, conditioning and saddle points.

**Submission evidence:** Include update trace, learning-rate comparison, convergence plot or numerical trace, tests and a short explanation of the stop reason.

---

## python-core — Python for data work

**Implementation task:** Build a CSV ingestion CLI with required-column checks, numeric parsing, duplicate detection and row-level error reporting. Run `python examples/stage-01/foundations.py python-core --input examples/stage-01/fixtures/people.csv`.

**Worked fixture:** The fixture includes valid rows, a duplicate ID and a missing ID. Add a malformed numeric value as a separate test.

**Expected result:** Valid records are retained; invalid and duplicate rows are reported with line number, field and reason. The CLI exits non-zero when the file contains invalid records.

**Verification tests:** Test missing file, empty file, malformed CSV, missing headers, null fields, Unicode and duplicate identifiers.

**Debugging checklist:** Separate file I/O from pure validation; preserve source line numbers; do not swallow exceptions; avoid logging sensitive raw values.

**Interview checks:** Why use generators for large files? When should exceptions be raised versus returned as validation errors? Why pin dependencies?

**Submission evidence:** Include CLI command/output, valid and invalid fixtures, automated tests, and an explanation of how the pipeline handles malformed input.

---

## numpy-pandas — NumPy and Pandas

**Implementation task:** Implement vectorized boolean filtering and grouped aggregation, then compare with the standard-library reference. Run `python examples/stage-01/foundations.py numpy-pandas`.

**Worked fixture:** team=[A,A,B], score=[10,20,5], active=[1,0,1].

**Expected result:** Active group sums are A=10 and B=5. The optional NumPy/Pandas implementation must match the reference exactly.

**Verification tests:** Test null score, duplicate index, duplicate join keys, timezone-aware dates, dtype coercion and index alignment.

**Debugging checklist:** Inspect index labels and dtypes; assert row counts before/after joins; define null policy; compare vectorized output against a simple reference.

**Interview checks:** Why is vectorization faster? How can Pandas index alignment silently alter a result? What happens in a many-to-many join?

**Submission evidence:** Include reference and vectorized outputs, parity result, join-cardinality assertion, row counts and memory observation.

---

## data-quality — Data quality and leakage

**Implementation task:** Implement schema/range/uniqueness checks, entity-aware splitting and train-only preprocessing. Run `python examples/stage-01/foundations.py data-quality`.

**Worked fixture:** Train values [0,2,4], validation value [1000]. Compare train-only mean with global mean.

**Expected result:** Train-only mean=2; global mean=251.5 is a deliberately leaky alternative. Validation data must never participate in fit.

**Verification tests:** Assert no entity crosses splits, future timestamps are rejected, target-derived fields are blocked and preprocessing fit sees training rows only.

**Debugging checklist:** Track data lineage and timestamps; inspect entity overlap; audit every fit call; distinguish point-in-time features from future outcomes.

**Interview checks:** Explain target leakage versus temporal leakage. Why split before fitting a scaler? How do you version a dataset and data card?

**Submission evidence:** Include a data-quality report, split audit, red/green leakage tests, data-flow diagram and data card describing provenance, intended use and limitations.

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The integrated project contains at least 10 tests and a data card.
