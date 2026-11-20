# Stage 02 — Individual lesson lab pack: Classical Machine Learning

Run with Python 3.11+. Core reference algorithms are dependency-free; compare with NumPy/scikit-learn when available. Run the full suite with `python -m unittest discover -s examples/stage-02 -p 'test_*.py' -v`.

## linear-regression — Linear regression from scratch

**Implementation task:** Derive MSE gradients, implement one-feature least squares and gradient descent, and compare predictions.
**Worked fixture:** X=[1,2,3], y=[3,5,7].
**Expected result:** slope=2, intercept=1, MSE=0.
**Verification tests:** exact fit, constant feature, collinear matrix, outlier sensitivity and gradient convergence.
**Debugging checklist:** inspect shapes, residuals, conditioning, feature scales and gradient sign; compare a tiny example by hand.
**Interview checks:** When is QR/SVD safer than explicitly inverting XᵀX? What does a residual plot reveal?
**Submission evidence:** derivation, implementation output, tests, residual interpretation and extrapolation limitation.

## logistic-regression — Logistic regression

**Implementation task:** Implement stable sigmoid, binary cross-entropy, probability prediction and threshold decisions.
**Worked fixture:** logits=[−2,0,2], labels=[0,1,1].
**Expected result:** probabilities≈[0.119,0.5,0.881]; threshold 0.5 predicts [0,1,1].
**Verification tests:** extreme logits, invalid labels, imbalanced classes and thresholds 0.2/0.8.
**Debugging checklist:** stabilize exponentials, clip logs, inspect class distribution and separate probability calibration from threshold choice.
**Interview checks:** Why is threshold a policy rather than a learned model parameter? How do you handle rare positives?
**Submission evidence:** derivation, probability trace, threshold sweep and class-wise metrics.

## trees — Decision trees and ensembles

**Implementation task:** Calculate Gini/entropy gain, implement a greedy split and build a seeded bagged-stump vote.
**Worked fixture:** parent labels=[0,0,1,1], children=[0,0] and [1,1].
**Expected result:** parent Gini=0.5, weighted child Gini=0, gain=0.5; five votes [1,1,0,1,0] produce class 1.
**Verification tests:** empty child, noisy split, bootstrap reproducibility, tied votes and max-depth limit.
**Debugging checklist:** verify weighted child sizes, guard empty nodes, compare train/validation performance and inspect correlated base learners.
**Interview checks:** How do bagging and boosting differ? Why can impurity importance be biased?
**Submission evidence:** split trace, ensemble vote, deterministic seed and variance/overfit explanation.

## svm-knn — KNN and support vector machines

**Implementation task:** Implement sorted KNN distances; fit linear/RBF SVM after training-only scaling.
**Worked fixture:** points=(0,0):A,(0,2):A,(3,3):B; query=(1,1), k=3.
**Expected result:** distances=[√2,√2,√8], prediction=A.
**Verification tests:** ties, invalid k, mismatched dimensions, feature scale disparity and outliers.
**Debugging checklist:** standardize using train-only statistics, sort ties deterministically and inspect margin/support vectors.
**Interview checks:** Why does distance concentration affect high-dimensional KNN? What is hinge loss?
**Submission evidence:** distance trace, scaled/unscaled comparison and SVM margin explanation.

## clustering — Clustering

**Implementation task:** Implement one K-means assignment/update iteration and compare with DBSCAN.
**Worked fixture:** points=[(1,1),(1,2),(8,8),(9,8)], centers=[(1,1),(8,8)].
**Expected result:** assignments=[0,0,1,1], new centers=[(1,1.5),(8.5,8)].
**Verification tests:** empty cluster, seed sensitivity, outlier and non-spherical fixture.
**Debugging checklist:** inspect assignment distances, centroid means, feature scaling and stopping criteria.
**Interview checks:** When is DBSCAN preferable? Why is a cluster not a target label?
**Submission evidence:** assignment table, centroid trace, limitation and stability observation.

## pca — Dimensionality reduction

**Implementation task:** Center a 2D dataset, calculate covariance and project onto the first principal component.
**Worked fixture:** points=(2,0),(0,2),(3,1),(1,3).
**Expected result:** mean=(1.5,1.5); first component follows the high-variance anti-diagonal direction.
**Verification tests:** centered mean≈0, constant column, feature scaling and train-only fit.
**Debugging checklist:** center before covariance, inspect eigenvalue ordering and preserve fitted transform parameters.
**Interview checks:** What does explained variance ratio not tell you? Why can PCA hurt class separation?
**Submission evidence:** covariance matrix, eigenvalues, projection and train-only preprocessing test.

## metrics — Model evaluation

**Implementation task:** Implement confusion metrics, ROC-AUC and a threshold sweep.
**Worked fixture:** TP=8, FP=2, FN=4, TN=16.
**Expected result:** precision=0.8, recall≈0.667, F1≈0.727, accuracy=0.8.
**Verification tests:** zero denominators, one-class ROC-AUC input, rare positives and macro/weighted aggregation.
**Debugging checklist:** label positive class, inspect confusion counts, separate ranking/calibration and slice errors by subgroup.
**Interview checks:** When is PR-AUC more informative than ROC-AUC? What is calibration?
**Submission evidence:** hand calculation, metrics report, threshold decision and subgroup-error analysis.

## Stage completion evidence

- [ ] Every algorithm has a runnable implementation and numerical fixture.
- [ ] Negative tests catch invalid input and known failure modes.
- [ ] Preprocessing is fitted inside each training fold only.
- [ ] Three model families are compared on identical deterministic folds.
- [ ] Model report documents metrics, limitations, calibration and rollback criteria.
