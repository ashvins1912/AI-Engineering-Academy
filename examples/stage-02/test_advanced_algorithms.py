import unittest

from advanced_algorithms import (
    average_precision, brier_score, dbscan, fit_adaboost_stumps,
    fit_linear_svm, predict_adaboost_stumps, predict_linear_svm,
    precision_recall_curve,
)


class AdvancedClassicalMLTests(unittest.TestCase):
    def test_linear_svm_separates_simple_margin_fixture(self):
        X = [[2, 2], [2, 3], [3, 2], [-2, -2], [-2, -3], [-3, -2]]
        y = [1, 1, 1, 0, 0, 0]
        model = fit_linear_svm(X, y, learning_rate=0.05, regularization=0.01, epochs=1200)
        self.assertEqual(predict_linear_svm(model, X), y)
        self.assertGreater(len(model["support_vector_indices"]), 0)
        self.assertGreater(len(model["objective_history"]), 0)

    def test_linear_svm_rejects_single_class_and_shape_mismatch(self):
        with self.assertRaisesRegex(ValueError, "both binary classes"):
            fit_linear_svm([[0], [1]], [1, 1])
        with self.assertRaisesRegex(ValueError, "aligned"):
            fit_linear_svm([[0], [1]], [0])

    def test_linear_svm_rejects_bad_hyperparameters(self):
        with self.assertRaisesRegex(ValueError, "positive"):
            fit_linear_svm([[0], [1]], [0, 1], learning_rate=0)

    def test_adaboost_stumps_learn_separable_fixture(self):
        X = [[0], [1], [2], [3], [4], [5]]
        y = [0, 0, 0, 1, 1, 1]
        model = fit_adaboost_stumps(X, y, n_estimators=5)
        self.assertEqual(predict_adaboost_stumps(model, X), y)
        self.assertLessEqual(model["training_error"], 1 / 6)

    def test_adaboost_rejects_bad_data(self):
        with self.assertRaisesRegex(ValueError, "both binary classes"):
            fit_adaboost_stumps([[0], [1]], [0, 0])
        with self.assertRaisesRegex(ValueError, "positive"):
            fit_adaboost_stumps([[0], [1]], [0, 1], 0)

    def test_dbscan_finds_clusters_and_noise(self):
        points = [[0, 0], [0.1, 0], [0, 0.1], [5, 5], [5.1, 5], [5, 5.1], [20, 20]]
        labels = dbscan(points, eps=0.25, min_samples=2)
        self.assertEqual(labels[0], labels[1])
        self.assertEqual(labels[3], labels[4])
        self.assertNotEqual(labels[0], labels[3])
        self.assertEqual(labels[-1], -1)

    def test_dbscan_rejects_invalid_parameters(self):
        with self.assertRaisesRegex(ValueError, "eps"):
            dbscan([[0], [1]], eps=0, min_samples=1)
        with self.assertRaisesRegex(ValueError, "min_samples"):
            dbscan([[0], [1]], eps=1, min_samples=0)

    def test_precision_recall_curve(self):
        curve = precision_recall_curve([0.9, 0.8, 0.4, 0.1], [1, 0, 1, 0])
        self.assertEqual(curve[0]["recall"], 0)
        self.assertAlmostEqual(curve[-1]["recall"], 1)
        self.assertGreaterEqual(curve[-1]["precision"], 0.5)

    def test_average_precision_known_ranking(self):
        self.assertAlmostEqual(average_precision([0.9, 0.8, 0.4, 0.1], [1, 0, 1, 0]), 5 / 6)

    def test_brier_score_and_validation(self):
        self.assertAlmostEqual(brier_score([0.8, 0.2], [1, 0]), 0.04)
        with self.assertRaisesRegex(ValueError, "in \[0, 1\]"):
            brier_score([1.2], [1])


if __name__ == "__main__":
    unittest.main()
