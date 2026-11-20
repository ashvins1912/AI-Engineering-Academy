# Stage 03 — Individual lesson lab pack: Deep Learning

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## perceptron — Show a single linear classifier cannot solve XOR; add a hidden nonlinear layer.

**Implementation task:** XOR inputs (0,0),(0,1),(1,0),(1,1), labels 0,1,1,0.

**Worked fixture:** A linear boundary cannot separate XOR; a small MLP can.

**Expected result:** Test all four points and inspect activation outputs.

**Verification tests:** Why do stacked linear layers collapse to one linear transform?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## forward — Trace a two-layer forward pass and assert every intermediate tensor shape.

**Implementation task:** X shape (2,3), W1 (3,4), b1 (4), W2 (4,2).

**Worked fixture:** Hidden shape (2,4), logits shape (2,2).

**Expected result:** Test batch=1, wrong feature width and dtype mismatch.

**Verification tests:** Why should batch and feature axes be explicit?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## backprop — Backpropagate through a single linear layer and compare autograd.

**Implementation task:** X=[[1],[2]], y=[2,4], w=1; MSE over batch.

**Worked fixture:** Predictions [1,2], MSE=2.5, dL/dw=−5.

**Expected result:** Compare analytic, finite difference and PyTorch gradients within tolerance.

**Verification tests:** Where does the batch averaging factor enter the gradient?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## optimizers — Compare SGD and Adam on the same small regression task.

**Implementation task:** Same initialization, fixed seed, 100 updates, η=0.05.

**Worked fixture:** Both should reduce loss; log update/loss curves, not assume identical convergence.

**Expected result:** Test excessive η, dropout train/eval mode and reproducibility.

**Verification tests:** How does Adam's moment estimate differ from momentum SGD?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## cnn — Calculate convolution output dimensions and perform one 2×2 valid convolution.

**Implementation task:** Input 3×3 [[1,2,3],[4,5,6],[7,8,9]], kernel all ones.

**Worked fixture:** Output 2×2 [[12,16],[24,28]].

**Expected result:** Test stride 2, padding and channels-first vs channels-last.

**Verification tests:** How do stride and padding change receptive field/output size?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## sequence — Run a recurrent hidden-state update over a three-token sequence.

**Implementation task:** Scalar h_t=tanh(x_t+0.5h_(t−1)); x=[1,0,−1], h0=0.

**Worked fixture:** h1≈0.762, h2≈0.364, h3≈−0.558.

**Expected result:** Test order reversal, padding mask and state reset between samples.

**Verification tests:** Why can long unrolled sequences cause vanishing gradients?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## training — Implement checkpoint/resume and compare with uninterrupted training.

**Implementation task:** Fixed seed, deterministic toy dataset, checkpoint at step 50 of 100.

**Worked fixture:** Resumed run reaches the same final state within deterministic tolerance.

**Expected result:** Test missing checkpoint, changed config and interrupted data loader.

**Verification tests:** Which states must be saved to resume optimizer training correctly?

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
