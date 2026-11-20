from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import ipaddress
import logging
import time

from sqlalchemy import text
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from .config import get_settings
from .db import engine

logger = logging.getLogger("academy.rate_limit")

_UPSERT_BUCKET = text("""
    INSERT INTO api_rate_limit_buckets
        (client_key, window_start, request_count, expires_at)
    VALUES
        (:client_key, :window_start, 1, :expires_at)
    ON CONFLICT (client_key, window_start)
    DO UPDATE SET request_count = LEAST(api_rate_limit_buckets.request_count + 1, :limit_plus_one)
    RETURNING request_count
""")
_DELETE_EXPIRED = text("DELETE FROM api_rate_limit_buckets WHERE expires_at < :now")


def _trusted_proxy(remote_ip: str, trusted_proxy_ips: set[str]) -> bool:
    try:
        address = ipaddress.ip_address(remote_ip)
    except ValueError:
        return False
    for configured in trusted_proxy_ips:
        try:
            if address in ipaddress.ip_network(configured, strict=False):
                return True
        except ValueError:
            continue
    return False


def resolve_client_ip(request: Request, trusted_proxy_ips: set[str] | None = None) -> str:
    """Trust X-Forwarded-For only when the immediate peer is explicitly trusted."""
    remote = request.client.host if request.client else "unknown"
    trusted = trusted_proxy_ips or set()
    try:
        normalized_remote = str(ipaddress.ip_address(remote))
    except ValueError:
        normalized_remote = remote
    if not _trusted_proxy(normalized_remote, trusted):
        return normalized_remote
    forwarded = request.headers.get("x-forwarded-for", "")
    candidate = forwarded.split(",", 1)[0].strip()
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return normalized_remote


def rate_limit_client_key(client_ip: str) -> str:
    """Persist only a one-way digest, not the caller's raw IP address."""
    return sha256(client_ip.encode("utf-8")).hexdigest()


class PostgresRateLimitMiddleware(BaseHTTPMiddleware):
    """Atomic, shared fixed-window rate limiter backed by PostgreSQL."""

    def __init__(
        self,
        app,
        database_engine=None,
        limit: int | None = None,
        trusted_proxy_ips: str | None = None,
        cleanup_every: int = 500,
    ):
        super().__init__(app)
        settings = get_settings()
        self.database_engine = database_engine or engine
        self.limit = limit if limit is not None else settings.rate_limit_per_minute
        raw_proxies = trusted_proxy_ips if trusted_proxy_ips is not None else settings.trusted_proxy_ips
        self.trusted_proxy_ips = {
            str(ipaddress.ip_address(value.strip()))
            for value in raw_proxies.split(",")
            if value.strip()
        }
        self.cleanup_every = max(1, cleanup_every)
        self.request_count = 0

    async def dispatch(self, request: Request, call_next):
        if request.url.path in {"/health/live", "/health/ready"}:
            return await call_next(request)
        if self.limit < 1:
            return JSONResponse({"detail": "Rate limiter is misconfigured"}, status_code=503)
        client_ip = resolve_client_ip(request, self.trusted_proxy_ips)
        client_key = rate_limit_client_key(client_ip)
        now = datetime.now(timezone.utc)
        window_epoch = int(now.timestamp() // 60) * 60
        window_start = datetime.fromtimestamp(window_epoch, timezone.utc)
        expires_at = window_start + timedelta(minutes=2)
        try:
            async with self.database_engine.begin() as connection:
                result = await connection.execute(
                    _UPSERT_BUCKET,
                    {
                        "client_key": client_key,
                        "window_start": window_start,
                        "expires_at": expires_at,
                        "limit_plus_one": self.limit + 1,
                    },
                )
                count = int(result.scalar_one())
                self.request_count += 1
                if self.request_count % self.cleanup_every == 0:
                    await connection.execute(_DELETE_EXPIRED, {"now": now})
        except Exception:
            logger.exception("postgres_rate_limit_unavailable")
            # Fail closed: never silently fall back to a per-process limit in production.
            return JSONResponse({"detail": "Rate limiting service unavailable"}, status_code=503)
        if count > self.limit:
            retry_after = max(1, int(expires_at.timestamp() - now.timestamp()) - 60)
            return JSONResponse(
                {"detail": "Rate limit exceeded"},
                status_code=429,
                headers={"Retry-After": str(retry_after)},
            )
        return await call_next(request)
