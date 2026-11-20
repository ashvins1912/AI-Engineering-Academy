# Stage 01 — Individual lesson lab pack: Mathematics, Python & Data Foundations

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## vectors — Vectors, matrices and tensor shapes

**Implementation task:** Vectors, matrices and tensor shapes

**Worked fixture:** Implement dot product and 2×2 matrix multiplication, then compare with NumPy.

**Expected result:** A=[[1,2],[3,4]], x=[2,1].

**Verification tests:** A·x=[4,10]; A·A=[[7,10],[15,22]].

**Debugging checklist:** Why does (m×n)(n×b) produce (m×b)? What does broadcasting align?

**Interview checks:** Assert output shapes and reject incompatible dimensions.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## probability — Probability and statistics

**Implementation task:** Probability and statistics

**Worked fixture:** Estimate a conditional probability from a reproducible simulation and compare with Bayes' rule.

**Expected result:** P(A)=0.2, P(B|A)=0.8, P(B|not A)=0.1.

**Verification tests:** P(A|B)=0.16/(0.16+0.08)=2/3≈0.667.

**Debugging checklist:** Explain base-rate effects and sampling error.

**Interview checks:** Run seeds 7 and 21; check estimates converge as trials grow.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## calculus — Derivatives and gradients

**Implementation task:** Derivatives and gradients

**Worked fixture:** Compare analytic, forward-difference and central-difference gradients.

**Expected result:** f(w)=(w−3)^2 at w=1; ε=1e−5.

**Verification tests:** f'(1)=−4; central difference should be approximately −4.

**Debugging checklist:** Why is central difference usually more accurate than forward difference?

**Interview checks:** Test several ε values and detect a deliberately reversed sign.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## optimization — Optimization foundations

**Implementation task:** Optimization foundations

**Worked fixture:** Train a one-weight linear model with gradient descent and log each update.

**Expected result:** x=[1,2,3], y=[2,4,6], w0=0, η=0.1; use MSE.

**Verification tests:** Loss decreases and w approaches 2; η=10 should diverge/oscillate.

**Debugging checklist:** How do learning rate and feature scaling affect convergence?

**Interview checks:** Assert finite loss, stopping at tolerance or max steps, and compare η values.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## python-core — Python for data work

**Implementation task:** Python for data work

**Worked fixture:** Write a CSV ingestion CLI that validates schema and reports invalid rows without crashing.

**Expected result:** Rows: valid id/value; missing id; value='oops'; duplicate id.

**Verification tests:** Two invalid rows plus one duplicate are reported with row numbers; valid rows remain.

**Debugging checklist:** Why separate pure validation from filesystem I/O?

**Interview checks:** Test missing file, empty file, malformed CSV and Unicode.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## numpy-pandas — NumPy and Pandas

**Implementation task:** NumPy and Pandas

**Worked fixture:** Replace a row loop with vectorized filtering and grouped aggregation.

**Expected result:** DataFrame: team=[A,A,B], score=[10,20,5], active=[1,0,1].

**Verification tests:** Active rows grouped by team: A=10, B=5.

**Debugging checklist:** When can Pandas index alignment silently change results?

**Interview checks:** Test null score, duplicate index and join key duplication.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## data-quality — Data quality and leakage

**Implementation task:** Data quality and leakage

**Worked fixture:** Demonstrate leakage by fitting a scaler before splitting, then fix the pipeline.

**Expected result:** Train values [0,2,4], validation value [1000]; fit scaler globally vs train-only.

**Verification tests:** Train-only scaler uses mean 2; global scaler mean 251.5.

**Debugging checklist:** Describe target leakage vs temporal leakage.

**Interview checks:** Assert validation data never enters fit; test future timestamp and duplicate entity split.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
