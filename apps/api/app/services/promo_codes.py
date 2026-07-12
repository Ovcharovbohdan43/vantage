from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PromoCode, PromoCodeRedemption, Profile
from app.services.credits import CreditError, get_or_create_profile, total_credits


@dataclass(frozen=True)
class PromoRedeemResult:
    code: str
    credits_granted: int
    total_credits: int
    already_redeemed: bool = False


def normalize_promo_code(raw: str) -> str:
    return raw.strip().upper()


async def redeem_promo_code(
    db: AsyncSession,
    *,
    user_id: UUID,
    email: str | None,
    code: str,
) -> PromoRedeemResult:
    normalized = normalize_promo_code(code)
    if not normalized or len(normalized) > 64:
        raise CreditError("invalid_promo", "Enter a valid promo code.")

    profile = await get_or_create_profile(db, user_id, email)

    result = await db.execute(
        select(PromoCode).where(PromoCode.code == normalized).with_for_update()
    )
    promo = result.scalar_one_or_none()
    if not promo or not promo.active:
        raise CreditError("invalid_promo", "This promo code is not valid.")

    if promo.expires_at is not None:
        expires = promo.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise CreditError("promo_expired", "This promo code has expired.")

    if promo.max_redemptions is not None and promo.redemption_count >= promo.max_redemptions:
        raise CreditError("promo_exhausted", "This promo code has reached its redemption limit.")

    existing = await db.execute(
        select(PromoCodeRedemption.id).where(
            PromoCodeRedemption.promo_code_id == promo.id,
            PromoCodeRedemption.user_id == user_id,
        )
    )
    if existing.scalar_one_or_none():
        return PromoRedeemResult(
            code=promo.code,
            credits_granted=0,
            total_credits=total_credits(profile),
            already_redeemed=True,
        )

    credits = int(promo.credits)
    profile.starter_credits += credits
    promo.redemption_count += 1
    db.add(
        PromoCodeRedemption(
            promo_code_id=promo.id,
            user_id=user_id,
            credits_granted=credits,
        )
    )
    await db.flush()

    return PromoRedeemResult(
        code=promo.code,
        credits_granted=credits,
        total_credits=total_credits(profile),
        already_redeemed=False,
    )
