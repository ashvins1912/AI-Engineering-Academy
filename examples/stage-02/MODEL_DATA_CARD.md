# Stage 2 model-comparison data card

- Provenance: 12 synthetic educational records; no real learner or customer data.
- Target: binary outcome label for a toy supervised classification task.
- Features: study_hours and attendance.
- Split: deterministic stratified three-fold cross-validation.
- Preprocessing: mean and scale are fitted separately on each training fold; validation folds are transformed with those frozen statistics.
- Models: logistic regression, KNN and a bagged decision-stump ensemble.
- Metrics: precision, recall, F1 and accuracy, averaged over folds.
- Limitations: the dataset is tiny, synthetic and deliberately easy; metrics are demonstrations, not evidence of generalization or suitability for any real decision.
- Risks: real systems need representative sampling, subgroup/fairness review, calibration, drift monitoring, privacy review and a held-out final test set.
