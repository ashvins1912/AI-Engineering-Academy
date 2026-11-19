from uuid import uuid4
from app.security import Principal

def test_principal_contains_tenant_identity():
    tenant, user = uuid4(), uuid4()
    principal = Principal(user_id=user, tenant_id=tenant, roles=("learner",))
    assert principal.tenant_id == tenant
    assert principal.user_id == user
    assert "tenant_admin" not in principal.roles
