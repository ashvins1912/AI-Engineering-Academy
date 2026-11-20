import math,unittest
from deep_learning import (batch_norm,conv2d_valid,dropout,early_stopping,finite_difference,
                           forward_2_2_1,generalization_gap,list if False else lstm_step,
                           max_pool2d,neuron_loss_gradient,optimizer_step,relu,rnn_sequence,sigmoid)

class DeepLearningReferenceTests(unittest.TestCase):
    def test_sigmoid_and_relu(self):
        self.assertEqual(sigmoid(0),.5);self.assertEqual(relu(-2),0);self.assertEqual(relu(3),3)

    def test_neuron_forward_and_gradients(self):
        result=neuron_loss_gradient(.8,.4,.1,1)
        self.assertGreater(result["prediction"],0);self.assertLess(result["prediction"],1)
        self.assertTrue(math.isfinite(result["grad_w"]))

    def test_gradient_matches_finite_difference(self):
        x,w,b,target=.8,.4,.1,1
        fn=lambda value:.5*(sigmoid(value*x+b)-target)**2
        analytic=neuron_loss_gradient(x,w,b,target)["grad_w"]
        self.assertAlmostEqual(analytic,finite_difference(fn,w),places=6)

    def test_finite_difference_rejects_zero_epsilon(self):
        with self.assertRaisesRegex(ValueError,"positive"):finite_difference(lambda x:x*x,1,0)

    def test_forward_shape_contract(self):
        result=forward_2_2_1([.8,.3])
        self.assertEqual(len(result["hidden"]),2);self.assertTrue(0<result["output"]<1)

    def test_forward_rejects_wrong_input_width(self):
        with self.assertRaisesRegex(ValueError,"two input"):forward_2_2_1([1])

    def test_valid_convolution_values(self):
        result=conv2d_valid([[1,2,3],[4,5,6],[7,8,9]],[[1,1],[1,1]])
        self.assertEqual(result,[[12,16],[24,28]])

    def test_convolution_stride_and_invalid_kernel(self):
        self.assertEqual(conv2d_valid([[1,2,3],[4,5,6],[7,8,9]],[[1,0],[0,1]],2),[[6]])
        with self.assertRaisesRegex(ValueError,"exceed"):conv2d_valid([[1]],[[1,2],[3,4]])

    def test_max_pooling(self):
        self.assertEqual(max_pool2d([[1,2,3,4],[5,6,7,8],[9,1,2,3],[4,5,6,7]]),[[6,8],[9,7]])

    def test_rnn_sequence_order(self):
        a=rnn_sequence([1,0,-1]);b=rnn_sequence([-1,0,1])
        self.assertEqual(len(a),3);self.assertNotEqual(a,b)

    def test_lstm_gate_outputs_are_bounded(self):
        result=lstm_step(1,0,0)
        for key in ("input_gate","forget_gate","output_gate"):self.assertGreaterEqual(result[key],0);self.assertLessEqual(result[key],1)
        self.assertTrue(math.isfinite(result["cell"]))

    def test_dropout_train_and_eval_modes(self):
        self.assertEqual(dropout([1,2,3],.5,seed=7,training=False),[1,2,3])
        self.assertEqual(dropout([1,2,3],.5,seed=7),dropout([1,2,3],.5,seed=7))

    def test_batch_norm_zero_centers_values(self):
        result=batch_norm([1,2,3])
        self.assertAlmostEqual(sum(result)/len(result),0,places=7)

    def test_optimizer_states(self):
        p,_=optimizer_step(1,.5,.1,"sgd")
        self.assertAlmostEqual(p,.95)
        p,state=optimizer_step(1,.5,.1,"momentum")
        self.assertIn("velocity",state)
        p,state=optimizer_step(1,.5,.1,"adam")
        self.assertIn("m",state);self.assertIn("v",state)

    def test_optimizer_rejects_unknown_kind(self):
        with self.assertRaisesRegex(ValueError,"optimizer must"):optimizer_step(1,1,.1,"unknown")

    def test_early_stopping_restores_best_epoch(self):
        result=early_stopping([.9,.7,.5,.55,.6,.65],patience=2)
        self.assertEqual(result["best_epoch"],3);self.assertEqual(result["stop_epoch"],5)

    def test_generalization_gap(self):
        self.assertAlmostEqual(generalization_gap(.2,.5),.3)

if __name__=="__main__":unittest.main()
