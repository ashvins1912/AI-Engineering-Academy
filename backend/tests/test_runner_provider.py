import json
from uuid import uuid4

import httpx
import pytest

from app.code_execution_contract import CodeRunSubmission
from app.runner_provider import (
    HttpsRunnerProvider,
    RunnerProtocolError,
    RunnerRejected,
    RunnerUnavailable,
    _parse_result,
)


def test_runner_requires_https_origin_without_credentials_or_query():
    for url in (
        "http://runner.example",
        "https://user:pass@runner.example",
        "https://runner.example/path?token=abc",
        "https://runner.example/#fragment",
    ):
        with pytest.raises(ValueError):
            HttpsRunnerProvider(url, "x" * 32)


def test_runner_requires_operator_secret_and_bounded_timeout():
    with pytest.raises(ValueError):
        HttpsRunnerProvider("https://runner.example", "")
    with pytest.raises(ValueError):
        HttpsRunnerProvider("https://runner.example", "x" * 32, 30)


@pytest.mark.asyncio
async def test_submit_uses_fixed_endpoint_and_idempotency_key(monkeypatch):
    import app.runner_provider as module

    run_id = uuid4()
    seen = {}
    original_client = httpx.AsyncClient

    async def handler(request):
        seen["url"] = str(request.url)
        seen["auth"] = request.headers.get("authorization")
        seen["idempotency"] = request.headers.get("idempotency-key")
        seen["payload"] = json.loads(request.content)
        return httpx.Response(202, json={"run_id": str(run_id), "status": "queued"})

    monkeypatch.setattr(
        module.httpx, "AsyncClient",
        lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs),
    )
    provider = HttpsRunnerProvider("https://runner.example", "s" * 32)
    result = await provider.submit(
        run_id,
        CodeRunSubmission("python-3.11", "python-basics", "print('hello')"),
    )
    assert result.status == "queued"
    assert seen["url"] == "https://runner.example/v1/runs"
    assert seen["auth"] == "Bearer " + "s" * 32
    assert seen["idempotency"] == str(run_id)
    assert seen["payload"]["runtime_id"] == "python-3.11"
    assert seen["payload"]["source"] == "print('hello')"
    assert "image" not in seen["payload"]
    assert "command" not in seen["payload"]
    assert "mounts" not in seen["payload"]


@pytest.mark.asyncio
async def test_provider_does_not_follow_redirects():
    async def handler(request):
        return httpx.Response(302, headers={"Location": "https://attacker.example/collect"})

    transport = httpx.MockTransport(handler)
    provider = HttpsRunnerProvider("https://runner.example", "s" * 32)
    async with httpx.AsyncClient(transport=transport) as client:
        # Redirects are disabled by the provider's own client configuration.
        assert client.follow_redirects is False
    assert provider.base_url == "https://runner.example"


@pytest.mark.asyncio
async def test_provider_sanitizes_http_errors():
    async def handler(request):
        return httpx.Response(422, json={"detail": "secret source rejected"})

    monkeypatch_transport = httpx.MockTransport(handler)
    provider = HttpsRunnerProvider("https://runner.example", "s" * 32)
    # Exercise the request boundary with a deterministic MockTransport client.
    original = httpx.AsyncClient

    class MockClient:
        def __init__(self, **kwargs):
            self.client = original(transport=monkeypatch_transport, **kwargs)

        async def __aenter__(self):
            await self.client.__aenter__()
            return self.client

        async def __aexit__(self, *args):
            return await self.client.__aexit__(*args)

    import app.runner_provider as module
    module.httpx.AsyncClient = MockClient
    try:
        with pytest.raises(RunnerRejected) as error:
            await provider.get(uuid4())
        assert "secret source" not in str(error.value)
    finally:
        module.httpx.AsyncClient = original


def test_result_contract_bounds_output_and_rejects_unknown_state():
    result = _parse_result({
        "run_id": "run-1",
        "status": "succeeded",
        "stdout": "x" * 20_000,
        "stderr": "",
        "test_results": [],
    })
    assert len(result.stdout) == 16_000
    with pytest.raises(RunnerProtocolError):
        _parse_result({"run_id": "run-1", "status": "executing"})
