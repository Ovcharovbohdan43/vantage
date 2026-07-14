from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Profile, StripeCheckoutFulfillment
from app.services.credits import PACK_CREDITS, ResearchPack, add_pack_credits, get_or_create_profile

logger = logging.getLogger(__name__)


def normalize_checkout_session(session: dict | stripe.checkout.Session) -> dict:
    """Stripe SDK objects support [] access but not .get()."""
    if isinstance(session, dict):
        return session
    to_dict = getattr(session, "to_dict", None)
    if callable(to_dict):
        return to_dict()
    return dict(session)


@dataclass(frozen=True)
class FulfillmentResult:
    fulfilled: bool
    already_fulfilled: bool
    pack: ResearchPack | None
    credits_added: int
    total_credits: int


def _pack_from_price_id(price_id: str | None) -> ResearchPack | None:
    if not price_id:
        return None
    mapping = {
        settings.stripe_price_starter: "starter",
        settings.stripe_price_founder: "founder",
        settings.stripe_price_indie: "indie",
    }
    return mapping.get(price_id)  # type: ignore[return-value]


def resolve_pack_from_session(session: dict) -> ResearchPack | None:
    metadata = session.get("metadata") or {}
    pack = metadata.get("pack")
    if pack in PACK_CREDITS:
        return pack  # type: ignore[return-value]

    line_items = (session.get("line_items") or {}).get("data") or []
    for item in line_items:
        price = item.get("price") or {}
        price_id = price.get("id") if isinstance(price, dict) else getattr(price, "id", None)
        resolved = _pack_from_price_id(price_id)
        if resolved:
            return resolved

    amount = session.get("amount_total")
    # Current amounts plus legacy prices for already-created Checkout sessions.
    amount_to_pack: dict[int, ResearchPack] = {
        500: "starter",
        2500: "founder",
        10000: "indie",
        900: "starter",
        2900: "founder",
        7900: "indie",
    }
    if isinstance(amount, int):
        return amount_to_pack.get(amount)
    return None


async def fulfill_checkout_session(
    db: AsyncSession,
    session: dict | stripe.checkout.Session,
    *,
    source: str = "webhook",
) -> FulfillmentResult:
    session_data = normalize_checkout_session(session)
    session_id = session_data.get("id")
    if not session_id:
        return FulfillmentResult(False, False, None, 0, 0)

    existing = await db.execute(
        select(StripeCheckoutFulfillment).where(StripeCheckoutFulfillment.session_id == session_id)
    )
    prior = existing.scalar_one_or_none()
    if prior:
        profile = await db.get(Profile, prior.user_id)
        total = 0
        if profile:
            total = profile.starter_credits + profile.founder_credits + profile.indie_credits
        return FulfillmentResult(
            fulfilled=True,
            already_fulfilled=True,
            pack=prior.pack,  # type: ignore[arg-type]
            credits_added=prior.credits_added,
            total_credits=total,
        )

    if session_data.get("payment_status") != "paid":
        return FulfillmentResult(False, False, None, 0, 0)

    user_id_raw = session_data.get("client_reference_id") or (session_data.get("metadata") or {}).get("user_id")
    if not user_id_raw:
        logger.warning("Checkout session %s missing user reference", session_id)
        return FulfillmentResult(False, False, None, 0, 0)

    pack = resolve_pack_from_session(session_data)
    if not pack:
        logger.warning("Checkout session %s: could not resolve research pack", session_id)
        return FulfillmentResult(False, False, None, 0, 0)

    user_id = UUID(str(user_id_raw))
    email = (session_data.get("customer_details") or {}).get("email")
    profile = await get_or_create_profile(db, user_id, email)
    profile.stripe_customer_id = session_data.get("customer") or profile.stripe_customer_id

    credits_added = add_pack_credits(profile, pack)
    db.add(
        StripeCheckoutFulfillment(
            session_id=session_id,
            user_id=user_id,
            pack=pack,
            credits_added=credits_added,
            source=source,
        )
    )
    await db.flush()

    total = profile.starter_credits + profile.founder_credits + profile.indie_credits
    logger.info(
        "Fulfilled checkout %s for user %s: pack=%s credits=%s source=%s",
        session_id,
        user_id,
        pack,
        credits_added,
        source,
    )
    return FulfillmentResult(
        fulfilled=True,
        already_fulfilled=False,
        pack=pack,
        credits_added=credits_added,
        total_credits=total,
    )


async def fulfill_checkout_session_id(
    db: AsyncSession,
    session_id: str,
    *,
    source: str = "success_page",
) -> FulfillmentResult:
    if not settings.stripe_secret_key.strip():
        return FulfillmentResult(False, False, None, 0, 0)

    session = stripe.checkout.Session.retrieve(session_id, expand=["line_items"])
    return await fulfill_checkout_session(db, session, source=source)
