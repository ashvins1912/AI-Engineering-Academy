# Stage 02 — Individual lesson lab pack: Classical Machine Learning

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## linear-regression — Linear regression from scratch

**Implementation task:** Implement closed-form least squares and gradient descent, compare predictions.

**Worked fixture:** X=[[1],[2],[3]], y=[3,5,7] with intercept.

**Expected result:** Slope≈2, intercept≈1; predictions [3,5,7].

**Verification tests:** Test singular/collinear X, outlier and constant target.

**Debugging checklist:** When would QR/SVD be safer than explicitly inverting XᵀX?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## logistic-regression — Logistic regression

**Implementation task:** Compute sigmoid, binary cross-entropy and thresholded predictions.

**Worked fixture:** Logits=[−2,0,2], labels=[0,1,1].

**Expected result:** Probabilities≈[0.119,0.5,0.881]; threshold 0.5 predicts [0,1,1].

**Verification tests:** Test extreme logits, class imbalance and thresholds 0.2/0.8.

**Debugging checklist:** Why is a probability threshold a decision policy rather than a learned parameter?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## trees — Decision trees and ensembles

**Implementation task:** Calculate Gini impurity and choose a split for a tiny classification tree.

**Worked fixture:** Parent labels [0,0,1,1]; split into pure left [0,0], right [1,1].

**Expected result:** Parent Gini=0.5; weighted child Gini=0; gain=0.5.

**Verification tests:** Test empty child prevention, max depth and a noisy split.

**Debugging checklist:** How do bagging and boosting differ in how models are combined?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## svm-knn — KNN and support vector machines

**Implementation task:** Implement KNN distances and inspect a linear SVM margin after scaling.

**Worked fixture:** Points (0,0):A, (0,2):A, (3,3):B; query (1,1), k=3.

**Expected result:** Nearest-neighbor vote is A (2 of 3); report sorted distances.

**Verification tests:** Test ties, feature scale disparity and k larger than sample count.

**Debugging checklist:** Why do distance-based methods need scaling?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## clustering — Clustering

**Implementation task:** Run one K-means assignment/update iteration by hand.

**Worked fixture:** Points [1,1],[1,2],[8,8],[9,8], centers [1,1],[8,8].

**Expected result:** Assignments [0,0,1,1], new centers [1,1.5] and [8.5,8].

**Verification tests:** Test empty cluster, seed sensitivity and outlier.

**Debugging checklist:** Why can K-means fail on non-spherical clusters?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## pca — Dimensionality reduction

**Implementation task:** Center a 2-D dataset, compute covariance and project onto principal axis.

**Worked fixture:** Points (2,0),(0,2),(3,1),(1,3).

**Expected result:** Mean=(1.5,1.5); first component follows the anti-diagonal symmetry direction.

**Verification tests:** Assert centered mean≈0; fit PCA on training split only.

**Debugging checklist:** What does explained variance ratio not tell you?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## metrics — Model evaluation

**Implementation task:** Build a confusion matrix and calculate precision/recall/F1 by hand.

**Worked fixture:** TP=8, FP=2, FN=4, TN=16.

**Expected result:** Precision=0.8, recall=2/3≈0.667, F1≈0.727.

**Verification tests:** Test no predicted positives and macro vs weighted averages.

**Debugging checklist:** When is PR-AUC more informative than ROC-AUC?

**Interview checks:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Submission evidence:** undefined

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
