from sqlalchemy import exists, or_, select, true

from .models import Document, DocumentACL


def document_access_filter(principal):
    """Return the SQL predicate for tenant-visible, owned or explicitly granted documents."""
    if {"tenant_admin", "platform_admin"} & set(principal.roles):
        return true()
    user_grant = exists(
        select(DocumentACL.id).where(
            DocumentACL.tenant_id == Document.tenant_id,
            DocumentACL.document_id == Document.id,
            DocumentACL.subject_type == "user",
            DocumentACL.subject_id == principal.user_id,
            DocumentACL.permission.in_(("read", "write", "admin")),
        )
    )
    return or_(
        Document.visibility == "tenant",
        Document.owner_id == principal.user_id,
        user_grant,
    )


def can_access_document(document, principal, grants=()) -> bool:
    if {"tenant_admin", "platform_admin"} & set(principal.roles):
        return True
    if document.tenant_id != principal.tenant_id:
        return False
    if document.visibility == "tenant" or document.owner_id == principal.user_id:
        return True
    return any(
        grant.get("subject_type") == "user"
        and grant.get("subject_id") == principal.user_id
        and grant.get("permission") in {"read", "write", "admin"}
        for grant in grants
    )
