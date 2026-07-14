from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ResearchPack = Literal["starter", "founder", "indie"]


class CreditsOut(BaseModel):
    free_preview_available: bool
    starter_credits: int
    founder_credits: int
    indie_credits: int
    total_credits: int
    depth_credit_costs: dict[str, int] = Field(default_factory=dict)
    can_run_preview: bool
    can_run_full: bool


class UnlockRequest(BaseModel):
    research_depth: Literal["shallow", "standard", "deep"] = "shallow"


class PackInfo(BaseModel):
    id: ResearchPack
    label: str
    price_usd: int
    credits: int
    tagline: str


class CheckoutRequest(BaseModel):
    pack: ResearchPack


class CheckoutOut(BaseModel):
    checkout_url: str
    session_id: str


class FulfillRequest(BaseModel):
    session_id: str


class FulfillOut(BaseModel):
    fulfilled: bool
    already_fulfilled: bool
    pack: ResearchPack | None = None
    credits_added: int = 0
    total_credits: int = 0


class PromoRedeemRequest(BaseModel):
    code: str = Field(min_length=1, max_length=64)


class PromoRedeemOut(BaseModel):
    code: str
    credits_granted: int
    total_credits: int
    already_redeemed: bool = False


class BillingErrorDetail(BaseModel):
    code: str
    message: str


# Keep alias for transitional imports
UsageOut = CreditsOut

PACK_CATALOG: list[PackInfo] = [
    PackInfo(
        id="starter",
        label="Starter Research",
        price_usd=5,
        credits=1,
        tagline="Your first full report — prove the tool works",
    ),
    PackInfo(
        id="founder",
        label="Founder Pack",
        price_usd=25,
        credits=5,
        tagline="Compare multiple ideas before you commit months of work",
    ),
    PackInfo(
        id="indie",
        label="Indie Hacker",
        price_usd=100,
        credits=20,
        tagline="For builders who validate ideas constantly",
    ),
]
