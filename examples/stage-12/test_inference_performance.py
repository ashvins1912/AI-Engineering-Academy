import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).parent / "inference_performance"
sys.path.insert(0, str(ROOT))
from inference_simulator import (
    InferenceSimulator, ModelProfile, PrefixCache, Request, ServingConfig,
)
from serving_policy import CapacityGuard
from capacity_planner import (
    PagedKVAllocator, TenantFairScheduler, little_law, plan_capacity, versioned_prefix_key,
)


class CapacityPlanningTests(unittest.TestCase):
    def test_capacity_plan_estimates_concurrency_and_utilization(self):
        simulator = InferenceSimulator(ModelProfile(32, 8, 128), ServingConfig(decode_tokens_per_second=50))
        plan = plan_capacity(simulator, total_memory_mb=8192, model_weights_mb=2048,
                             runtime_reserve_mb=1024, max_sequence_tokens=4096,
                             arrival_rate_rps=0.2, average_output_tokens=100,
                             average_latency_ms=1000)
        self.assertEqual(plan.kv_bytes_per_sequence, 512 * 1024 * 1024)
        self.assertEqual(plan.max_concurrent_sequences, 10)
        self.assertAlmostEqual(plan.estimated_service_rate_rps, 0.5)
        self.assertAlmostEqual(plan.estimated_utilization, 0.4)
        self.assertAlmostEqual(plan.little_law_concurrency, 0.2)
        self.assertFalse(plan.overload_risk)

    def test_capacity_plan_flags_overload_and_invalid_memory(self):
        simulator = InferenceSimulator(config=ServingConfig(decode_tokens_per_second=10))
        plan = plan_capacity(simulator, total_memory_mb=4096, model_weights_mb=1024,
                             runtime_reserve_mb=512, max_sequence_tokens=1024,
                             arrival_rate_rps=1.0, average_output_tokens=100,
                             average_latency_ms=2000)
        self.assertTrue(plan.overload_risk)
        with self.assertRaisesRegex(ValueError, "CAPACITY_PLAN_INPUT_INVALID"):
            plan_capacity(simulator, total_memory_mb=100, model_weights_mb=80,
                          runtime_reserve_mb=30, max_sequence_tokens=1024,
                          arrival_rate_rps=1, average_output_tokens=100, average_latency_ms=100)

    def test_little_law_and_versioned_prefix_cache_key(self):
        self.assertAlmostEqual(little_law(2.0, 500), 1.0)
        base = versioned_prefix_key("tenant-A", "model-v1", "prompt-v1", "policy-v1", "system")
        self.assertNotEqual(base, versioned_prefix_key("tenant-B", "model-v1", "prompt-v1", "policy-v1", "system"))
        self.assertNotEqual(base, versioned_prefix_key("tenant-A", "model-v2", "prompt-v1", "policy-v1", "system"))
        self.assertNotEqual(base, versioned_prefix_key("tenant-A", "model-v1", "prompt-v1", "policy-v2", "system"))

    def test_tenant_fair_scheduler_round_robins_busy_tenant(self):
        scheduler = TenantFairScheduler(max_queue=8)
        for request in [
            Request("a1", "A", 10, 10), Request("a2", "A", 10, 10),
            Request("a3", "A", 10, 10), Request("b1", "B", 10, 10),
            Request("c1", "C", 10, 10),
        ]:
            self.assertTrue(scheduler.submit(request))
        batch = scheduler.next_batch(3)
        self.assertEqual([request.request_id for request in batch], ["a1", "b1", "c1"])
        self.assertEqual(scheduler.queue_depth, 2)

    def test_fair_scheduler_queue_is_bounded(self):
        scheduler = TenantFairScheduler(max_queue=1)
        self.assertTrue(scheduler.submit(Request("a", "A", 1, 1)))
        self.assertFalse(scheduler.submit(Request("b", "B", 1, 1)))
        self.assertEqual(scheduler.queue_depth, 1)

    def test_paged_kv_allocator_tracks_allocation_and_release(self):
        allocator = PagedKVAllocator(total_pages=4, page_size_tokens=16)
        self.assertEqual(allocator.allocate("r1", 17), 2)
        self.assertEqual(allocator.allocate("r2", 16), 1)
        self.assertEqual(allocator.free_pages, 1)
        with self.assertRaisesRegex(MemoryError, "KV_PAGES_EXHAUSTED"):
            allocator.allocate("r3", 32)
        self.assertEqual(allocator.release("r1"), 2)
        self.assertEqual(allocator.free_pages, 3)

class MemoryAndConfigurationTests(unittest.TestCase):
    def test_kv_cache_memory_formula_matches_hand_calculation(self):
        simulator = InferenceSimulator(ModelProfile(32, 8, 128), ServingConfig())
        self.assertEqual(simulator.kv_cache_bytes(4096), 512 * 1024 * 1024)
        self.assertEqual(simulator.kv_cache_bytes(4096, 2), 1024 * 1024 * 1024)

    def test_quantized_kv_cache_uses_fewer_bytes(self):
        fp16 = InferenceSimulator(config=ServingConfig(quantization_bits=16))
        int8 = InferenceSimulator(config=ServingConfig(quantization_bits=8))
        int4 = InferenceSimulator(config=ServingConfig(quantization_bits=4))
        self.assertEqual(fp16.kv_cache_bytes(100), int8.kv_cache_bytes(100) * 2)
        self.assertEqual(int8.kv_cache_bytes(100), int4.kv_cache_bytes(100) * 2)

    def test_invalid_model_and_serving_configuration_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "MODEL_DIMENSIONS_INVALID"):
            ModelProfile(0, 8, 128)
        with self.assertRaisesRegex(ValueError, "QUANTIZATION_BITS_UNSUPPORTED"):
            ServingConfig(quantization_bits=3)
        with self.assertRaisesRegex(ValueError, "SPECULATIVE_CONFIG_INVALID"):
            ServingConfig(speculative_acceptance_rate=1.2)

    def test_invalid_kv_cache_dimensions_are_rejected(self):
        simulator = InferenceSimulator()
        with self.assertRaisesRegex(ValueError, "KV_CACHE_DIMENSION_INVALID"):
            simulator.kv_cache_bytes(-1)


class LatencyAndOptimizationTests(unittest.TestCase):
    def test_prefill_and_decode_are_reported_separately(self):
        simulator = InferenceSimulator(config=ServingConfig(
            prefill_tokens_per_second=1000, decode_tokens_per_second=100,
            max_context_tokens=4096,
        ))
        result = simulator.estimate(Request("r1", "A", 1000, 100))
        self.assertEqual(result.ttft_ms, 1000)
        self.assertEqual(result.decode_ms, 1000)
        self.assertEqual(result.total_latency_ms, 2000)

    def test_speculative_decoding_depends_on_acceptance_rate(self):
        baseline = InferenceSimulator(config=ServingConfig(decode_tokens_per_second=50))
        speculative = InferenceSimulator(config=ServingConfig(
            decode_tokens_per_second=50, speculative_acceptance_rate=1.0, draft_speedup=2.0,
        ))
        self.assertEqual(baseline.effective_decode_tokens_per_second, 50)
        self.assertEqual(speculative.effective_decode_tokens_per_second, 100)

    def test_quantization_quality_penalty_is_explicit(self):
        four = InferenceSimulator(config=ServingConfig(quantization_bits=4))
        eight = InferenceSimulator(config=ServingConfig(quantization_bits=8))
        sixteen = InferenceSimulator(config=ServingConfig(quantization_bits=16))
        request = Request("r1", "A", 10, 10)
        self.assertGreater(four.estimate(request).quality_penalty, eight.estimate(request).quality_penalty)
        self.assertGreater(eight.estimate(request).quality_penalty, sixteen.estimate(request).quality_penalty)

    def test_prefix_cache_is_tenant_scoped_and_reduces_prefill(self):
        cache = PrefixCache(capacity=4)
        simulator = InferenceSimulator(prefix_cache=cache)
        request_a = Request("a1", "tenant-A", 1000, 10, prefix_key="system-v1", prefix_tokens=300)
        first = simulator.estimate(request_a)
        second = simulator.estimate(Request("a2", "tenant-A", 1000, 10, prefix_key="system-v1", prefix_tokens=300))
        other_tenant = simulator.estimate(Request("b1", "tenant-B", 1000, 10, prefix_key="system-v1", prefix_tokens=300))
        self.assertFalse(first.prefix_cache_hit)
        self.assertTrue(second.prefix_cache_hit)
        self.assertEqual(second.effective_prompt_tokens, 700)
        self.assertFalse(other_tenant.prefix_cache_hit)

    def test_context_window_and_deadline_are_enforced(self):
        simulator = InferenceSimulator(config=ServingConfig(max_context_tokens=100))
        with self.assertRaisesRegex(ValueError, "CONTEXT_WINDOW_EXCEEDED"):
            simulator.estimate(Request("too-long", "A", 80, 30))
        slow = InferenceSimulator(config=ServingConfig(prefill_tokens_per_second=10,
                                                       decode_tokens_per_second=1))
        result = slow.estimate(Request("late", "A", 100, 100, deadline_ms=1000))
        self.assertTrue(result.deadline_missed)


class SchedulingAndAdmissionTests(unittest.TestCase):
    def test_batch_size_is_bounded(self):
        simulator = InferenceSimulator(config=ServingConfig(max_batch_size=2))
        batch = [Request(str(i), "A", 10, 10) for i in range(3)]
        with self.assertRaisesRegex(ValueError, "MAX_BATCH_SIZE_EXCEEDED"):
            simulator.simulate_batch(batch)

    def test_kv_budget_exhaustion_is_rejected(self):
        simulator = InferenceSimulator(config=ServingConfig(
            max_batch_size=2, kv_memory_budget_mb=512, max_context_tokens=8192,
        ))
        batch = [Request("a", "A", 2048, 2048), Request("b", "A", 2048, 2048)]
        with self.assertRaisesRegex(MemoryError, "KV_CACHE_BUDGET_EXCEEDED"):
            simulator.simulate_batch(batch)

    def test_workload_queue_capacity_and_throughput_are_reported(self):
        simulator = InferenceSimulator(config=ServingConfig(max_batch_size=2, max_queue=2))
        requests = [Request("a", "A", 100, 20, arrival_ms=0),
                    Request("b", "A", 100, 20, arrival_ms=1),
                    Request("c", "B", 100, 20, arrival_ms=2)]
        report = simulator.simulate_workload(requests)
        self.assertEqual(report["accepted"], 2)
        self.assertEqual(report["rejected"][0]["reason"], "QUEUE_CAPACITY_EXCEEDED")
        self.assertGreater(report["throughput_tokens_per_second"], 0)

    def test_batch_queue_wait_is_visible(self):
        simulator = InferenceSimulator(config=ServingConfig(max_batch_size=2))
        batch = [Request("early", "A", 100, 10, arrival_ms=0),
                 Request("late", "A", 100, 10, arrival_ms=50)]
        results = simulator.simulate_batch(batch)
        self.assertEqual(results[0].queue_wait_ms, 50)
        self.assertEqual(results[1].queue_wait_ms, 0)

    def test_capacity_guard_fails_closed_before_batch_execution(self):
        simulator = InferenceSimulator(config=ServingConfig(max_batch_size=2, max_queue=2))
        guard = CapacityGuard(simulator)
        requests = [Request("a", "A", 10, 10), Request("b", "A", 10, 10)]
        self.assertTrue(guard.admit_batch(requests).admitted)
        self.assertEqual(guard.admit_batch(requests, queue_depth=1).reason, "QUEUE_CAPACITY_EXCEEDED")
        self.assertEqual(guard.admit_batch(requests + [Request("c", "A", 10, 10)]).reason,
                         "QUEUE_CAPACITY_EXCEEDED")

    def test_capacity_guard_enforces_per_tenant_concurrency(self):
        simulator = InferenceSimulator(config=ServingConfig(max_batch_size=4, max_queue=8))
        guard = CapacityGuard(simulator)
        requests = [Request("a1", "A", 10, 10), Request("a2", "A", 10, 10)]
        decision = guard.admit_batch(requests, active_by_tenant={"A": 1}, max_active_per_tenant=2)
        self.assertFalse(decision.admitted)
        self.assertEqual(decision.reason, "TENANT_CONCURRENCY_LIMIT")

    def test_capacity_guard_rejects_unachievable_deadline(self):
        simulator = InferenceSimulator(config=ServingConfig(
            prefill_tokens_per_second=10, decode_tokens_per_second=1,
        ))
        guard = CapacityGuard(simulator)
        decision = guard.admit_batch([Request("late", "A", 100, 100, deadline_ms=100)])
        self.assertFalse(decision.admitted)
        self.assertEqual(decision.reason, "DEADLINE_UNACHIEVABLE")

    def test_request_validation_rejects_negative_values(self):
        simulator = InferenceSimulator()
        with self.assertRaisesRegex(ValueError, "REQUEST_INPUT_INVALID"):
            simulator.estimate(Request("bad", "A", -1, 10))


if __name__ == "__main__":
    unittest.main()
