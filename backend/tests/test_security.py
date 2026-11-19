import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app import security


def test_principal_contains_tenant_identity():
    tenant, user = uuid4(), uuid4()
    principal = security.Principal(user_id=user, tenant_id=tenant, roles=("learner",))
    assert principal.tenant_id == tenant
    assert principal.user_id == user
    assert "tenant_admin" not in principal.roles


def test_rs256_identity_token_is_accepted_and_roles_are_normalized(monkeypatch):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    user_id, tenant_id = uuid4(), uuid4()
    now = datetime.now(timezone.utc)
    token = jwt.encode({
        "sub": str(user_id), "tenant_id": str(tenant_id), "iss": "https://identity.example",
        "aud": "academy", "iat": now, "exp": now + timedelta(minutes=5),
        "roles": ["learner", "learner", "tenant_admin"],
    }, private_key, algorithm="RS256")
    settings = SimpleNamespace(jwt_issuer="https://identity.example", jwt_audience="academy")
    monkeypatch.setattr(security, "get_settings", lambda: settings)
    monkeypatch.setattr(security, "_verification_key", lambda _token, _settings: public_key)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    principal = asyncio.run(security.current_principal(credentials))
    assert principal.user_id == user_id
    assert principal.tenant_id == tenant_id
    assert principal.roles == ("learner", "tenant_admin")


def test_hs256_token_is_rejected(monkeypatch):
    secret = "not-a-production-secret"
    now = datetime.now(timezone.utc)
    token = jwt.encode({
        "sub": str(uuid4()), "tenant_id": str(uuid4()), "iss": "https://identity.example",
        "aud": "academy", "iat": now, "exp": now + timedelta(minutes=5),
    }, secret, algorithm="HS256")
    settings = SimpleNamespace(jwt_issuer="https://identity.example", jwt_audience="academy")
    monkeypatch.setattr(security, "get_settings", lambda: settings)
    monkeypatch.setattr(security, "_verification_key", lambda _token, _settings: secret)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(security.current_principal(credentials))
    assert exc.value.status_code == 401
