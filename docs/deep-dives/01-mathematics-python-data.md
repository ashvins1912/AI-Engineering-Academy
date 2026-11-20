# Stage 01 — Mathematics, Python & Data Foundations

## Outcome
Reason about tensors, probability, gradients and optimization; build reproducible data pipelines; detect leakage before training.

## Lessons and required labs

### Vectors, matrices and tensor shapes
Treat vectors as ordered features, matrices as transformations and higher-rank tensors as batched/sequence/spatial data. Derive dot product, matrix-vector multiplication, transpose, broadcasting and shape rules. Hand-code dot and matrix multiplication, then compare with NumPy. Test incompatible dimensions, empty arrays, dtype and broadcasting. Deliver a shape table with the meaning of every axis.

### Probability and statistics
Derive conditional probability, Bayes' rule, expectation, variance, covariance, sampling error and confidence intervals. Simulate coin flips and distributions; compare empirical frequencies with theoretical probabilities. Test small samples, rare events and imbalanced labels. Explain correlation versus causation and report uncertainty with sample size.

### Derivatives and gradients
Derive finite differences, partial derivatives and the chain rule. For f(w)=(w−3)^2, calculate the derivative and verify it numerically. Extend to a two-parameter loss. Test sign errors and finite-difference tolerances. Explain that gradients measure sensitivity, not guaranteed global direction.

### Optimization foundations
Compare batch, stochastic and mini-batch gradient descent; convexity, conditioning, saddle points and learning-rate effects. Implement scalar and linear-regression gradient descent. Plot loss and parameter paths for too-small, suitable and too-large learning rates. Log gradient norm, loss and termination reason.

### Python for data work
Practice functions, typing, iterators, generators, context managers, exceptions, pathlib, logging, dataclasses and tests. Build a CSV ingestion CLI with schema validation and structured error output. Test missing files, malformed rows, nulls, duplicate IDs and empty input. Separate pure transformations from I/O; use isolated environments and pinned dependencies.

### NumPy and Pandas
Implement vectorized transforms, boolean masks, joins, groupby aggregations, missing-value policies and deterministic splits. Compare vectorized operations with row loops. Test duplicate join keys, null propagation, timezone-aware dates, index alignment and type coercion. Record memory usage and preserve source identifiers.

### Data quality and leakage
Define point-in-time feature availability. Implement schema/range/uniqueness checks, entity/time splits and fit-on-train-only preprocessing. Deliberately leak a future feature and globally fitted scaler, then compare inflated metrics with a clean pipeline. Test duplicate entities across splits, target-derived fields and future timestamps. Version datasets and publish a data-quality report.

## Stage project — Reproducible tabular pipeline
Build ingestion → validation → cleaning → feature generation → leakage-safe split → artifact export. Include synthetic edge cases, at least 10 tests, a data-flow diagram, a tensor-shape table and a data card covering provenance, limitations and leakage risks.

## Mastery gate
Calculate a matrix product and gradient by hand; explain a probability estimate; build the pipeline from a clean environment; prove future/target information does not cross the split.

## Primary references
- Python: https://docs.python.org/3/tutorial/
- NumPy: https://numpy.org/doc/stable/user/quickstart.html
- pandas: https://pandas.pydata.org/docs/getting_started/index.html
- SciPy optimization: https://docs.scipy.org/doc/scipy/tutorial/optimize.html
