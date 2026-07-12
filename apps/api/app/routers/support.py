import html
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.support import SupportRequestCreate, SupportRequestOut
from app.services.credits import get_or_create_profile
from app.services.resend_email import EmailNotConfiguredError, send_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support", tags=["support"])


@router.post("", response_model=SupportRequestOut, status_code=status.HTTP_201_CREATED)
async def submit_support_request(
    payload: SupportRequestCreate,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.resend_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email is not configured",
        )

    inbox = settings.support_inbox_email.strip()
    if not inbox:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Support inbox is not configured",
        )

    message = payload.message.strip()
    if len(message) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please describe your issue in a bit more detail",
        )

    await get_or_create_profile(db, user.id, user.email)

    user_id = str(user.id)
    user_email = (user.email or "").strip() or "(no email)"
    subject_line = (payload.subject or "").strip() or "Support request"
    email_subject = f"[Vantage Support] {subject_line} — {user_id}"

    safe_message = html.escape(message)
    safe_subject = html.escape(subject_line)
    safe_email = html.escape(user_email)
    safe_user_id = html.escape(user_id)

    text_body = (
        f"User ID: {user_id}\n"
        f"User email: {user_email}\n"
        f"Subject: {subject_line}\n\n"
        f"{message}\n"
    )
    html_body = (
        "<p><strong>User ID:</strong> "
        f"<code>{safe_user_id}</code></p>"
        f"<p><strong>User email:</strong> {safe_email}</p>"
        f"<p><strong>Subject:</strong> {safe_subject}</p>"
        "<hr />"
        f"<p style='white-space:pre-wrap'>{safe_message}</p>"
    )

    reply_to = [user_email] if user.email else None

    try:
        await send_email(
            db,
            to=[inbox],
            subject=email_subject,
            html=html_body,
            text=text_body,
            reply_to=reply_to,
        )
    except EmailNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        logger.exception("Support email send failed for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send support message",
        ) from exc

    await db.commit()
    return SupportRequestOut(ok=True)
