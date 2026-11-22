"""Authenticated adapter for a separately isolated Python execution service.

The Academy API never starts learner processes. This adapter only communicates
with a configured HTTPS runner service and is disabled unless explicitly enabled.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

import httpx

from .code_execution_contract import CodeRunSubmission, validate_submission


class RunnerError(RuntimeError):
    """Base class for sanitized runner integration failures."""


class RunnerUnavailable(RunnerError):
    pass


class RunnerRejected(RunnerError):
    pass


class RunnerProtocolError(RunnerError):
    pass


@dataclass(frozen=True)
class RunnerResult:
    provider_run_id: str
    status: str
    stdout: str = ""
    stderr: str = ""
    exit_code: int | None = None
    duration_ms: int | None = None
    test_results: tuple[dict[str, Any], ...] = ()


_ALLOWED_STATES = frozenset({"queued", "running", "succeeded", "failed", "timed_out", "resource_limited"})
_MAX_OUTPUT_CHARS = 16_000
_MAX_TESTS = 100
_MAX_RESPONSE_BYTES = 128 * 1024


def _validate_base_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.path not in ("", "/"):
        raise ValueError("Runner URL must be an HTTPS origin without embedded credentials")
    if parsed.query or parsed.fragment:
        raise ValueError("Runner URL cannot contain a query or fragment")
    return value.rstrip("/")


def _parse_result(payload: Any) -> RunnerResult:
    if not isinstance(payload, dict):
        raise RunnerProtocolError("Runner returned an invalid response")
    run_id = payload.get("run_id")
    status = payload.get("status")
    if not isinstance(run_id, str) or not run_id or len(run_id) > 128:
        raise RunnerProtocolError("Runner response has an invalid run ID")
    if not isinstance(status, str) or status not in _ALLOWED_STATES:
        raise RunnerProtocolError("Runner response has an unknown state")
    stdout = payload.get("stdout", "")
    stderr = payload.get("stderr", "")
    if not isinstance(stdout, str) or not isinstance(stderr, str):
        raise RunnerProtocolError("Runner response output must be text")
    tests = payload.get("test_results", [])
    if not isinstance(tests, list) or len(tests) > _MAX_TESTS or any(not isinstance(item, dict) for item in tests):
        raise RunnerProtocolError("Runner response has invalid test results")
    exit_code = payload.get("exit_code")
    duration_ms = payload.get("duration_ms")
    if exit_code is not None and (not isinstance(exit_code, int) or isinstance(exit_code, bool)):
        raise RunnerProtocolError("Runner response has an invalid exit code")
    if duration_ms is not None and (not isinstance(duration_ms, int) or isinstance(duration_ms, bool) or duration_ms < 0):
        raise RunnerProtocolError("Runner response has an invalid duration")
    return RunnerResult(
        provider_run_id=run_id,
        status=status,
        stdout=stdout[:_MAX_OUTPUT_CHARS],
        stderr=stderr[:_MAX_OUTPUT_CHARS],
        exit_code=exit_code,
        duration_ms=duration_ms,
        test_results=tuple(tests),
    )


class HttpsRunnerProvider:
    """Thin client for an independently deployed, sandboxed runner.

    The service URL and bearer token are operator configuration only. The
    learner cannot choose a host, runtime image, command, mounts or environment.
    """

    def __init__(self, base_url: str, token: str, timeout_seconds: float = 5.0):
        self.base_url = _validate_base_url(base_url)
        if not token or len(token) < 24:
            raise ValueError("Runner service token is not configured securely")
        if not 1 <= timeout_seconds <= 15:
            raise ValueError("Runner timeout must be between 1 and 15 seconds")
        self._token = token
        self._timeout = timeout_seconds

    async def submit(self, run_id: UUID, submission: CodeRunSubmission) -> RunnerResult:
        validated = validate_submission(submission)
        payload = {
            "run_id": str(run_id),
            "runtime_id": validated.runtime_id,
            "lesson_id": validated.lesson_id,
            "source": validated.source,
            "test_suite_id": validated.test_suite_id,
        }
        result = await self._request(
            "POST", "/v1/runs", json=payload,
            headers={"Idempotency-Key": str(run_id)},
        )
        parsed = _parse_result(result)
        if parsed.provider_run_id != str(run_id):
            raise RunnerProtocolError("Runner did not preserve the idempotency run ID")
        return parsed

    async def get(self, run_id: UUID) -> RunnerResult:
        parsed = _parse_result(await self._request("GET", f"/v1/runs/{run_id}"))
        if parsed.provider_run_id != str(run_id):
            raise RunnerProtocolError("Runner returned a mismatched run ID")
        return parsed

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {self._token}", **kwargs.pop("headers", {})}
        body = bytearray()
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self._timeout),
                follow_redirects=False,
                trust_env=False,
            ) as client:
                async with client.stream(
                    method, self.base_url + path, headers=headers, **kwargs,
                ) as response:
                    if response.status_code in (401, 403, 409, 413, 422):
                        raise RunnerRejected("Isolated runner rejected the request")
                    if response.status_code < 200 or response.status_code >= 300:
                        raise RunnerUnavailable("Isolated runner service returned an unavailable response")
                    declared_length = response.headers.get("content-length")
                    if declared_length is not None:
                        try:
                            if int(declared_length) > _MAX_RESPONSE_BYTES:
                                raise RunnerProtocolError("Runner response exceeded the response-size limit")
                        except ValueError:
                            raise RunnerProtocolError("Runner returned an invalid content length") from None
                    async for chunk in response.aiter_bytes(chunk_size=16 * 1024):
                        if len(body) + len(chunk) > _MAX_RESPONSE_BYTES:
                            raise RunnerProtocolError("Runner response exceeded the response-size limit")
                        body.extend(chunk)
        except (httpx.TimeoutException, httpx.NetworkError):
            raise RunnerUnavailable("Isolated runner service is unavailable") from None
        try:
            payload = json.loads(body)
        except (ValueError, UnicodeDecodeError):
            raise RunnerProtocolError("Runner returned invalid JSON") from None
        if not isinstance(payload, dict):
            raise RunnerProtocolError("Runner returned an invalid response")
        return payload
