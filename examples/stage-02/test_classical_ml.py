import math, unittest
from classical_ml import (binary_cross_entropy, confusion_metrics, entropy, gini, information_gain,
                          kmeans_step, knn_predict, linear_regression, majority_vote, pca_2d,
                          roc_auc, sigmoid)

class ClassicalMLTests(unittest.TestCase):
    def test_linear_regression_exact_fit(self):
        result=linear_regression([1,2,3],[3,5,7])
        self.assertAlmostEqual(result["slope"],2); self.assertAlmostEqual(result["intercept"],1); self.assertAlmostEqual(result["mse"],0)

    def test_linear_regression_rejects_constant_feature(self):
        with self.assertRaisesRegex(ValueError,"variance is zero"): linear_regression([2,2,2],[1,2,3])

    def test_sigmoid_is_stable_at_extreme_logits(self):
        self.assertGreater(sigmoid(1000),.999); self.assertLess(sigmoid(-1000),.001); self.assertEqual(sigmoid(0),.5)

    def test_binary_cross_entropy_known_value(self):
        value=binary_cross_entropy([.8,.2],[1,0])
        self.assertAlmostEqual(value,-math.log(.8))

    def test_binary_cross_entropy_rejects_invalid_labels(self):
        with self.assertRaisesRegex(ValueError,"binary"): binary_cross_entropy([.5],[2])

    def test_gini_and_entropy(self):
        self.assertAlmostEqual(gini([0,0,1,1]),.5); self.assertAlmostEqual(entropy([0,0,1,1]),1.0)
        self.assertEqual(gini([]),0); self.assertEqual(entropy([1,1]),0)

    def test_information_gain_for_pure_split(self):
        self.assertAlmostEqual(information_gain([0,0,1,1],[0,0],[1,1]),.5)

    def test_information_gain_rejects_invalid_partition(self):
        with self.assertRaisesRegex(ValueError,"partition"): information_gain([0,1],[0],[1,1])

    def test_majority_vote_and_tie_policy(self):
        self.assertEqual(majority_vote([1,1,0]),1); self.assertEqual(majority_vote([1,0]),0)

    def test_knn_prediction(self):
        points=[[0,0],[0,2],[3,3]]; labels=[0,0,1]
        self.assertEqual(knn_predict(points,labels,[1,1],3),0)

    def test_knn_rejects_invalid_k(self):
        with self.assertRaisesRegex(ValueError,"k must"): knn_predict([[0,0]],[0],[1,1],2)

    def test_kmeans_assignment_and_centroid_update(self):
        assignments,centers=kmeans_step([[1,1],[1,2],[8,8],[9,8]],[[1,1],[8,8]])
        self.assertEqual(assignments,[0,0,1,1]); self.assertEqual(centers,[[1.0,1.5],[8.5,8.0]])

    def test_kmeans_keeps_empty_centroid_stable(self):
        _,centers=kmeans_step([[0,0],[0,1]],[[0,0],[100,100]])
        self.assertEqual(centers[1],[100,100])

    def test_pca_covariance_and_variance_ratio(self):
        result=pca_2d([[2,0],[0,2],[3,1],[1,3]])
        self.assertAlmostEqual(sum(result["mean"])/2,1.5)
        self.assertGreaterEqual(result["explained_variance_ratio"],.5)

    def test_confusion_metrics(self):
        result=confusion_metrics(8,2,4,16)
        self.assertAlmostEqual(result["precision"],.8); self.assertAlmostEqual(result["recall"],2/3)
        self.assertAlmostEqual(result["f1"],.7272727272); self.assertAlmostEqual(result["accuracy"],.8)

    def test_confusion_metrics_zero_denominator(self):
        self.assertEqual(confusion_metrics(0,0,0,0)["f1"],0)

    def test_roc_auc_pairwise_ranking(self):
        self.assertAlmostEqual(roc_auc([.9,.8,.2,.1],[1,1,0,0]),1.0)

    def test_roc_auc_rejects_single_class(self):
        with self.assertRaisesRegex(ValueError,"both binary classes"): roc_auc([.2,.4],[0,0])

if __name__=="__main__": unittest.main()
