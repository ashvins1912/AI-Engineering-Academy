"""Strict submission contract for the future isolated code-runner adapter.

This module validates metadata only. It deliberately does not execute source code,
spawn processes, import learner modules, or make network requests.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

MAX_SOURCE_BYTES = 32 * 1024
ALLOWED_RUNTIME_IDS = frozenset({"python-3.11"})
LESSON_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,119}$")
TEST_SUITE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,79}$")


@dataclass(frozen=True)
class CodeRunSubmission:
    runtime_id: str
    lesson_id: str
    source: str
    test_suite_id: str | None = None


def validate_submission(submission: CodeRunSubmission) -> CodeRunSubmission:
    """Validate a bounded, allowlisted request without executing learner code."""
    if submission.runtime_id not in ALLOWED_RUNTIME_IDS:
        raise ValueError("Unsupported runtime")
    if not LESSON_ID_PATTERN.fullmatch(submission.lesson_id):
        raise ValueError("Invalid lesson ID")
    if not isinstance(submission.source, str) or not submission.source.strip():
        raise ValueError("Source code is required")
    if len(submission.source.encode("utf-8")) > MAX_SOURCE_BYTES:
        raise ValueError("Source code exceeds the 32 KiB limit")
    if submission.test_suite_id is not None and not TEST_SUITE_ID_PATTERN.fullmatch(submission.test_suite_id):
        raise ValueError("Invalid test suite ID")
    return submission
