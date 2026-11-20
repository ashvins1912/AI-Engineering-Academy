# Stage 2 model-comparison data flow

```mermaid
flowchart TD
 A[Versioned labelled dataset] --> B[Schema and label validation]
 B --> C[Stratified folds]
 C --> D[Training fold only]
 D --> E[Fit scaler and candidate models]
 C --> F[Validation fold]
 E --> G[Predict validation]
 F --> G
 G --> H[Confusion metrics and fold report]
 H --> I[Compare quality and limitations]
```

## Evaluation contract
Each fold stores train/validation row counts, scaler fit count and an explicit validation-used-for-fit=false invariant. Model selection must use the same folds and metrics; the final test set remains untouched until selection is complete.
