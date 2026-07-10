from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Profile

ResearchPack = Literal["starter", "founder", "indie"]
ResearchPlan = Literal["preview", "starter", "founder", "indie"]
ResearchDepth = Literal["shallow", "standard", "deep"]

PACK_CREDITS: dict[ResearchPack, int] = {
    "starter": 1,
    "founder": 5,
    "indie": 20,
}

PACK_LABELS: dict[ResearchPack, str] = {
    "starter": "Starter Research",
    "founder": "Founder Pack",
    "indie": "Indie Hacker",
}

DEPTH_CREDIT_COSTS: dict[ResearchDepth, int] = {
    "shallow": 1,
    "standard": 2,
    "deep": 3,
}

PACK_PRIORITY: list[ResearchPack] = ["indie", "founder", "starter"]


@dataclass(frozen=True)
class CreditsSnapshot:
    free_preview_available: bool
    starter_credits: int
    founder_credits: int
    indie_credits: int
    total_credits: int
    depth_credit_costs: dict[str, int]
    can_run_preview: bool
    can_run_full: bool


class CreditError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def credit_cost_for_depth(depth: str) -> int:
    return DEPTH_CREDIT_COSTS.get(depth, DEPTH_CREDIT_COSTS["shallow"])  # type: ignore[arg-type]


async def get_or_create_profile(
    db: AsyncSession,
    user_id: UUID,
    email: str | None,
) -> Profile:
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()
    if profile:
        return profile

    profile = Profile(
        id=user_id,
        email=email or "",
        subscription_status="free",
    )
    db.add(profile)
    await db.flush()
    return profile


def total_credits(profile: Profile) -> int:
    return profile.starter_credits + profile.founder_credits + profile.indie_credits


def can_afford_depth(profile: Profile, depth: str) -> bool:
    return total_credits(profile) >= credit_cost_for_depth(depth)


def get_credits_snapshot(profile: Profile) -> CreditsSnapshot:
    total = total_credits(profile)
    preview_available = not profile.free_preview_used
    return CreditsSnapshot(
        free_preview_available=preview_available,
        starter_credits=profile.starter_credits,
        founder_credits=profile.founder_credits,
        indie_credits=profile.indie_credits,
        total_credits=total,
        depth_credit_costs=dict(DEPTH_CREDIT_COSTS),
        can_run_preview=preview_available,
        can_run_full=total >= min(DEPTH_CREDIT_COSTS.values()),
    )


async def get_user_credits(
    db: AsyncSession,
    user_id: UUID,
    email: str | None,
) -> CreditsSnapshot:
    profile = await get_or_create_profile(db, user_id, email)
    return get_credits_snapshot(profile)


def add_pack_credits(profile: Profile, pack: ResearchPack) -> int:
    amount = PACK_CREDITS[pack]
    if pack == "starter":
        profile.starter_credits += amount
    elif pack == "founder":
        profile.founder_credits += amount
    else:
        profile.indie_credits += amount
    return amount


def consume_credits(profile: Profile, amount: int) -> None:
    if amount <= 0:
        return
    if total_credits(profile) < amount:
        raise CreditError(
            "no_credits",
            "Not enough research credits. Purchase a pack to continue.",
        )

    remaining = amount
    pools: list[tuple[str, str]] = [
        ("indie", "indie_credits"),
        ("founder", "founder_credits"),
        ("starter", "starter_credits"),
    ]
    for _, attr in pools:
        current = getattr(profile, attr)
        take = min(current, remaining)
        setattr(profile, attr, current - take)
        remaining -= take
        if remaining == 0:
            return


def refund_credits(profile: Profile, amount: int) -> None:
    if amount <= 0:
        return
    profile.starter_credits += amount


def mark_preview_used(profile: Profile) -> None:
    profile.free_preview_used = True


async def assert_can_start_preview(
    db: AsyncSession,
    user_id: UUID,
    email: str | None,
) -> Profile:
    profile = await get_or_create_profile(db, user_id, email)
    if profile.free_preview_used:
        raise CreditError(
            "preview_used",
            "Your free preview was already used. Choose a research depth and spend credits.",
        )
    return profile


async def assert_can_start_full(
    db: AsyncSession,
    user_id: UUID,
    email: str | None,
    depth: str,
) -> Profile:
    if depth not in DEPTH_CREDIT_COSTS:
        raise CreditError("invalid_depth", f"Unknown research depth: {depth}")

    profile = await get_or_create_profile(db, user_id, email)
    cost = credit_cost_for_depth(depth)
    if total_credits(profile) < cost:
        raise CreditError(
            "no_credits",
            f"This depth costs {cost} credit{'s' if cost != 1 else ''}. "
            f"You have {total_credits(profile)}. Purchase more to continue.",
        )
    consume_credits(profile, cost)
    return profile
