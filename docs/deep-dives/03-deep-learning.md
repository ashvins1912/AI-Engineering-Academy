# Stage 03 — Deep Learning

## Outcome
Understand neural networks as differentiable computation graphs; implement forward/backward passes; train and debug architectures.

### Perceptrons and multilayer networks
Derive z=Wx+b and activations (ReLU, sigmoid, tanh). Explain why stacking linear layers without nonlinearities remains linear. Implement a two-layer NumPy network and solve XOR. Test activation saturation and tensor shapes.

### Forward propagation
Trace input → affine layer → activation → logits/output. Print intermediate tensors and assert dimensions. Test batch size one versus many, wrong feature count, dtype/device mismatch and NaN/Inf. Profile inference memory.

### Loss and backpropagation
Derive MSE/cross-entropy gradients and apply the chain rule through each layer. Implement NumPy backprop and compare with finite differences and PyTorch autograd. Test sign, transpose and missing batch-average errors. Explain vanishing/exploding gradients.

### Optimizers and regularization
Compare SGD, momentum, Adam/AdamW, learning-rate schedules, L1/L2, dropout, weight decay and early stopping. Train the same model with SGD and Adam; log loss, gradient and parameter norms. Test high learning rate and train/eval dropout mode. Save optimizer state in checkpoints.

### Convolutional neural networks
Derive convolution output dimensions, padding, stride, channels, receptive field and parameter count. Calculate one convolution by hand, then train a small CNN. Test channel order, preprocessing mismatch and off-by-one output shape. Benchmark throughput and peak memory.

### RNNs, LSTMs and sequence models
Derive recurrent hidden state, backpropagation through time and LSTM input/forget/output gates. Calculate a scalar RNN update, then build a sequence classifier. Test shuffled order, padding masks, long-sequence instability and hidden-state leakage. Monitor sequence-length latency.

### Training at scale
Cover reproducible splits, data loaders, mixed precision, gradient accumulation, distributed data parallel concepts, checkpoint resume and early stopping. Build a configurable training loop with seeds and checkpoints. Test interrupted resume, loader bottlenecks and nondeterministic augmentation. Report examples/sec, GPU utilization, peak memory and cost.

## Stage project — Train and package a neural classifier
Create a deterministic dataset pipeline, MLP baseline and CNN or sequence model. Add gradient checks, training logs, checkpoint resume, early stopping, per-class evaluation and inference preprocessing. Deliver plots, error analysis, model card and inference benchmark.

## Mastery gate
Explain the chain rule through a network, verify gradients numerically, diagnose overfitting/instability and reproduce a checkpointed run.

## Primary references
- PyTorch tutorials: https://pytorch.org/tutorials/
- Autograd: https://pytorch.org/tutorials/beginner/basics/autogradqs_tutorial.html
- Reproducibility: https://pytorch.org/docs/stable/notes/randomness.html
