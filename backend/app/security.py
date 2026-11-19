from dataclasses import dataclass
from uuid import UUID
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .config import get_settings

bearer = HTTPBearer(auto_error=False)

@dataclass(frozen=True)
class Principal:
    user_id: UUID
    tenant_id: UUID
    roles: tuple[str, ...]

async def current_principal(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> Principal:
    settings = get_settings()
    if not credentials or not settings.jwt_public_key or not settings.jwt_issuer:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Valid Academy identity token required")
    try:
        claims = jwt.decode(
            credentials.credentials,
            settings.jwt_public_key,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
            audience=settings.jwt_audience,
            options={"require": ["sub", "iss", "aud", "exp", "iat"]},
        )
        user_id = UUID(str(claims["sub"]))
        tenant_id = UUID(str(claims["tenant_id"]))
        raw_roles = claims.get("roles", [])
        if isinstance(raw_roles, str):
            roles = (raw_roles,)
        elif isinstance(raw_roles, list):
            roles = tuple(str(role) for role in raw_roles)
        else:
            roles = ()
        return Principal(user_id=user_id, tenant_id=tenant_id, roles=roles)
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired identity token") from None

def require_admin(principal: Principal = Depends(current_principal)) -> Principal:
    if not ({"tenant_admin", "platform_admin"} & set(principal.roles)):
        raise HTTPException(status_code=403, detail="Tenant administrator role required")
    return principal
