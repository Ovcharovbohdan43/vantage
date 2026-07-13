from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Profile
from app.services.email_templates import render_supabase_template
from app.services.resend_email import EmailNotConfiguredError, send_email

logger = logging.getLogger(__name__)

SIGNUP_BONUS_CREDITS = 2


def _site_url() -> str:
    site = (settings.app_web_url or "https://vantageserch.app").rstrip("/")
    if "localhost" in site:
        return "https://vantageserch.app"
    return site


def welcome_email_parts(
    *,
    email: str,
    credits: int = SIGNUP_BONUS_CREDITS,
) -> tuple[str, str, str]:
    """Subject, HTML, text for the signup welcome email (GitHub-style template)."""
    return render_supabase_template(
        "welcome-credits",
        SiteURL=_site_url(),
        Email=email,
        Credits=str(credits),
    )


def welcome_email_html(*, credits: int = SIGNUP_BONUS_CREDITS, email: str = "") -> str:
    _, html, _ = welcome_email_parts(email=email or "your account", credits=credits)
    return html


def welcome_email_text(*, credits: int = SIGNUP_BONUS_CREDITS, email: str = "") -> str:
    _, _, text = welcome_email_parts(email=email or "your account", credits=credits)
    return text


async def ensure_welcome_email(db: AsyncSession, profile: Profile) -> bool:
    """Send the signup welcome email once. Returns True if sent this call."""
    if profile.welcome_email_sent_at is not None:
        return False

    email = (profile.email or "").strip()
    if not email or "@" not in email:
        return False

    subject, html, text = welcome_email_parts(email=email)

    try:
        await send_email(
            db,
            to=[email],
            subject=subject,
            html=html,
            text=text,
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
