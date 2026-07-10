from __future__ import annotations

from uuid import UUID

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Profile
from app.services.billing_fulfillment import fulfill_checkout_session
from app.services.credits import PACK_CREDITS, ResearchPack

stripe.api_key = settings.stripe_secret_key or None

PACK_PRICE_ENV: dict[ResearchPack, str] = {
    "starter": "stripe_price_starter",
    "founder": "stripe_price_founder",
    "indie": "stripe_price_indie",
}


def get_price_id_for_pack(pack: ResearchPack) -> str | None:
    mapping = {
        "starter": settings.stripe_price_starter,
        "founder": settings.stripe_price_founder,
        "indie": settings.stripe_price_indie,
    }
    price_id = mapping.get(pack, "").strip()
    return price_id or None


def stripe_configured_for_pack(pack: ResearchPack) -> bool:
    return bool(settings.stripe_secret_key.strip() and get_price_id_for_pack(pack))


async def create_checkout_session(
    db: AsyncSession,
    *,
    user_id: UUID,
    email: str | None,
    pack: ResearchPack,
) -> stripe.checkout.Session:
    price_id = get_price_id_for_pack(pack)
    if not settings.stripe_secret_key.strip() or not price_id:
        raise RuntimeError(f"Stripe is not configured for pack: {pack}")

    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()

    params: dict = {
        "mode": "payment",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": (
            f"{settings.app_web_url.rstrip('/')}/billing/success"
            f"?session_id={{CHECKOUT_SESSION_ID}}&pack={pack}"
        ),
        "cancel_url": f"{settings.app_web_url.rstrip('/')}/billing/cancel",
        "client_reference_id": str(user_id),
        "allow_promotion_codes": True,
        "metadata": {
            "user_id": str(user_id),
            "pack": pack,
            "credits": str(PACK_CREDITS[pack]),
        },
    }

    if profile and profile.stripe_customer_id:
        params["customer"] = profile.stripe_customer_id
    elif email:
        params["customer_email"] = email

    return stripe.checkout.Session.create(**params)


async def apply_checkout_completed(db: AsyncSession, session: dict) -> None:
    await fulfill_checkout_session(db, session, source="webhook")
