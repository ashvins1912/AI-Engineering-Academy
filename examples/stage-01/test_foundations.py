import math
import tempfile
import unittest
from pathlib import Path

from foundations import (
    bayes_posterior, derivative_analytic, derivative_central, derivative_forward,
    dot, gradient_descent_linear, leakage_demo, matmul, optional_numpy_pandas_check,
    split_by_entity, validate_csv,
)


class StageOneFoundationsTests(unittest.TestCase):
    def test_dot_and_matrix_multiplication(self):
        self.assertEqual(dot([1, 2], [2, 1]), 4)
        self.assertEqual(matmul([[1, 2], [3, 4]], [[2], [1]]), [[4], [10]])
        self.assertEqual(matmul([[1, 2], [3, 4]], [[1, 2], [3, 4]]), [[7, 10], [15, 22]])

    def test_vector_dimension_failure(self):
        with self.assertRaisesRegex(ValueError, "dimension mismatch"):
            dot([1], [1, 2])

    def test_matrix_shape_failures(self):
        with self.assertRaisesRegex(ValueError, "do not align"):
            matmul([[1, 2, 3]], [[1, 2], [3, 4]])
        with self.assertRaisesRegex(ValueError, "ragged"):
            matmul([[1, 2], [3]], [[1], [2]])

    def test_bayes_posterior(self):
        self.assertAlmostEqual(bayes_posterior(0.2, 0.8, 0.1), 2 / 3)
        with self.assertRaisesRegex(ValueError, "undefined"):
            bayes_posterior(0, 0, 0)

    def test_derivatives_match(self):
        self.assertEqual(derivative_analytic(1), -4)
        self.assertAlmostEqual(derivative_forward(lambda x: (x - 3) ** 2, 1), -4, places=4)
        self.assertAlmostEqual(derivative_central(lambda x: (x - 3) ** 2, 1), -4, places=7)

    def test_derivative_rejects_bad_epsilon(self):
        with self.assertRaisesRegex(ValueError, "positive"):
            derivative_central(lambda x: x*x, 1, 0)

    def test_gradient_descent_converges(self):
        result = gradient_descent_linear([1, 2, 3], [2, 4, 6], 0.1)
        self.assertAlmostEqual(result.weight, 2, places=4)
        self.assertLess(result.loss, 1e-6)
        self.assertIn(result.stop_reason, {"gradient_tolerance", "max_steps"})

    def test_gradient_descent_rejects_bad_inputs(self):
        with self.assertRaisesRegex(ValueError, "positive"):
            gradient_descent_linear([1], [2], -0.1)
        with self.assertRaisesRegex(ValueError, "equal lengths"):
            gradient_descent_linear([1], [2, 3])

    def test_leakage_demo_exposes_global_fit(self):
        values = leakage_demo()
        self.assertEqual(values["train_only_mean"], 2)
        self.assertEqual(values["leaky_global_mean"], 251.5)

    def test_entity_split_is_disjoint(self):
        rows = [{"entity": "a", "x": 1}, {"entity": "b", "x": 2}]
        train, valid = split_by_entity(rows, {"b"})
        self.assertEqual([x["entity"] for x in train], ["a"])
        self.assertEqual([x["entity"] for x in valid], ["b"])

    def test_csv_ingestion_keeps_good_rows_and_reports_bad_rows(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.csv"
            path.write_text("id,value\na,1\n,2\nb,oops\na,3\nc,4\n", encoding="utf-8")
            result = validate_csv(path)
            self.assertEqual(result.valid_rows, [{"id": "a", "value": 1.0}, {"id": "c", "value": 4.0}])
            self.assertEqual(len(result.errors), 2)
            self.assertEqual(len(result.duplicates), 1)

    def test_csv_missing_schema_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "input.csv"
            path.write_text("name\nAda\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "missing required"):
                validate_csv(path)

    def test_optional_vectorization_comparison_is_explicit(self):
        result = optional_numpy_pandas_check()
        self.assertEqual(result["expected"], {"A": 10, "B": 5})
        self.assertIn("available", result)


if __name__ == "__main__":
    unittest.main()
