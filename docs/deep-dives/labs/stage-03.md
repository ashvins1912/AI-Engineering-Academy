# Stage 03 — Individual lesson lab pack: Deep Learning

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## perceptron — Perceptrons and multilayer networks

**Implementation task:** Show a single linear classifier cannot solve XOR; add a hidden nonlinear layer.

**Worked fixture:** XOR inputs (0,0),(0,1),(1,0),(1,1), labels 0,1,1,0.

**Expected result:** A linear boundary cannot separate XOR; a small MLP can.

**Verification tests:** Test all four points and inspect activation outputs.

**Debugging checklist:** Why do stacked linear layers collapse to one linear transform?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## forward — Forward propagation

**Implementation task:** Trace a two-layer forward pass and assert every intermediate tensor shape.

**Worked fixture:** X shape (2,3), W1 (3,4), b1 (4), W2 (4,2).

**Expected result:** Hidden shape (2,4), logits shape (2,2).

**Verification tests:** Test batch=1, wrong feature width and dtype mismatch.

**Debugging checklist:** Why should batch and feature axes be explicit?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## backprop — Loss and backpropagation

**Implementation task:** Backpropagate through a single linear layer and compare autograd.

**Worked fixture:** X=[[1],[2]], y=[2,4], w=1; MSE over batch.

**Expected result:** Predictions [1,2], MSE=2.5, dL/dw=−5.

**Verification tests:** Compare analytic, finite difference and PyTorch gradients within tolerance.

**Debugging checklist:** Where does the batch averaging factor enter the gradient?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## optimizers — Optimizers and regularization

**Implementation task:** Compare SGD and Adam on the same small regression task.

**Worked fixture:** Same initialization, fixed seed, 100 updates, η=0.05.

**Expected result:** Both should reduce loss; log update/loss curves, not assume identical convergence.

**Verification tests:** Test excessive η, dropout train/eval mode and reproducibility.

**Debugging checklist:** How does Adam's moment estimate differ from momentum SGD?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## cnn — Convolutional neural networks

**Implementation task:** Calculate convolution output dimensions and perform one 2×2 valid convolution.

**Worked fixture:** Input 3×3 [[1,2,3],[4,5,6],[7,8,9]], kernel all ones.

**Expected result:** Output 2×2 [[12,16],[24,28]].

**Verification tests:** Test stride 2, padding and channels-first vs channels-last.

**Debugging checklist:** How do stride and padding change receptive field/output size?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## sequence — RNNs, LSTMs and sequence models

**Implementation task:** Run a recurrent hidden-state update over a three-token sequence.

**Worked fixture:** Scalar h_t=tanh(x_t+0.5h_(t−1)); x=[1,0,−1], h0=0.

**Expected result:** h1≈0.762, h2≈0.364, h3≈−0.558.

**Verification tests:** Test order reversal, padding mask and state reset between samples.

**Debugging checklist:** Why can long unrolled sequences cause vanishing gradients?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## training — Training at scale

**Implementation task:** Implement checkpoint/resume and compare with uninterrupted training.

**Worked fixture:** Fixed seed, deterministic toy dataset, checkpoint at step 50 of 100.

**Expected result:** Resumed run reaches the same final state within deterministic tolerance.

**Verification tests:** Test missing checkpoint, changed config and interrupted data loader.

**Debugging checklist:** Which states must be saved to resume optimizer training correctly?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
