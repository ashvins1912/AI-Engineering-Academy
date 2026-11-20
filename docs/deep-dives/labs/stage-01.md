# Stage 01 — Individual lesson lab pack: Mathematics, Python & Data Foundations

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## vectors — Vectors, matrices and tensor shapes

**Implementation task:** Implement dot product and 2×2 matrix multiplication, then compare with NumPy.

**Worked fixture:** A=[[1,2],[3,4]], x=[2,1].

**Expected result:** A·x=[4,10]; A·A=[[7,10],[15,22]].

**Verification tests:** Assert output shapes and reject incompatible dimensions.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why does (m×n)(n×b) produce (m×b)? What does broadcasting align?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## probability — Probability and statistics

**Implementation task:** Estimate a conditional probability from a reproducible simulation and compare with Bayes' rule.

**Worked fixture:** P(A)=0.2, P(B|A)=0.8, P(B|not A)=0.1.

**Expected result:** P(A|B)=0.16/(0.16+0.08)=2/3≈0.667.

**Verification tests:** Run seeds 7 and 21; check estimates converge as trials grow.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Explain base-rate effects and sampling error.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## calculus — Derivatives and gradients

**Implementation task:** Compare analytic, forward-difference and central-difference gradients.

**Worked fixture:** f(w)=(w−3)^2 at w=1; ε=1e−5.

**Expected result:** f'(1)=−4; central difference should be approximately −4.

**Verification tests:** Test several ε values and detect a deliberately reversed sign.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why is central difference usually more accurate than forward difference?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## optimization — Optimization foundations

**Implementation task:** Train a one-weight linear model with gradient descent and log each update.

**Worked fixture:** x=[1,2,3], y=[2,4,6], w0=0, η=0.1; use MSE.

**Expected result:** Loss decreases and w approaches 2; η=10 should diverge/oscillate.

**Verification tests:** Assert finite loss, stopping at tolerance or max steps, and compare η values.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** How do learning rate and feature scaling affect convergence?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## python-core — Python for data work

**Implementation task:** Write a CSV ingestion CLI that validates schema and reports invalid rows without crashing.

**Worked fixture:** Rows: valid id/value; missing id; value='oops'; duplicate id.

**Expected result:** Two invalid rows plus one duplicate are reported with row numbers; valid rows remain.

**Verification tests:** Test missing file, empty file, malformed CSV and Unicode.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Why separate pure validation from filesystem I/O?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## numpy-pandas — NumPy and Pandas

**Implementation task:** Replace a row loop with vectorized filtering and grouped aggregation.

**Worked fixture:** DataFrame: team=[A,A,B], score=[10,20,5], active=[1,0,1].

**Expected result:** Active rows grouped by team: A=10, B=5.

**Verification tests:** Test null score, duplicate index and join key duplication.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** When can Pandas index alignment silently change results?

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## data-quality — Data quality and leakage

**Implementation task:** Demonstrate leakage by fitting a scaler before splitting, then fix the pipeline.

**Worked fixture:** Train values [0,2,4], validation value [1000]; fit scaler globally vs train-only.

**Expected result:** Train-only scaler uses mean 2; global scaler mean 251.5.

**Verification tests:** Assert validation data never enters fit; test future timestamp and duplicate entity split.

**Debugging checklist:** Reduce the example to the smallest failing input; inspect intermediate shapes, values and assumptions; reproduce the failure with a test; change one variable at a time and retain a regression test.

**Interview checks:** Describe target leakage vs temporal leakage.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
