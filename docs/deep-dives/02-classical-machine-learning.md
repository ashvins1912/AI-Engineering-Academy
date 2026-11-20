# Stage 02 — Classical Machine Learning

## Outcome
Implement and compare supervised/unsupervised models, understand their objectives and evaluate them with leakage-safe experiments.

### Linear regression
Derive ŷ=Xw+b, residuals, MSE, gradients and the normal equation. Implement batch gradient descent in NumPy and compare with scikit-learn. Test collinearity, outliers, constant targets and scaling. Inspect residuals and extrapolation risk.

### Logistic regression
Derive log-odds, sigmoid, binary cross-entropy and gradient (p−y)X/n. Implement stable sigmoid and clipped loss. Test imbalanced labels, separable data, threshold movement and calibration. Choose thresholds using error costs, not a default 0.5.

### Decision trees and ensembles
Derive entropy, Gini, information gain, bagging, random forests and boosting. Implement one greedy split on a tiny dataset, then compare tree, random forest and gradient boosting. Test depth limits, leaf sizes, class weights and unstable splits. Explain why feature importance can be misleading.

### KNN and support vector machines
Derive distance metrics, majority vote, margin width and hinge loss. Implement KNN with NumPy; fit linear/RBF SVM. Test feature scaling, ties, high-dimensional distance concentration and outliers. Discuss KNN storage/inference cost and SVM support-vector count.

### Clustering
Implement K-means assignment and centroid update; compare with DBSCAN. Test initialization sensitivity, non-spherical clusters, outliers, density variation and scaling. Evaluate silhouette and cluster stability; clusters are hypotheses, not labels.

### Dimensionality reduction
Derive centering, covariance, eigenvectors/eigenvalues, SVD and explained variance. Implement a two-component PCA projection and reconstruction. Test unscaled features, constant columns and leakage from fitting before split. Preserve fitted transform version.

### Model evaluation
Calculate confusion matrix, precision, recall, F1, ROC-AUC, PR-AUC, MAE, RMSE, R² and calibration. Implement threshold sweeps and macro/micro/weighted averages. Test rare positives, empty predicted-positive sets and subgroup performance. Define metrics before training and reserve test data for final evaluation.

## Stage project — Model comparison report
Create a leakage-safe sklearn pipeline. Compare at least three model families with controlled seeds and cross-validation. Report predictive quality, calibration, latency, memory, interpretability and subgroup errors. Include model card, intended use, limitations and rollback criteria.

## Mastery gate
Calculate key metrics by hand, explain each estimator's objective, identify leakage and justify model choice using quality plus operational constraints.

## Primary references
- User guide: https://scikit-learn.org/stable/user_guide.html
- Evaluation: https://scikit-learn.org/stable/modules/model_evaluation.html
- Preprocessing: https://scikit-learn.org/stable/modules/preprocessing.html
