"""Bridge Resend inbound replies between support inbox and the end user.

Flow:
1. User submits /support → email to SUPPORT_INBOX with Reply-To support+{user_id}@domain
2. Agent replies in Gmail (Reply) → lands on Resend Receiving → webhook
3. We resend the agent body to the user From RESEND_FROM_EMAIL (official Vantage)
4. User replies → same inbound address → we forward to SUPPORT_INBOX
"""

from __future__ import annotations

import html
import logging
import re
import uuid
from email.utils import parseaddr

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import EmailMessage, Profile
from app.services.resend_email import send_email

logger = logging.getLogger(__name__)

_SUPPORT_PLUS_RE = re.compile(
    r"support\+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})@",
    re.IGNORECASE,
)


def extract_email_address(raw: str | None) -> str:
    if not raw:
        return ""
    _, addr = parseaddr(str(raw))
    return (addr or str(raw)).strip().lower()


def support_reply_address(user_id: uuid.UUID | str) -> str:
    domain = settings.support_reply_domain.strip().lower()
    return f"support+{user_id}@{domain}"


def parse_support_user_id(to_addresses: list | str | None) -> uuid.UUID | None:
    if to_addresses is None:
        return None
    if isinstance(to_addresses, str):
        candidates = [to_addresses]
    else:
        candidates = [str(x) for x in to_addresses]
    for item in candidates:
        match = _SUPPORT_PLUS_RE.search(item)
        if match:
            try:
                return uuid.UUID(match.group(1))
            except ValueError:
                continue
    return None


def _our_from_address() -> str:
    return extract_email_address(settings.resend_from_email)


def _normalize_subject(subject: str | None) -> str:
    base = (subject or "Support").strip() or "Support"
    if not base.lower().startswith("re:"):
        return f"Re: {base}"
    return base


async def route_support_inbound(db: AsyncSession, inbound: EmailMessage) -> bool:
    """If inbound is a support+user thread, relay it. Returns True when handled."""
    user_id = parse_support_user_id(inbound.to_addresses)
    if user_id is None:
        return False

    from_addr = extract_email_address(inbound.from_address)
    our_from = _our_from_address()
    inbox = extract_email_address(settings.support_inbox_email)

    # Ignore mail we just sent (loop guard)
    if from_addr and our_from and from_addr == our_from:
        logger.info("Skipping support inbound from our own From address")
        return True

    profile = await db.scalar(select(Profile).where(Profile.id == user_id))
    if not profile or not (profile.email or "").strip():
        logger.warning("Support inbound for unknown/missing profile %s", user_id)
        return True

    user_email = profile.email.strip()
    reply_to = support_reply_address(user_id)
    subject = _normalize_subject(inbound.subject)
    text = (inbound.text_body or "").strip()
    html_body = inbound.html_body

    if not text and not html_body:
        logger.warning("Empty support inbound %s — skipped", inbound.resend_id)
        return True

    if not html_body and text:
        html_body = f"<p style='white-space:pre-wrap'>{html.escape(text)}</p>"

    # Agent → user (official From)
    if inbox and from_addr == inbox:
        await send_email(
            db,
            to=[user_email],
            subject=subject,
            html=html_body,
            text=text or None,
            reply_to=[reply_to],
            category="transactional",
            tags=[{"name": "type", "value": "support_reply"}],
        )
        logger.info("Relayed support reply to user %s", user_id)
        return True

    # User (or anyone writing to the ticket address) → support inbox
    if inbox:
        prefix = (
            f"User ID: {user_id}\n"
            f"User email: {user_email}\n"
            f"From: {inbound.from_address}\n\n"
        )
        relay_text = prefix + (text or "(html-only message)")
        relay_html = (
            f"<p><strong>User ID:</strong> <code>{html.escape(str(user_id))}</code></p>"
            f"<p><strong>User email:</strong> {html.escape(user_email)}</p>"
            f"<p><strong>From:</strong> {html.escape(inbound.from_address or '')}</p>"
            "<hr />"
            + (html_body or f"<p style='white-space:pre-wrap'>{html.escape(text)}</p>")
        )
        await send_email(
            db,
            to=[inbox],
            subject=subject if subject.lower().startswith("[vantage support]") else f"[Vantage Support] {subject}",
            html=relay_html,
            text=relay_text,
            reply_to=[reply_to],
            category="transactional",
            tags=[{"name": "type", "value": "support_followup"}],
        )
        logger.info("Relayed user follow-up to support inbox for %s", user_id)
        return True

    return False
