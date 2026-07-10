import logging
import uuid
from typing import Any

import resend
from resend import WebhookHeaders
from resend.exceptions import ResendError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import EmailMessage

logger = logging.getLogger(__name__)


class EmailNotConfiguredError(RuntimeError):
    pass


def _ensure_client() -> None:
    if not settings.resend_configured:
        raise EmailNotConfiguredError("Resend API key is not configured")
    resend.api_key = settings.resend_api_key.strip()


def verify_resend_webhook(*, payload: str, headers: dict[str, str]) -> dict[str, Any]:
    secret = settings.resend_webhook_secret.strip()
    if not secret:
        if settings.debug:
            logger.warning("RESEND_WEBHOOK_SECRET is empty — accepting webhook without verification")
            import json

            return json.loads(payload)
        raise ValueError("Webhook secret is not configured")

    webhook_headers = WebhookHeaders(
        id=headers.get("svix-id", ""),
        timestamp=headers.get("svix-timestamp", ""),
        signature=headers.get("svix-signature", ""),
    )
    resend.Webhooks.verify(
        {
            "payload": payload,
            "headers": webhook_headers,
            "webhook_secret": secret,
        }
    )
    import json

    return json.loads(payload)


async def send_email(
    db: AsyncSession,
    *,
    to: list[str],
    subject: str,
    html: str | None = None,
    text: str | None = None,
    from_email: str | None = None,
    reply_to: list[str] | None = None,
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
) -> tuple[str, EmailMessage]:
    _ensure_client()

    if not html and not text:
        raise ValueError("Either html or text body is required")

    sender = (from_email or settings.resend_from_email).strip()
    params: resend.Emails.SendParams = {
        "from": sender,
        "to": to,
        "subject": subject,
    }
    if html:
        params["html"] = html
    if text:
        params["text"] = text
    if reply_to:
        params["reply_to"] = reply_to
    elif settings.resend_reply_to.strip():
        params["reply_to"] = [settings.resend_reply_to.strip()]
    if cc:
        params["cc"] = cc
    if bcc:
        params["bcc"] = bcc

    try:
        result = await resend.Emails.send_async(params)
    except ResendError as exc:
        logger.exception("Resend send failed")
        raise RuntimeError(str(exc)) from exc

    resend_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)
    if not resend_id:
        raise RuntimeError("Resend did not return an email id")

    message = EmailMessage(
        id=uuid.uuid4(),
        direction="outbound",
        resend_id=str(resend_id),
        from_address=sender,
        to_addresses=to,
        subject=subject,
        text_body=text,
        html_body=html,
        message_metadata={"cc": cc or [], "bcc": bcc or [], "reply_to": params.get("reply_to", [])},
    )
    db.add(message)
    await db.flush()
    return str(resend_id), message


async def fetch_received_email(email_id: str) -> dict[str, Any]:
    _ensure_client()
    try:
        return await resend.EmailsReceiving.get_async(email_id=email_id)
    except ResendError as exc:
        logger.exception("Resend inbound fetch failed for %s", email_id)
        raise RuntimeError(str(exc)) from exc


async def store_inbound_email(db: AsyncSession, *, email_id: str, event_payload: dict[str, Any]) -> EmailMessage:
    existing = await db.scalar(select(EmailMessage).where(EmailMessage.resend_id == email_id))
    if existing:
        return existing

    full = await fetch_received_email(email_id)
    to_list = full.get("to") or event_payload.get("to") or []
    if isinstance(to_list, str):
        to_list = [to_list]

    message = EmailMessage(
        id=uuid.uuid4(),
        direction="inbound",
        resend_id=email_id,
        from_address=str(full.get("from") or event_payload.get("from") or ""),
        to_addresses=list(to_list),
        subject=full.get("subject") or event_payload.get("subject"),
        text_body=full.get("text"),
        html_body=full.get("html"),
        message_metadata={"webhook": event_payload, "attachments": full.get("attachments") or []},
    )
    db.add(message)
    await db.flush()
    return message


async def list_email_messages(
    db: AsyncSession,
    *,
    direction: str | None = None,
    limit: int = 50,
) -> list[EmailMessage]:
    stmt = select(EmailMessage).order_by(EmailMessage.created_at.desc()).limit(min(limit, 100))
    if direction:
        stmt = stmt.where(EmailMessage.direction == direction)
    result = await db.scalars(stmt)
    return list(result.all())
