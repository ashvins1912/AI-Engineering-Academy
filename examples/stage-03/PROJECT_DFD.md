# Stage 3 project data flow and tensor shapes

```mermaid
flowchart TD
 A[Synthetic dataset] --> B[Deterministic train/validation/test split]
 B --> C[Train batch]
 C --> D[2 → 2 → 1 forward pass]
 D --> E[Binary cross-entropy]
 E --> F[Backpropagation]
 F --> G[SGD update]
 G --> H[Validation loss]
 H --> I[Best checkpoint and patience]
 I -->|continue| C
 I -->|stop| J[Restore best weights]
 J --> K[Held-out test metrics]
```

| Tensor | Shape | Meaning |
|---|---:|---|
| Input batch | (B,2) | Two numeric features |
| Hidden weights | (2,2) | Two hidden units × two features |
| Hidden activations | (B,2) | Tanh outputs |
| Output weights | (2,) | Hidden-to-output weights |
| Probability output | (B,1) | Sigmoid score |
| Target | (B,) | Binary label |

Train, validation and test rows are disjoint. Validation loss controls checkpoint selection; the test partition is not used for updates or early stopping.
