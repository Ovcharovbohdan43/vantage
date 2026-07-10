import pytest

from app.services.billing_fulfillment import normalize_checkout_session, resolve_pack_from_session


def test_resolve_pack_from_metadata() -> None:
    pack = resolve_pack_from_session(
        {
            "metadata": {"pack": "founder", "credits": "5"},
            "amount_total": 2900,
        }
    )
    assert pack == "founder"


def test_resolve_pack_from_amount_when_metadata_missing() -> None:
    pack = resolve_pack_from_session({"metadata": {}, "amount_total": 2900})
    assert pack == "founder"


@pytest.mark.parametrize(
    ("amount", "expected"),
    [(900, "starter"), (2900, "founder"), (7900, "indie")],
)
def test_resolve_pack_from_amount(amount: int, expected: str) -> None:
    assert resolve_pack_from_session({"metadata": {}, "amount_total": amount}) == expected


def test_normalize_checkout_session_from_stripe_object() -> None:
    class FakeStripeSession:
        def to_dict(self) -> dict:
            return {
                "id": "cs_test_123",
                "payment_status": "paid",
                "metadata": {"pack": "starter"},
                "amount_total": 900,
            }

    normalized = normalize_checkout_session(FakeStripeSession())
    assert normalized["id"] == "cs_test_123"
    assert resolve_pack_from_session(normalized) == "starter"
