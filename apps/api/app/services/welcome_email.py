from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Profile
from app.services.resend_email import EmailNotConfiguredError, send_email

logger = logging.getLogger(__name__)

SIGNUP_BONUS_CREDITS = 2

SUBJECT = "Welcome to Vantage — 2 free research credits are yours"


def _site_url() -> str:
    site = (settings.app_web_url or "https://vantageserch.app").rstrip("/")
    if "localhost" in site:
        return "https://vantageserch.app"
    return site


def welcome_email_html(*, credits: int = SIGNUP_BONUS_CREDITS) -> str:
    site = _site_url()
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e4e4e7;">
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#a1a1aa;font-family:Courier New,monospace;">Welcome</p>
          <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#09090b;">Vantage</p>
          <h1 style="margin:0 0 12px;font-size:22px;line-height:28px;font-weight:600;color:#09090b;">Congrats on joining Vantage</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#52525b;">
            Thanks for signing up. To help you get started, we added
            <strong style="color:#18181b;">{credits} research credits</strong> to your account as a gift.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:#52525b;">
            Use them for full market analyses with real G2/Capterra complaint evidence —
            so you can decide what to build with less guesswork.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="background:#09090b;">
              <a href="{site}/dashboard" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                Open your workspace
              </a>
            </td>
          </tr></table>
          <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#71717a;">
            If the button does not work, open: <a href="{site}/dashboard" style="color:#18181b;">{site}/dashboard</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:11px;line-height:16px;color:#a1a1aa;">Vantage — market pain research<br />{site}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def welcome_email_text(*, credits: int = SIGNUP_BONUS_CREDITS) -> str:
    site = _site_url()
    return (
        "Welcome to Vantage\n\n"
        f"Congrats on joining. We added {credits} research credits to your account as a gift.\n\n"
        f"Open your workspace: {site}/dashboard\n\n"
        "— Vantage\n"
    )


async def ensure_welcome_email(db: AsyncSession, profile: Profile) -> bool:
    """Send the signup welcome email once. Returns True if sent this call."""
    if profile.welcome_email_sent_at is not None:
        return False

    email = (profile.email or "").strip()
    if not email or "@" not in email:
        return False

    try:
        await send_email(
            db,
            to=[email],
            subject=SUBJECT,
            html=welcome_email_html(),
            text=welcome_email_text(),
            category="transactional",
            tags=[{"name": "type", "value": "signup_welcome"}],
        )
    except EmailNotConfiguredError:
        logger.warning("Welcome email skipped — Resend not configured")
        return False
    except Exception:  # noqa: BLE001
        logger.exception("Welcome email failed for profile %s", profile.id)
        return False

    profile.welcome_email_sent_at = datetime.now(timezone.utc)
    await db.flush()
    return True
