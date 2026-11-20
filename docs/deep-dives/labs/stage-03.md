# Stage 03 — Individual lesson lab pack: Deep Learning

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## perceptron — Perceptrons and multilayer networks

**Implementation task:** Perceptrons and multilayer networks

**Worked fixture:** Show a single linear classifier cannot solve XOR; add a hidden nonlinear layer.

**Expected result:** XOR inputs (0,0),(0,1),(1,0),(1,1), labels 0,1,1,0.

**Verification tests:** A linear boundary cannot separate XOR; a small MLP can.

**Debugging checklist:** Why do stacked linear layers collapse to one linear transform?

**Interview checks:** Test all four points and inspect activation outputs.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## forward — Forward propagation

**Implementation task:** Forward propagation

**Worked fixture:** Trace a two-layer forward pass and assert every intermediate tensor shape.

**Expected result:** X shape (2,3), W1 (3,4), b1 (4), W2 (4,2).

**Verification tests:** Hidden shape (2,4), logits shape (2,2).

**Debugging checklist:** Why should batch and feature axes be explicit?

**Interview checks:** Test batch=1, wrong feature width and dtype mismatch.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## backprop — Loss and backpropagation

**Implementation task:** Loss and backpropagation

**Worked fixture:** Backpropagate through a single linear layer and compare autograd.

**Expected result:** X=[[1],[2]], y=[2,4], w=1; MSE over batch.

**Verification tests:** Predictions [1,2], MSE=2.5, dL/dw=−5.

**Debugging checklist:** Where does the batch averaging factor enter the gradient?

**Interview checks:** Compare analytic, finite difference and PyTorch gradients within tolerance.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## optimizers — Optimizers and regularization

**Implementation task:** Optimizers and regularization

**Worked fixture:** Compare SGD and Adam on the same small regression task.

**Expected result:** Same initialization, fixed seed, 100 updates, η=0.05.

**Verification tests:** Both should reduce loss; log update/loss curves, not assume identical convergence.

**Debugging checklist:** How does Adam's moment estimate differ from momentum SGD?

**Interview checks:** Test excessive η, dropout train/eval mode and reproducibility.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## cnn — Convolutional neural networks

**Implementation task:** Convolutional neural networks

**Worked fixture:** Calculate convolution output dimensions and perform one 2×2 valid convolution.

**Expected result:** Input 3×3 [[1,2,3],[4,5,6],[7,8,9]], kernel all ones.

**Verification tests:** Output 2×2 [[12,16],[24,28]].

**Debugging checklist:** How do stride and padding change receptive field/output size?

**Interview checks:** Test stride 2, padding and channels-first vs channels-last.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## sequence — RNNs, LSTMs and sequence models

**Implementation task:** RNNs, LSTMs and sequence models

**Worked fixture:** Run a recurrent hidden-state update over a three-token sequence.

**Expected result:** Scalar h_t=tanh(x_t+0.5h_(t−1)); x=[1,0,−1], h0=0.

**Verification tests:** h1≈0.762, h2≈0.364, h3≈−0.558.

**Debugging checklist:** Why can long unrolled sequences cause vanishing gradients?

**Interview checks:** Test order reversal, padding mask and state reset between samples.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## training — Training at scale

**Implementation task:** Training at scale

**Worked fixture:** Implement checkpoint/resume and compare with uninterrupted training.

**Expected result:** Fixed seed, deterministic toy dataset, checkpoint at step 50 of 100.

**Verification tests:** Resumed run reaches the same final state within deterministic tolerance.

**Debugging checklist:** Which states must be saved to resume optimizer training correctly?

**Interview checks:** Test missing checkpoint, changed config and interrupted data loader.

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
