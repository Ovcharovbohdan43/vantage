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
from app.services.support_rate_limit import assert_support_rate_limit
from app.services.support_reply import support_reply_address

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
    await assert_support_rate_limit(db, user_id=user_id)
    user_email = (user.email or "").strip() or "(no email)"
    subject_line = (payload.subject or "").strip() or "Support request"
    email_subject = f"[Vantage Support] {subject_line} — {user_id}"

    safe_message = html.escape(message)
    safe_subject = html.escape(subject_line)
    safe_email = html.escape(user_email)
    safe_user_id = html.escape(user_id)

    text_body = (
        f"New support request\n"
        f"===================\n\n"
        f"User ID: {user_id}\n"
        f"User email: {user_email}\n"
        f"Subject: {subject_line}\n"
        f"Dashboard: {(settings.app_web_url or '').rstrip('/')}/dashboard\n"
        f"Account: {(settings.app_web_url or '').rstrip('/')}/account\n\n"
        f"Message\n"
        f"-------\n"
        f"{message}\n\n"
        f"— Reply to this email to respond to the customer.\n"
    )
    site = (settings.app_web_url or "https://vantageserch.app").rstrip("/")
    if "localhost" in site:
        site = "https://vantageserch.app"
    html_body = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f6f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2328;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fa;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #d0d7de;border-radius:6px;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #d8dee4;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#656d76;text-transform:uppercase;letter-spacing:0.04em;">Support ticket</p>
          <h1 style="margin:0;font-size:18px;line-height:24px;font-weight:600;color:#1f2328;">{safe_subject}</h1>
        </td></tr>
        <tr><td style="padding:20px 28px;background:#f6f8fa;border-bottom:1px solid #d8dee4;">
          <p style="margin:0 0 8px;font-size:12px;color:#656d76;"><strong style="color:#1f2328;">User ID</strong><br /><code style="font-size:12px;">{safe_user_id}</code></p>
          <p style="margin:0 0 8px;font-size:12px;color:#656d76;"><strong style="color:#1f2328;">Email</strong><br />{safe_email}</p>
          <p style="margin:0;font-size:12px;color:#656d76;">
            <a href="{site}/dashboard" style="color:#0969da;text-decoration:none;">Dashboard</a>
            · <a href="{site}/account" style="color:#0969da;text-decoration:none;">Account</a>
            · <a href="{site}/support" style="color:#0969da;text-decoration:none;">Support</a>
          </p>
        </td></tr>
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#656d76;">Message</p>
          <p style="margin:0;font-size:14px;line-height:22px;color:#1f2328;white-space:pre-wrap;">{safe_message}</p>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #d8dee4;background:#f6f8fa;">
          <p style="margin:0;font-size:12px;line-height:18px;color:#656d76;">Reply to this email to respond to the customer from the official Vantage address.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    reply_to = [support_reply_address(user.id)]

    try:
        await send_email(
            db,
            to=[inbox],
            subject=email_subject,
            html=html_body,
            text=text_body,
            reply_to=reply_to,
            category="transactional",
            tags=[{"name": "type", "value": "support_ticket"}],
            extra_metadata={
                "kind": "support_ticket",
                "user_id": user_id,
            },
        )
    except EmailNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        logger.exception("Support email send failed for user %s", user_id)
        raw = str(exc)
        if "only send testing emails" in raw.lower() or "verify a domain" in raw.lower():
            detail = (
                "Support email is blocked by Resend test mode. "
                "Verify a domain at resend.com/domains and set RESEND_FROM_EMAIL "
                "to an address on that domain."
            )
        else:
            detail = "Could not send support message"
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        ) from exc

    await db.commit()
    return SupportRequestOut(ok=True)
