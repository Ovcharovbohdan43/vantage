from __future__ import annotations

from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.config import settings
from app.db.models import ShareDraftEntitlement
from app.services.llm_schemas import SocialShareDraft
from app.services.share_draft_billing import (
    claim_share_draft_entitlement,
    complete_share_draft_entitlement,
    create_share_draft_checkout,
    fulfill_share_draft_checkout,
    release_share_draft_entitlement,
)

OWNER_ID = UUID("db1c0e15-f6f4-4b59-b6b9-b2d56cb508b8")


class _Result:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _Db:
    def __init__(self, entitlement=None, profile=None):
        self.entitlement = entitlement
        self.profile = profile
        self.added = []

    def add(self, value):
        if isinstance(value, ShareDraftEntitlement) and value.id is None:
            value.id = uuid4()
        self.entitlement = value
        self.added.append(value)

    async def flush(self):
        return None

    async def execute(self, _statement):
        return _Result(self.entitlement)

    async def get(self, model, _object_id):
        if model is ShareDraftEntitlement:
            return self.entitlement
        return self.profile


@pytest.mark.asyncio
async def test_allowlisted_owner_gets_free_entitlement_without_stripe(monkeypatch) -> None:
    monkeypatch.setattr(settings, "share_draft_free_user_ids", str(OWNER_ID))
    db = _Db()

    entitlement, checkout_url = await create_share_draft_checkout(
        db,
        user_id=OWNER_ID,
        email="owner@example.com",
        source_kind="idea_of_week",
        source_ref="2026-W29",
        return_path="/idea-of-the-week/2026-W29",
    )

    assert checkout_url is None
    assert entitlement.grant_type == "allowlist"
    assert entitlement.payment_status == "not_required"
    assert entitlement.amount_cents == 0


@pytest.mark.asyncio
async def test_paid_checkout_charges_exactly_fifty_cents(monkeypatch) -> None:
    monkeypatch.setattr(settings, "share_draft_free_user_ids", "")
    monkeypatch.setattr(settings, "share_draft_price_cents", 50)
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_example")
    captured = {}

    def fake_create(**params):
        captured.update(params)
        return SimpleNamespace(id="cs_test_share", url="https://checkout.stripe.test/share")

    monkeypatch.setattr("stripe.checkout.Session.create", fake_create)
    db = _Db(profile=None)

    entitlement, checkout_url = await create_share_draft_checkout(
        db,
        user_id=uuid4(),
        email="founder@example.com",
        source_kind="library",
        source_ref="inventory-sync",
        return_path="/library/inventory-sync",
    )

    assert checkout_url == "https://checkout.stripe.test/share"
    assert captured["line_items"][0]["price_data"]["unit_amount"] == 50
    assert captured["line_items"][0]["price_data"]["currency"] == "usd"
    assert captured["metadata"]["purchase_type"] == "share_draft"
    assert captured["metadata"]["entitlement_id"] == str(entitlement.id)
    assert entitlement.stripe_checkout_session_id == "cs_test_share"


@pytest.mark.asyncio
async def test_paid_fulfillment_and_generation_are_idempotent() -> None:
    user_id = uuid4()
    entitlement = ShareDraftEntitlement(
        id=uuid4(),
        user_id=user_id,
        source_kind="library",
        source_ref="inventory-sync",
        return_path="/library/inventory-sync",
        grant_type="stripe",
        stripe_checkout_session_id="cs_test_share",
        amount_cents=50,
        payment_status="pending",
        status="ready",
    )
    db = _Db(entitlement=entitlement)
    session = {
        "id": "cs_test_share",
        "payment_status": "paid",
        "metadata": {
            "purchase_type": "share_draft",
            "entitlement_id": str(entitlement.id),
            "user_id": str(user_id),
        },
    }

    fulfilled = await fulfill_share_draft_checkout(db, session)
    assert fulfilled is entitlement
    assert entitlement.payment_status == "paid"

    claim = await claim_share_draft_entitlement(
        db,
        entitlement_id=entitlement.id,
        user_id=user_id,
        source_kind="library",
        source_ref="inventory-sync",
    )
    assert claim.cached_draft is None
    assert entitlement.status == "generating"

    draft = SocialShareDraft(
        title="What I learned from inventory software complaints",
        text=(
            "I analyzed a startup idea and the results surprised me. "
            "This is a sufficiently detailed generated draft for the paid sharing flow. "
        )
        * 5,
    )
    await complete_share_draft_entitlement(db, entitlement_id=entitlement.id, draft=draft)

    replay = await claim_share_draft_entitlement(
        db,
        entitlement_id=entitlement.id,
        user_id=user_id,
        source_kind="library",
        source_ref="inventory-sync",
    )
    assert replay.cached_draft == draft
    assert entitlement.generation_attempts == 1


@pytest.mark.asyncio
async def test_failed_generation_releases_same_entitlement_for_retry() -> None:
    user_id = uuid4()
    entitlement = ShareDraftEntitlement(
        id=uuid4(),
        user_id=user_id,
        source_kind="report",
        source_ref=str(uuid4()),
        return_path="/research/example/report",
        grant_type="stripe",
        amount_cents=50,
        payment_status="paid",
        status="ready",
    )
    db = _Db(entitlement=entitlement)

    await claim_share_draft_entitlement(
        db,
        entitlement_id=entitlement.id,
        user_id=user_id,
        source_kind=entitlement.source_kind,
        source_ref=entitlement.source_ref,
    )
    await release_share_draft_entitlement(
        db,
        entitlement_id=entitlement.id,
        error="temporary provider error",
    )

    assert entitlement.status == "ready"
    assert entitlement.last_generation_error == {"message": "temporary provider error"}

    retry = await claim_share_draft_entitlement(
        db,
        entitlement_id=entitlement.id,
        user_id=user_id,
        source_kind=entitlement.source_kind,
        source_ref=entitlement.source_ref,
    )
    assert retry.cached_draft is None
    assert entitlement.generation_attempts == 2
