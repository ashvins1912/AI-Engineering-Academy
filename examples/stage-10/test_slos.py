import importlib.util
from pathlib import Path
import sys
import unittest

MODULE_PATH = Path(__file__).parent / "slos" / "reliability_engine.py"
spec = importlib.util.spec_from_file_location("slos_reliability_engine", MODULE_PATH)
reliability = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = reliability
spec.loader.exec_module(reliability)

RequestEvent = reliability.RequestEvent
calculate_sli = reliability.calculate_sli
calculate_error_budget = reliability.calculate_error_budget
calculate_burn_rate = reliability.calculate_burn_rate
retry_delays = reliability.retry_delays
CircuitBreaker = reliability.CircuitBreaker
choose_fallback = reliability.choose_fallback


class SloReliabilityTests(unittest.TestCase):
    def test_availability_and_latency_sli(self):
        events = [RequestEvent(True, 1800) for _ in range(995)] + [RequestEvent(False, 2500) for _ in range(5)]
        result = calculate_sli(events, 2000)
        self.assertEqual(result["eligible"], 1000)
        self.assertEqual(result["good"], 995)
        self.assertEqual(result["availability"], 0.995)
        self.assertEqual(result["latency_compliant"], 0.995)
        self.assertEqual(result["p95_ms"], 1800)

    def test_ineligible_events_excluded_by_explicit_flag(self):
        events = [RequestEvent(True, 100), RequestEvent(False, 9000, eligible=False)]
        self.assertEqual(calculate_sli(events, 1000)["eligible"], 1)

    def test_empty_denominator_rejected(self):
        with self.assertRaisesRegex(ValueError, "EMPTY_SLI_DENOMINATOR"):
            calculate_sli([RequestEvent(True, 10, eligible=False)], 100)

    def test_invalid_latency_rejected(self):
        with self.assertRaisesRegex(ValueError, "INVALID_LATENCY"):
            calculate_sli([RequestEvent(True, -1)], 100)

    def test_invalid_latency_target_rejected(self):
        with self.assertRaisesRegex(ValueError, "INVALID_LATENCY_TARGET"):
            calculate_sli([RequestEvent(True, 1)], 0)

    def test_error_budget_exactly_consumed(self):
        result = calculate_error_budget(1000, 995, 0.995)
        self.assertEqual(result["allowed_bad"], 5)
        self.assertEqual(result["observed_bad"], 5)
        self.assertEqual(result["consumption"], 1)
        self.assertTrue(result["exhausted"])

    def test_error_budget_overrun(self):
        result = calculate_error_budget(1000, 990, 0.995)
        self.assertEqual(result["consumption"], 2)
        self.assertEqual(result["remaining_bad"], 0)

    def test_invalid_error_budget_inputs(self):
        for args in ((0, 0, 0.99), (10, 11, 0.99), (10, 5, 0), (10, 5, 1.1)):
            with self.subTest(args=args), self.assertRaisesRegex(ValueError, "INVALID_SLI_INPUT"):
                calculate_error_budget(*args)

    def test_burn_rate(self):
        self.assertEqual(calculate_burn_rate(0.02, 0.995), 4.0)

    def test_invalid_burn_rate(self):
        with self.assertRaisesRegex(ValueError, "INVALID_BURN_RATE_INPUT"):
            calculate_burn_rate(0.2, 1.0)

    def test_retry_backoff_is_bounded_and_jittered(self):
        self.assertEqual(retry_delays(5, 100, 500, 0.25), [75, 150, 300, 375])

    def test_retry_single_attempt_has_no_delays(self):
        self.assertEqual(retry_delays(1, 100, 1000), [])

    def test_invalid_retry_policy(self):
        with self.assertRaisesRegex(ValueError, "INVALID_RETRY_POLICY"):
            retry_delays(0, 100, 1000)

    def test_breaker_opens_after_threshold(self):
        breaker = CircuitBreaker(failure_threshold=3, cooldown_ms=100)
        breaker.record_failure(0)
        breaker.record_failure(1)
        self.assertEqual(breaker.state, "CLOSED")
        breaker.record_failure(2)
        self.assertEqual(breaker.state, "OPEN")
        self.assertFalse(breaker.allow_request(50))

    def test_breaker_half_open_probe_and_recovery(self):
        breaker = CircuitBreaker(failure_threshold=1, cooldown_ms=100)
        breaker.record_failure(0)
        self.assertTrue(breaker.allow_request(100))
        self.assertEqual(breaker.state, "HALF_OPEN")
        self.assertFalse(breaker.allow_request(101))
        breaker.record_success(102)
        self.assertEqual(breaker.state, "CLOSED")
        self.assertTrue(breaker.allow_request(103))

    def test_failed_half_open_probe_reopens_breaker(self):
        breaker = CircuitBreaker(failure_threshold=1, cooldown_ms=10)
        breaker.record_failure(0)
        self.assertTrue(breaker.allow_request(10))
        breaker.record_failure(11)
        self.assertEqual(breaker.state, "OPEN")
        self.assertFalse(breaker.allow_request(12))

    def test_fallback_prefers_model_when_available(self):
        self.assertEqual(choose_fallback(True, False, False, False), "MODEL_RESPONSE")

    def test_fallback_uses_fresh_authorized_cache(self):
        self.assertEqual(choose_fallback(False, True, True, True), "CACHED_RESPONSE_DEGRADED")

    def test_fallback_rejects_stale_or_unauthorized_cache(self):
        self.assertEqual(choose_fallback(False, True, False, True), "RETRIEVAL_ONLY_WITH_CITATIONS")
        self.assertEqual(choose_fallback(False, True, True, False), "RETRIEVAL_ONLY_WITH_CITATIONS")

    def test_fallback_without_evidence_is_unavailable(self):
        self.assertEqual(choose_fallback(False, False, False, False), "SAFE_UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
