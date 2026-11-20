\`\`\`mermaid
flowchart TD
 A[Versioned CSV fixture] --> B[Schema and type validation]
 B --> C[Deterministic feature engineering]
 C --> D[Time cutoff and entity-disjoint split]
 D --> E[Fit scaler on training partition only]
 E --> F[Transform train and validation]
 F --> G[Export JSON artifact and data card]
 B -->|invalid input| X[Fail with row/field reason]
 D -->|entity overlap or empty partition| X
\`\`\`

## Shape contract

| Stage | Shape | Meaning |
|---|---:|---|
| Raw records | (12, 5) | 12 rows and five declared source fields |
| Train partition | (8, 5) | Eight pre-cutoff rows |
| Validation partition | (4, 5) | Four post-cutoff rows |
| Feature matrix | (rows, 2) | feature_value and feature_abs |
| Scaled feature | (rows, 1) | One normalized numeric feature per row |
| Target vector | (rows,) | One binary label per row |

Entity IDs and event dates are split/audit metadata, not model features. Validation values never influence scaler fitting.
