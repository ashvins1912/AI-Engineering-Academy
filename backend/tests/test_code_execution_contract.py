import unittest

from app.code_execution_contract import (
    ALLOWED_RUNTIME_IDS,
    MAX_SOURCE_BYTES,
    CodeRunSubmission,
    validate_submission,
)


class CodeExecutionContractTests(unittest.TestCase):
    def test_accepts_bounded_python_submission_metadata(self):
        request = CodeRunSubmission(
            runtime_id="python-3.11",
            lesson_id="python-data-processing",
            source="print('hello')",
            test_suite_id="python-basics-v1",
        )
        self.assertEqual(validate_submission(request), request)

    def test_runtime_is_allowlisted(self):
        for runtime in ("python:latest", "bash", "node", "../python"):
            with self.subTest(runtime=runtime):
                with self.assertRaisesRegex(ValueError, "Unsupported runtime"):
                    validate_submission(CodeRunSubmission(runtime, "lesson-one", "print(1)"))
        self.assertEqual(ALLOWED_RUNTIME_IDS, frozenset({"python-3.11"}))

    def test_source_must_be_nonempty_and_within_utf8_byte_limit(self):
        with self.assertRaisesRegex(ValueError, "required"):
            validate_submission(CodeRunSubmission("python-3.11", "lesson-one", "  "))
        with self.assertRaisesRegex(ValueError, "32 KiB"):
            validate_submission(CodeRunSubmission("python-3.11", "lesson-one", "x" * (MAX_SOURCE_BYTES + 1)))
        with self.assertRaisesRegex(ValueError, "32 KiB"):
            validate_submission(CodeRunSubmission("python-3.11", "lesson-one", "é" * (MAX_SOURCE_BYTES // 2 + 1)))

    def test_rejects_invalid_lesson_and_test_suite_ids(self):
        with self.assertRaisesRegex(ValueError, "lesson ID"):
            validate_submission(CodeRunSubmission("python-3.11", "../lesson", "print(1)"))
        with self.assertRaisesRegex(ValueError, "test suite ID"):
            validate_submission(CodeRunSubmission("python-3.11", "lesson-one", "print(1)", "../suite"))

    def test_contract_has_no_execution_controls(self):
        # The request shape intentionally has no shell, image, mounts, env or network fields.
        self.assertEqual(
            set(CodeRunSubmission.__dataclass_fields__),
            {"runtime_id", "lesson_id", "source", "test_suite_id"},
        )


if __name__ == "__main__":
    unittest.main()
