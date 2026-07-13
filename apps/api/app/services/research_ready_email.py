from __future__ import annotations

import logging
from typing import Any

import resend
from resend.exceptions import ResendError

from app.config import settings
from app.services.email_templates import render_supabase_template

logger = logging.getLogger(__name__)


def _site_url() -> str:
    site = (settings.app_web_url or "https://vantageserch.app").rstrip("/")
    if "localhost" in site:
        return "https://vantageserch.app"
    return site


def research_ready_email_parts(
    *,
    email: str,
    title: str,
    project_id: str,
) -> tuple[str, str, str]:
    site = _site_url()
    report_url = f"{site}/research/{project_id}/report"
    return render_supabase_template(
        "research-ready",
        SiteURL=site,
        Email=email,
        Title=title,
        ReportURL=report_url,
    )


def send_research_ready_email_sync(
    *,
    email: str,
    title: str,
    project_id: str,
) -> bool:
    """Fire-and-forget transactional mail from Celery (sync Resend client)."""
    to = (email or "").strip()
    if not to or "@" not in to:
        return False
    if not settings.resend_configured:
        logger.warning("Research-ready email skipped — Resend not configured")
        return False

    subject, html, text = research_ready_email_parts(
        email=to,
        title=title or "Your research",
        project_id=project_id,
    )

    resend.api_key = settings.resend_api_key.strip()
    params: dict[str, Any] = {
        "from": settings.resend_from_email.strip(),
        "to": [to],
        "subject": subject,
        "html": html,
        "text": text,
        "tags": [{"name": "type", "value": "research_ready"}],
    }
    if settings.resend_reply_to.strip():
        params["reply_to"] = [settings.resend_reply_to.strip()]

    try:
        resend.Emails.send(params)
    except ResendError:
        logger.exception("Research-ready email failed for %s", project_id)
        return False
    except Exception:  # noqa: BLE001
        logger.exception("Research-ready email failed for %s", project_id)
        return False

    return True
