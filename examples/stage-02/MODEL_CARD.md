# Stage 2 model card — synthetic outcome comparison

## Model purpose
Educational comparison of three classical binary classifiers: logistic regression, K-nearest neighbors and a bagged decision-stump ensemble.

## Data and evaluation
- Dataset: 12 synthetic rows with study-hours and attendance features.
- Evaluation: deterministic stratified three-fold cross-validation.
- Preprocessing: fold-local standardization; the scaler is fitted on each training fold only.
- Reported metrics: precision, recall, F1 and accuracy, averaged across folds.

## Intended use
Teach objective functions, decision rules, cross-validation, preprocessing boundaries and comparative error metrics.

## Prohibited use
Do not use this model, fixture or reported metrics for admissions, hiring, grading, lending, healthcare or any real decision about a person.

## Limitations
The dataset is tiny, synthetic and nearly separable. The result is not statistically meaningful and does not establish generalization, fairness, calibration or robustness.

## Operational checklist for a real model
Use representative and legally obtained data; define a held-out test set; evaluate subgroup performance and calibration; inspect false-positive/false-negative costs; measure latency and memory; version data/code/model; monitor drift; define rollback and human review.
