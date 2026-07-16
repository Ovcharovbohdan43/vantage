from __future__ import annotations

from uuid import UUID

from app.config import OWNER_SHARE_DRAFT_FREE_EMAILS, OWNER_SHARE_DRAFT_FREE_USER_IDS, settings
from app.deps.auth import AuthUser


def is_blog_owner(user: AuthUser) -> bool:
    """Only the founder account may publish or edit blog posts."""
    if str(user.id).lower() in settings.share_draft_free_users:
        return True
    if user.email and user.email.strip().lower() in settings.share_draft_free_email_set:
        return True
    return str(user.id).lower() in OWNER_SHARE_DRAFT_FREE_USER_IDS or (
        user.email is not None and user.email.strip().lower() in OWNER_SHARE_DRAFT_FREE_EMAILS
    )


def require_blog_owner(user: AuthUser) -> None:
    from fastapi import HTTPException, status

    if not is_blog_owner(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Blog publishing is restricted")
