# Stage 03 — Individual lesson lab pack: Deep Learning

Use Python 3.11+. Run reference and project tests with `python -m unittest discover -s examples/stage-03 -p 'test_*.py' -v`.

## perceptron — Perceptrons and multilayer networks
**Implementation task:** Calculate affine output and compare sigmoid, tanh and ReLU; demonstrate XOR's non-linear requirement.
**Worked fixture:** x=[1,0], w=[2,−1], b=−0.5 gives z=1.5.
**Expected result:** sigmoid≈0.818; ReLU=1.5.
**Verification tests:** activation ranges, saturation, XOR and invalid input width.
**Failure lab:** remove hidden activation and prove the stack remains affine.
**Submission evidence:** hand derivation, output trace, XOR explanation and negative test.

## forward — Forward propagation
**Implementation task:** Trace a 2→2→1 network and assert batch/feature dimensions.
**Worked fixture:** X=(2×3), W1=(3×4), W2=(4×2).
**Expected result:** hidden=(2×4), logits=(2×2).
**Verification tests:** batch size one, wrong feature width and non-finite inputs.
**Failure lab:** transpose a weight matrix and identify the first invalid multiplication.
**Submission evidence:** shape table and every intermediate activation.

## backprop — Loss and backpropagation
**Implementation task:** Derive a sigmoid neuron's gradient and compare with finite differences.
**Worked fixture:** x=.8,w=.4,b=.1,y=1.
**Expected result:** finite analytic and numerical gradients agree within tolerance.
**Verification tests:** epsilon bounds, sign error and bias gradient.
**Failure lab:** remove activation derivative or input multiplier and inspect mismatch.
**Submission evidence:** chain-rule derivation, gradient trace and regression test.

## optimizers — Optimizers and regularization
**Implementation task:** Compare SGD, momentum and Adam on one quadratic; test dropout and batch normalization.
**Worked fixture:** θ=1,g=.5,η=.1.
**Expected result:** SGD gives θ=.95; other methods retain distinct optimizer state.
**Verification tests:** optimizer state persistence, invalid learning rate, dropout train/eval and constant batch.
**Failure lab:** resume without moment state and compare trajectory.
**Submission evidence:** loss/parameter traces and regularization trade-off.

## cnn — Convolutional neural networks
**Implementation task:** Implement valid convolution and max pooling.
**Worked fixture:** 3×3 input with 2×2 all-ones kernel.
**Expected result:** [[12,16],[24,28]].
**Verification tests:** stride, kernel-too-large, ragged matrix and pooling dimensions.
**Failure lab:** swap channel order or use the wrong output-size formula.
**Submission evidence:** per-cell multiply-accumulate trace and feature-map shape.

## sequence — RNNs, LSTMs and sequence models
**Implementation task:** Trace a scalar RNN and one LSTM gate update.
**Worked fixture:** x=[1,0,−1], h₀=0, hₜ=tanh(xₜ+.5hₜ₋₁).
**Expected result:** three hidden states in original sequence order.
**Verification tests:** reversed order, state reset and gate bounds.
**Failure lab:** carry hidden state from one independent sample into another.
**Submission evidence:** state table, gate values and BPTT explanation.

## training — Generalization and training systems
**Implementation task:** Train, validate, checkpoint, resume and restore the best epoch.
**Worked fixture:** validation losses=[.9,.7,.5,.55,.6], patience=2.
**Expected result:** best epoch 3; stop at epoch 5.
**Verification tests:** missing checkpoint, corrupt state, early-stop patience and resume epoch.
**Failure lab:** fit preprocessing on validation or tune repeatedly on test.
**Submission evidence:** run commands, checkpoint, best epoch, test metrics and model card.

## Stage completion evidence
- [ ] All seven topic implementations and numerical examples run.
- [ ] Analytic gradients match finite differences.
- [ ] CNN and recurrent calculations match reference outputs.
- [ ] Optimizer state and checkpoint resume are verified.
- [ ] Validation/test boundaries are respected and the model card states limitations.
