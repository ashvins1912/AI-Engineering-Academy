from contextlib import asynccontextmanager
from types import SimpleNamespace

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.middleware import PostgresRateLimitMiddleware, rate_limit_client_key, resolve_client_ip


def _request(remote: str, headers: dict[str, str] | None = None):
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/",
        "raw_path": b"/",
        "query_string": b"",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "client": (remote, 12345),
        "server": ("testserver", 80),
    }
    return Request(scope)


class FakeResult:
    def __init__(self, count):
        self.count = count

    def scalar_one(self):
        return self.count


class FakeConnection:
    def __init__(self):
        self.count = 0
        self.statements = []

    async def execute(self, statement, params):
        self.statements.append(str(statement))
        if "INSERT INTO api_rate_limit_buckets" in str(statement):
            self.count = min(self.count + 1, params["limit_plus_one"])
            return FakeResult(self.count)
        return FakeResult(0)


class FakeEngine:
    def __init__(self):
        self.connection = FakeConnection()

    @asynccontextmanager
    async def begin(self):
        yield self.connection


def test_forwarded_ip_is_ignored_from_untrusted_peer():
    request = _request("198.51.100.10", {"x-forwarded-for": "203.0.113.5"})
    assert resolve_client_ip(request, {"192.0.2.1"}) == "198.51.100.10"


def test_forwarded_ip_is_used_only_from_trusted_peer():
    request = _request("192.0.2.1", {"x-forwarded-for": "203.0.113.5, 198.51.100.7"})
    assert resolve_client_ip(request, {"192.0.2.1"}) == "203.0.113.5"


def test_trusted_proxy_cidr_is_supported():
    request = _request("10.2.3.4", {"x-forwarded-for": "203.0.113.8"})
    assert resolve_client_ip(request, {"10.0.0.0/8"}) == "203.0.113.8"


def test_middleware_accepts_trusted_proxy_cidr_configuration():
    fake = FakeEngine()
    app = FastAPI()

    @app.get("/resource")
    async def resource(request: Request):
        return {"client": request.client.host}

    app.add_middleware(
        PostgresRateLimitMiddleware,
        database_engine=fake,
        limit=2,
        trusted_proxy_ips="10.0.0.0/8",
    )
    response = TestClient(app).get("/resource", headers={"x-forwarded-for": "203.0.113.9"})
    assert response.status_code == 200


def test_malformed_forwarded_ip_falls_back_to_trusted_peer():
    request = _request("192.0.2.1", {"x-forwarded-for": "not-an-ip"})
    assert resolve_client_ip(request, {"192.0.2.1"}) == "192.0.2.1"


def test_rate_limit_key_is_hashed_not_raw_address():
    digest = rate_limit_client_key("203.0.113.5")
    assert len(digest) == 64
    assert "203.0.113.5" not in digest


def test_postgres_rate_limiter_is_shared_and_enforces_limit():
    fake = FakeEngine()
    app = FastAPI()

    @app.get("/resource")
    async def resource():
        return {"ok": True}

    app.add_middleware(
        PostgresRateLimitMiddleware,
        database_engine=fake,
        limit=2,
        trusted_proxy_ips="",
        cleanup_every=100,
    )
    client = TestClient(app)
    assert client.get("/resource").status_code == 200
    assert client.get("/resource").status_code == 200
    blocked = client.get("/resource")
    assert blocked.status_code == 429
    assert blocked.headers["retry-after"].isdigit()


def test_postgres_rate_limiter_fails_closed_when_database_is_down():
    class BrokenEngine:
        @asynccontextmanager
        async def begin(self):
            raise RuntimeError("database unavailable")
            yield

    app = FastAPI()

    @app.get("/resource")
    async def resource():
        return {"ok": True}

    app.add_middleware(PostgresRateLimitMiddleware, database_engine=BrokenEngine(), limit=2)
    response = TestClient(app).get("/resource")
    assert response.status_code == 503
