import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.deps.internal_auth import require_service_role
from app.schemas.email import (
    EmailMessageOut,
    EmailWebhookResponse,
    SendEmailRequest,
    SendEmailResponse,
)
from app.services.resend_email import (
    EmailNotConfiguredError,
    list_email_messages,
    send_email,
    store_inbound_email,
    verify_resend_webhook,
)
from app.services.support_reply import route_support_inbound

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email", tags=["email"])


def _message_out(row) -> EmailMessageOut:
    return EmailMessageOut(
        id=str(row.id),
        direction=row.direction,
        resend_id=row.resend_id,
        from_address=row.from_address,
        to_addresses=row.to_addresses if isinstance(row.to_addresses, list) else [],
        subject=row.subject,
        text_body=row.text_body,
        html_body=row.html_body,
        created_at=row.created_at.isoformat(),
    )


@router.post("/send", response_model=SendEmailResponse)
async def email_send(
    payload: SendEmailRequest,
    _: None = Depends(require_service_role),
    db: AsyncSession = Depends(get_db),
):
    if not settings.resend_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Resend is not configured")

    try:
        resend_id, stored = await send_email(
            db,
            to=[str(addr) for addr in payload.to],
            subject=payload.subject,
            html=payload.html,
            text=payload.text,
            from_email=payload.from_email,
            reply_to=[str(addr) for addr in payload.reply_to] if payload.reply_to else None,
            cc=[str(addr) for addr in payload.cc] if payload.cc else None,
            bcc=[str(addr) for addr in payload.bcc] if payload.bcc else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except EmailNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    await db.commit()
    return SendEmailResponse(id=resend_id, stored_message_id=str(stored.id))


@router.post("/webhook", response_model=EmailWebhookResponse)
async def email_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = (await request.body()).decode("utf-8")
    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }

    try:
        event = verify_resend_webhook(payload=payload, headers=headers)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Resend webhook verification failed")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook") from exc

    event_type = event.get("type")
    data = event.get("data") or {}

    if event_type == "email.received":
        email_id = data.get("email_id")
        if not email_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing email_id")

        if not settings.resend_configured:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Resend is not configured")

        try:
            inbound = await store_inbound_email(db, email_id=str(email_id), event_payload=data)
            try:
                await route_support_inbound(db, inbound)
            except Exception:
                logger.exception("Support inbound routing failed for %s", email_id)
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

        await db.commit()
        return EmailWebhookResponse(received=True, event_type=event_type, email_id=str(email_id))

    await db.commit()
    return EmailWebhookResponse(received=True, event_type=event_type)


@router.get("/messages", response_model=list[EmailMessageOut])
async def email_messages(
    direction: str | None = None,
    limit: int = 50,
    _: None = Depends(require_service_role),
    db: AsyncSession = Depends(get_db),
):
    if direction and direction not in {"inbound", "outbound"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid direction")

    rows = await list_email_messages(db, direction=direction, limit=limit)
    return [_message_out(row) for row in rows]
