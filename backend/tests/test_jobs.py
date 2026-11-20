import unittest

from app.jobs import can_claim_job, retry_delay_seconds


class IngestionJobPolicyTests(unittest.TestCase):
    def test_exponential_retry_backoff_is_bounded(self):
        self.assertEqual(retry_delay_seconds(1), 5)
        self.assertEqual(retry_delay_seconds(2), 10)
        self.assertEqual(retry_delay_seconds(3), 20)
        self.assertEqual(retry_delay_seconds(20), 3600)

    def test_tenant_concurrency_quota_allows_only_available_slots(self):
        self.assertTrue(can_claim_job(0, 1))
        self.assertFalse(can_claim_job(1, 1))
        self.assertTrue(can_claim_job(1, 2))
        self.assertFalse(can_claim_job(2, 2))

    def test_tenant_concurrency_quota_rejects_invalid_values(self):
        for active, limit in ((-1, 1), (0, 0)):
            with self.subTest(active=active, limit=limit), self.assertRaises(ValueError):
                can_claim_job(active, limit)

    def test_retry_backoff_rejects_invalid_attempt(self):
        with self.assertRaisesRegex(ValueError, "invalid"):
            retry_delay_seconds(0)

    def test_retry_backoff_rejects_inconsistent_bounds(self):
        with self.assertRaisesRegex(ValueError, "invalid"):
            retry_delay_seconds(1, base_seconds=10, max_seconds=5)


if __name__ == "__main__":
    unittest.main()
