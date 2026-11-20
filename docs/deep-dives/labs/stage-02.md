# Stage 02 — Individual lesson lab pack: Classical Machine Learning

This workbook turns each lesson into a verifiable practical task. Run exercises in an isolated local environment; no learner code is executed by the Academy service. Record your code, test output and short explanation in your learning notes.

## linear-regression — Implement closed-form least squares and gradient descent, compare predictions.

**Implementation task:** X=[[1],[2],[3]], y=[3,5,7] with intercept.

**Worked fixture:** Slope≈2, intercept≈1; predictions [3,5,7].

**Expected result:** Test singular/collinear X, outlier and constant target.

**Verification tests:** When would QR/SVD be safer than explicitly inverting XᵀX?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## logistic-regression — Compute sigmoid, binary cross-entropy and thresholded predictions.

**Implementation task:** Logits=[−2,0,2], labels=[0,1,1].

**Worked fixture:** Probabilities≈[0.119,0.5,0.881]; threshold 0.5 predicts [0,1,1].

**Expected result:** Test extreme logits, class imbalance and thresholds 0.2/0.8.

**Verification tests:** Why is a probability threshold a decision policy rather than a learned parameter?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## trees — Calculate Gini impurity and choose a split for a tiny classification tree.

**Implementation task:** Parent labels [0,0,1,1]; split into pure left [0,0], right [1,1].

**Worked fixture:** Parent Gini=0.5; weighted child Gini=0; gain=0.5.

**Expected result:** Test empty child prevention, max depth and a noisy split.

**Verification tests:** How do bagging and boosting differ in how models are combined?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## svm-knn — Implement KNN distances and inspect a linear SVM margin after scaling.

**Implementation task:** Points (0,0):A, (0,2):A, (3,3):B; query (1,1), k=3.

**Worked fixture:** Nearest-neighbor vote is A (2 of 3); report sorted distances.

**Expected result:** Test ties, feature scale disparity and k larger than sample count.

**Verification tests:** Why do distance-based methods need scaling?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## clustering — Run one K-means assignment/update iteration by hand.

**Implementation task:** Points [1,1],[1,2],[8,8],[9,8], centers [1,1],[8,8].

**Worked fixture:** Assignments [0,0,1,1], new centers [1,1.5] and [8.5,8].

**Expected result:** Test empty cluster, seed sensitivity and outlier.

**Verification tests:** Why can K-means fail on non-spherical clusters?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## pca — Center a 2-D dataset, compute covariance and project onto principal axis.

**Implementation task:** Points (2,0),(0,2),(3,1),(1,3).

**Worked fixture:** Mean=(1.5,1.5); first component follows the anti-diagonal symmetry direction.

**Expected result:** Assert centered mean≈0; fit PCA on training split only.

**Verification tests:** What does explained variance ratio not tell you?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## metrics — Build a confusion matrix and calculate precision/recall/F1 by hand.

**Implementation task:** TP=8, FP=2, FN=4, TN=16.

**Worked fixture:** Precision=0.8, recall=2/3≈0.667, F1≈0.727.

**Expected result:** Test no predicted positives and macro vs weighted averages.

**Verification tests:** When is PR-AUC more informative than ROC-AUC?

**Debugging checklist:** Check input shape/schema first; print intermediate values; verify units, ordering and version assumptions; reduce to the smallest failing fixture; add a regression test before changing the implementation.

**Interview checks:** undefined

**Submission evidence:** Include the implementation, a successful run, the verification tests (including one negative case), and a 3–5 sentence explanation of the trade-off or failure mode.

---

## Stage completion evidence

- [ ] Every lesson implementation runs from a clean environment.
- [ ] Expected values are reproduced and negative tests fail safely.
- [ ] Debugging notes explain at least one failure and its fix.
- [ ] Interview checks are answered without reading the guide.
- [ ] The stage project in the main guide integrates these lesson skills.
