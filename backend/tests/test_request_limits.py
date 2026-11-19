from types import SimpleNamespace

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app import request_limits


def test_declared_oversized_body_is_rejected_before_endpoint(monkeypatch):
    monkeypatch.setattr(request_limits, "get_settings", lambda: SimpleNamespace(max_request_bytes=4))
    app = FastAPI()

    @app.post("/upload")
    async def upload(request: Request):
        return {"bytes": len(await request.body())}

    app.add_middleware(request_limits.RequestBodyLimitMiddleware)
    response = TestClient(app).post("/upload", content=b"12345")
    assert response.status_code == 413
