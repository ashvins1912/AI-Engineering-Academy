# Stage 2 model-comparison failure report

## Injected risk
A scaler is fitted on the entire dataset before cross-validation.

## Symptom
Validation-fold values influence the mean and scale used during training, making the evaluation pipeline transductive and leaking information across the fold boundary.

## Corrective control
The runner creates the fold split first, fits preprocessing only on the training fold, and applies the frozen parameters to validation. Every fold exports its fit-row count and validation-used-for-fit flag.

## Regression coverage
The model-comparison tests assert fold coverage, fit-row counts and that validation data is never used to fit preprocessing.
