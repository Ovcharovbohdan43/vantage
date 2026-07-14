from __future__ import annotations

from uuid import UUID

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Profile
from app.schemas.billing import PACK_CATALOG
from app.services.billing_fulfillment import fulfill_checkout_session
from app.services.credits import PACK_CREDITS, ResearchPack

stripe.api_key = settings.stripe_secret_key or None

def _catalog_pack(pack: ResearchPack):
    return next(item for item in PACK_CATALOG if item.id == pack)


def stripe_configured_for_pack(pack: ResearchPack) -> bool:
    return bool(settings.stripe_secret_key.strip() and _catalog_pack(pack))


async def create_checkout_session(
    db: AsyncSession,
    *,
    user_id: UUID,
    email: str | None,
    pack: ResearchPack,
) -> stripe.checkout.Session:
    if not settings.stripe_secret_key.strip():
        raise RuntimeError(f"Stripe is not configured for pack: {pack}")

    catalog_pack = _catalog_pack(pack)
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()

    params: dict = {
        "mode": "payment",
        # Inline price data keeps Stripe checkout aligned with the public catalog.
        # No stale STRIPE_PRICE_* id can silently charge an old amount.
        "line_items": [
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": catalog_pack.price_usd * 100,
                    "product_data": {
                        "name": catalog_pack.label,
                        "description": catalog_pack.tagline,
                        "metadata": {
                            "pack": pack,
                            "credits": str(catalog_pack.credits),
                        },
                    },
                },
                "quantity": 1,
            }
        ],
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
