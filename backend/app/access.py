from sqlalchemy import and_, exists, or_, select

from .models import Document, DocumentACL


def document_access_filter(principal):
    """Return a tenant-bounded predicate for owned, tenant-visible or explicitly granted documents."""
    tenant_scope = Document.tenant_id == principal.tenant_id
    if {"tenant_admin", "platform_admin"} & set(principal.roles):
        return tenant_scope
    user_grant = exists(
        select(DocumentACL.id).where(
            DocumentACL.tenant_id == Document.tenant_id,
            DocumentACL.document_id == Document.id,
            DocumentACL.subject_type == "user",
            DocumentACL.subject_id == principal.user_id,
            DocumentACL.permission.in_(("read", "write", "admin")),
        )
    )
    return and_(
        tenant_scope,
        or_(Document.visibility == "tenant", Document.owner_id == principal.user_id, user_grant),
    )


def can_access_document(document, principal, grants=()) -> bool:
    # Admin privileges are always bounded to the principal's active tenant.
    if document.tenant_id != principal.tenant_id:
        return False
    if {"tenant_admin", "platform_admin"} & set(principal.roles):
        return True
    if document.visibility == "tenant" or document.owner_id == principal.user_id:
        return True
    return any(
        grant.get("subject_type") == "user"
        and grant.get("subject_id") == principal.user_id
        and grant.get("permission") in {"read", "write", "admin"}
        for grant in grants
    )
