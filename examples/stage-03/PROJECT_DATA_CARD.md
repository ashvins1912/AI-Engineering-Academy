# Stage 3 project data card

- Provenance: 25 deterministic synthetic 2D points generated from a fixed coordinate grid; no personal data.
- Target: binary label defined by whether x1+x2 is positive.
- Split: deterministic disjoint train, validation and test partitions.
- Model: two-hidden-unit tanh MLP with sigmoid output.
- Training: full-batch gradient descent; validation loss drives best-checkpoint selection and patience-based stopping.
- Intended use: teach forward/backward passes, training loops, validation boundaries, checkpointing and inference metrics.
- Limitations: tiny synthetic dataset and intentionally simple decision boundary; no real-world performance, fairness or robustness claim.
- Prohibited use: not suitable for grading, admissions, hiring, healthcare, lending or any consequential decision about a person.
