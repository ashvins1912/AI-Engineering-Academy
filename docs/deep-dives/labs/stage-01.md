# Stage 01 — Individual lesson lab pack: Mathematics, Python & Data Foundations

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## vectors — Implement dot product and 2×2 matrix multiplication, then compare with NumPy.

**Implementation task:** A=[[1,2],[3,4]], x=[2,1].

**Worked fixture:** A·x=[4,10]; A·A=[[7,10],[15,22]].

**Expected result:** Assert output shapes and reject incompatible dimensions.

**Verification tests:** Why does (m×n)(n×b) produce (m×b)? What does broadcasting align?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## probability — Estimate a conditional probability from a reproducible simulation and compare with Bayes' rule.

**Implementation task:** P(A)=0.2, P(B|A)=0.8, P(B|not A)=0.1.

**Worked fixture:** P(A|B)=0.16/(0.16+0.08)=2/3≈0.667.

**Expected result:** Run seeds 7 and 21; check estimates converge as trials grow.

**Verification tests:** Explain base-rate effects and sampling error.

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## calculus — Compare analytic, forward-difference and central-difference gradients.

**Implementation task:** f(w)=(w−3)^2 at w=1; ε=1e−5.

**Worked fixture:** f'(1)=−4; central difference should be approximately −4.

**Expected result:** Test several ε values and detect a deliberately reversed sign.

**Verification tests:** Why is central difference usually more accurate than forward difference?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## optimization — Train a one-weight linear model with gradient descent and log each update.

**Implementation task:** x=[1,2,3], y=[2,4,6], w0=0, η=0.1; use MSE.

**Worked fixture:** Loss decreases and w approaches 2; η=10 should diverge/oscillate.

**Expected result:** Assert finite loss, stopping at tolerance or max steps, and compare η values.

**Verification tests:** How do learning rate and feature scaling affect convergence?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## python-core — Write a CSV ingestion CLI that validates schema and reports invalid rows without crashing.

**Implementation task:** Rows: valid id/value; missing id; value='oops'; duplicate id.

**Worked fixture:** Two invalid rows plus one duplicate are reported with row numbers; valid rows remain.

**Expected result:** Test missing file, empty file, malformed CSV and Unicode.

**Verification tests:** Why separate pure validation from filesystem I/O?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## numpy-pandas — Replace a row loop with vectorized filtering and grouped aggregation.

**Implementation task:** DataFrame: team=[A,A,B], score=[10,20,5], active=[1,0,1].

**Worked fixture:** Active rows grouped by team: A=10, B=5.

**Expected result:** Test null score, duplicate index and join key duplication.

**Verification tests:** When can Pandas index alignment silently change results?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## data-quality — Demonstrate leakage by fitting a scaler before splitting, then fix the pipeline.

**Implementation task:** Train values [0,2,4], validation value [1000]; fit scaler globally vs train-only.

**Worked fixture:** Train-only scaler uses mean 2; global scaler mean 251.5.

**Expected result:** Assert validation data never enters fit; test future timestamp and duplicate entity split.

**Verification tests:** Describe target leakage vs temporal leakage.

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
