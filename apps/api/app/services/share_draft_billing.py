from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Profile, ShareDraftEntitlement
from app.services.billing_fulfillment import normalize_checkout_session
from app.services.llm_schemas import SocialShareDraft

logger = logging.getLogger(__name__)


class ShareDraftBillingError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class ShareDraftClaim:
    entitlement: ShareDraftEntitlement
    cached_draft: SocialShareDraft | None = None


def is_share_draft_free_user(user_id: UUID) -> bool:
    return str(user_id).lower() in settings.share_draft_free_users


async def create_share_draft_checkout(
    db: AsyncSession,
    *,
    user_id: UUID,
    email: str | None,
    source_kind: str,
    source_ref: str,
    return_path: str,
) -> tuple[ShareDraftEntitlement, str | None]:
    free = is_share_draft_free_user(user_id)
    entitlement = ShareDraftEntitlement(
        user_id=user_id,
        source_kind=source_kind,
        source_ref=source_ref,
        return_path=return_path,
        grant_type="allowlist" if free else "stripe",
        amount_cents=0 if free else settings.share_draft_price_cents,
        currency="usd",
        payment_status="not_required" if free else "pending",
        status="ready",
        paid_at=datetime.now(UTC) if free else None,
    )
    db.add(entitlement)
    await db.flush()

    if free:
        return entitlement, None

    if not settings.stripe_secret_key.strip():
        raise ShareDraftBillingError("stripe_unavailable", "Stripe is not configured")

    profile = await db.get(Profile, user_id)
    base_url = settings.app_web_url.rstrip("/")
    separator = "&" if "?" in return_path else "?"
    params: dict = {
        "mode": "payment",
        "line_items": [
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": settings.share_draft_price_cents,
                    "product_data": {
                        "name": "Reddit-style share draft",
                        "description": "One natural, editable social post generated from a Vantage report.",
                    },
                },
                "quantity": 1,
            }
        ],
        "success_url": (
            f"{base_url}{return_path}{separator}"
            "share_session_id={CHECKOUT_SESSION_ID}"
        ),
        "cancel_url": f"{base_url}{return_path}{separator}share_checkout=cancelled",
        "client_reference_id": str(user_id),
        "metadata": {
            "purchase_type": "share_draft",
            "entitlement_id": str(entitlement.id),
            "user_id": str(user_id),
            "source_kind": source_kind,
            "source_ref": source_ref,
        },
    }
    if profile and profile.stripe_customer_id:
        params["customer"] = profile.stripe_customer_id
    elif email:
        params["customer_email"] = email

    session = stripe.checkout.Session.create(**params)
    if not session.url:
        raise ShareDraftBillingError("stripe_unavailable", "Stripe did not return a checkout URL")
    entitlement.stripe_checkout_session_id = session.id
    entitlement.updated_at = datetime.now(UTC)
    await db.flush()
    return entitlement, session.url


async def fulfill_share_draft_checkout(
    db: AsyncSession,
    session: dict | stripe.checkout.Session,
) -> ShareDraftEntitlement | None:
    data = normalize_checkout_session(session)
    metadata = data.get("metadata") or {}
    if metadata.get("purchase_type") != "share_draft":
        return None
    if data.get("payment_status") != "paid":
        return None

    entitlement_id = metadata.get("entitlement_id")
    if not entitlement_id:
        logger.warning("Share draft checkout %s missing entitlement_id", data.get("id"))
        return None

    try:
        parsed_id = UUID(str(entitlement_id))
    except ValueError:
        return None

    result = await db.execute(
        select(ShareDraftEntitlement)
        .where(ShareDraftEntitlement.id == parsed_id)
        .with_for_update()
    )
    entitlement = result.scalar_one_or_none()
    if not entitlement:
        return None

    session_id = data.get("id")
    if (
        entitlement.stripe_checkout_session_id
        and session_id
        and entitlement.stripe_checkout_session_id != session_id
    ):
        raise ShareDraftBillingError("session_mismatch", "Checkout session does not match entitlement")

    if entitlement.payment_status != "paid":
        entitlement.payment_status = "paid"
        entitlement.paid_at = datetime.now(UTC)
        entitlement.updated_at = datetime.now(UTC)
        if session_id:
            entitlement.stripe_checkout_session_id = session_id
        profile = await db.get(Profile, entitlement.user_id)
        if profile and data.get("customer"):
            profile.stripe_customer_id = data["customer"]
        await db.flush()
    return entitlement


async def claim_share_draft_entitlement(
    db: AsyncSession,
    *,
    entitlement_id: UUID,
    user_id: UUID,
    source_kind: str,
    source_ref: str,
) -> ShareDraftClaim:
    result = await db.execute(
        select(ShareDraftEntitlement)
        .where(
            ShareDraftEntitlement.id == entitlement_id,
            ShareDraftEntitlement.user_id == user_id,
        )
        .with_for_update()
    )
    entitlement = result.scalar_one_or_none()
    if not entitlement:
        raise ShareDraftBillingError("entitlement_not_found", "Generation purchase not found")
    if entitlement.source_kind != source_kind or entitlement.source_ref != source_ref:
        raise ShareDraftBillingError("source_mismatch", "Generation purchase is for another report")
    if entitlement.payment_status not in {"paid", "not_required"}:
        raise ShareDraftBillingError("payment_required", "Payment has not been confirmed")
    if entitlement.status == "consumed" and entitlement.draft_title and entitlement.draft_text:
        return ShareDraftClaim(
            entitlement,
            SocialShareDraft(title=entitlement.draft_title, text=entitlement.draft_text),
        )
    if entitlement.status == "generating":
        stale_before = datetime.now(UTC) - timedelta(minutes=5)
        started_at = entitlement.generation_started_at
        if started_at and started_at > stale_before:
            raise ShareDraftBillingError("generation_in_progress", "Generation is already in progress")

    entitlement.status = "generating"
    entitlement.generation_attempts = (entitlement.generation_attempts or 0) + 1
    entitlement.generation_started_at = datetime.now(UTC)
    entitlement.last_generation_error = None
    entitlement.updated_at = datetime.now(UTC)
    await db.flush()
    return ShareDraftClaim(entitlement)


async def complete_share_draft_entitlement(
    db: AsyncSession,
    *,
    entitlement_id: UUID,
    draft: SocialShareDraft,
) -> None:
    entitlement = await db.get(ShareDraftEntitlement, entitlement_id)
    if not entitlement:
        return
    entitlement.draft_title = draft.title
    entitlement.draft_text = draft.text
    entitlement.status = "consumed"
    entitlement.consumed_at = datetime.now(UTC)
    entitlement.updated_at = datetime.now(UTC)
    await db.flush()


async def release_share_draft_entitlement(
    db: AsyncSession,
    *,
    entitlement_id: UUID,
    error: str,
) -> None:
    entitlement = await db.get(ShareDraftEntitlement, entitlement_id)
    if not entitlement or entitlement.status == "consumed":
        return
    entitlement.status = "ready"
    entitlement.generation_started_at = None
    entitlement.last_generation_error = {"message": error[:500]}
    entitlement.updated_at = datetime.now(UTC)
    await db.flush()
