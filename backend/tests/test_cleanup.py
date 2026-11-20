import unittest
from datetime import datetime, timezone

from app.jobs import retention_cutoff


class RawObjectRetentionPolicyTests(unittest.TestCase):
    def test_cutoff_is_timezone_aware_and_respects_retention(self):
        now = datetime(2026, 11, 20, 12, 0, tzinfo=timezone.utc)
        self.assertEqual(
            retention_cutoff(30, now),
            datetime(2026, 10, 21, 12, 0, tzinfo=timezone.utc),
        )

    def test_cutoff_rejects_zero_or_negative_days(self):
        for days in (0, -1):
            with self.subTest(days=days), self.assertRaisesRegex(ValueError, "at least one"):
                retention_cutoff(days)

    def test_cutoff_rejects_naive_datetime(self):
        with self.assertRaisesRegex(ValueError, "timezone-aware"):
            retention_cutoff(30, datetime(2026, 11, 20, 12, 0))


if __name__ == "__main__":
    unittest.main()
