from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID
from urllib.parse import urlparse

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from starlette.concurrency import run_in_threadpool

from .config import get_settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    user_id: UUID
    tenant_id: UUID
    roles: tuple[str, ...]


@lru_cache(maxsize=1)
def _jwks_client(url: str) -> PyJWKClient:
    # PyJWT caches the JWKS response and refreshes it when a key id is not found.
    return PyJWKClient(url, cache_jwk_set=True, lifespan=300, timeout=5)


def _verification_key(token: str, settings):
    if settings.jwks_url:
        parsed = urlparse(settings.jwks_url)
        if parsed.scheme != "https" or not parsed.hostname:
            raise ValueError("JWKS URL must use HTTPS")
        return _jwks_client(settings.jwks_url).get_signing_key_from_jwt(token).key
    if settings.jwt_public_key:
        return settings.jwt_public_key
    raise ValueError("No trusted JWT verification key is configured")


async def current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Principal:
    settings = get_settings()
    if not credentials or not settings.jwt_issuer or not settings.jwt_audience:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid Academy identity token required",
        )
    try:
        key = await run_in_threadpool(_verification_key, credentials.credentials, settings)
        claims = jwt.decode(
            credentials.credentials,
            key,
            algorithms=["RS256"],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            options={"require": ["sub", "tenant_id", "iss", "aud", "exp", "iat"]},
            leeway=30,
        )
        user_id = UUID(str(claims["sub"]))
        tenant_id = UUID(str(claims["tenant_id"]))
        raw_roles = claims.get("roles", [])
        if isinstance(raw_roles, str):
            raw_roles = [raw_roles]
        if not isinstance(raw_roles, list) or any(not isinstance(role, str) for role in raw_roles):
            raise ValueError("Invalid roles claim")
        roles = tuple(sorted(set(role for role in raw_roles if role)))
        return Principal(user_id=user_id, tenant_id=tenant_id, roles=roles)
    except (jwt.PyJWTError, KeyError, ValueError, TypeError, OSError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired identity token",
        ) from None


def require_admin(principal: Principal = Depends(current_principal)) -> Principal:
    if not ({"tenant_admin", "platform_admin"} & set(principal.roles)):
        raise HTTPException(status_code=403, detail="Tenant administrator role required")
    return principal
