import copy
import unittest

from advanced_deep_learning import (
    mlp_binary_loss_gradients, mlp_forward, regularization_penalty,
    rnn_bptt_gradients,
)

PARAMETERS = {
    "w1": [[0.5, -0.4], [-0.3, 0.8]],
    "b1": [0.1, -0.2],
    "w2": [0.7, -0.5],
    "b2": 0.2,
}


def loss_for(parameters, x, target):
    output = mlp_forward(x, parameters)["output"]
    import math
    return -(target * math.log(max(output, 1e-12)) + (1-target) * math.log(max(1-output, 1e-12)))


class AdvancedDeepLearningTests(unittest.TestCase):
    def test_mlp_forward_returns_each_intermediate_tensor(self):
        result = mlp_forward([0.8, 0.3], PARAMETERS)
        self.assertEqual(len(result["z1"]), 2)
        self.assertEqual(len(result["hidden"]), 2)
        self.assertGreater(result["output"], 0)
        self.assertLess(result["output"], 1)

    def test_mlp_backprop_matches_finite_difference_for_all_parameter_groups(self):
        x, target, epsilon = [0.8, 0.3], 1, 1e-5
        result = mlp_binary_loss_gradients(x, target, PARAMETERS)
        gradients = result["gradients"]
        for group, index in [("w1", (0, 0)), ("w2", (1,)), ("b1", (1,)), ("b2", ())]:
            plus, minus = copy.deepcopy(PARAMETERS), copy.deepcopy(PARAMETERS)
            if group == "w1":
                plus[group][index[0]][index[1]] += epsilon
                minus[group][index[0]][index[1]] -= epsilon
                analytic = gradients[group][index[0]][index[1]]
            elif group == "w2":
                plus[group][index[0]] += epsilon
                minus[group][index[0]] -= epsilon
                analytic = gradients[group][index[0]]
            elif group == "b1":
                plus[group][index[0]] += epsilon
                minus[group][index[0]] -= epsilon
                analytic = gradients[group][index[0]]
            else:
                plus[group] += epsilon
                minus[group] -= epsilon
                analytic = gradients[group]
            numeric = (loss_for(plus, x, target) - loss_for(minus, x, target)) / (2 * epsilon)
            self.assertAlmostEqual(analytic, numeric, places=6)

    def test_mlp_rejects_bad_shape_and_non_binary_target(self):
        with self.assertRaisesRegex(ValueError, "2 inputs"):
            mlp_forward([1], PARAMETERS)
        with self.assertRaisesRegex(ValueError, "binary"):
            mlp_binary_loss_gradients([1, 2], 3, PARAMETERS)

    def test_rnn_bptt_matches_finite_difference(self):
        inputs, target, wx, wh, bias = [1.0, 0.0, -1.0], 0.2, 0.8, 0.5, 0.1
        result = rnn_bptt_gradients(inputs, target, wx, wh, bias)
        eps = 1e-5
        def loss(a, b, c):
            state = 0.0
            for value in inputs:
                state = __import__("math").tanh(a * value + b * state + c)
            return 0.5 * (state-target)**2
        numeric_wx = (loss(wx+eps,wh,bias)-loss(wx-eps,wh,bias))/(2*eps)
        numeric_wh = (loss(wx,wh+eps,bias)-loss(wx,wh-eps,bias))/(2*eps)
        numeric_bias = (loss(wx,wh,bias+eps)-loss(wx,wh,bias-eps))/(2*eps)
        self.assertAlmostEqual(result["grad_wx"], numeric_wx, places=6)
        self.assertAlmostEqual(result["grad_wh"], numeric_wh, places=6)
        self.assertAlmostEqual(result["grad_bias"], numeric_bias, places=6)

    def test_rnn_bptt_rejects_empty_sequence(self):
        with self.assertRaisesRegex(ValueError, "non-empty"):
            rnn_bptt_gradients([], 0, 1, 0.5)

    def test_l1_l2_regularization_values(self):
        result = regularization_penalty([[1, -2], [3, -4]], l1=0.1, l2=0.2)
        self.assertAlmostEqual(result["l1"], 1.0)
        self.assertAlmostEqual(result["l2"], 3.0)
        self.assertAlmostEqual(result["total"], 4.0)

    def test_regularization_rejects_negative_coefficients(self):
        with self.assertRaisesRegex(ValueError, "non-negative"):
            regularization_penalty([1, 2], l1=-0.1)


if __name__ == "__main__":
    unittest.main()
