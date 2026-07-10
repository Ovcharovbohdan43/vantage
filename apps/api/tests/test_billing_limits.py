"""Tests for credit-based billing."""

import pytest

from app.services.credits import (
    DEPTH_CREDIT_COSTS,
    PACK_CREDITS,
    CreditError,
    consume_credits,
    credit_cost_for_depth,
    get_credits_snapshot,
    refund_credits,
)


class FakeProfile:
    def __init__(self) -> None:
        self.free_preview_used = False
        self.starter_credits = 0
        self.founder_credits = 0
        self.indie_credits = 0


def test_pack_credits() -> None:
    assert PACK_CREDITS["starter"] == 1
    assert PACK_CREDITS["founder"] == 5
    assert PACK_CREDITS["indie"] == 20


def test_depth_credit_costs() -> None:
    assert credit_cost_for_depth("shallow") == 1
    assert credit_cost_for_depth("standard") == 2
    assert credit_cost_for_depth("deep") == 3
    assert DEPTH_CREDIT_COSTS["standard"] == 2


def test_consume_credits_prefers_highest_tier() -> None:
    profile = FakeProfile()
    profile.starter_credits = 2
    profile.founder_credits = 1
    profile.indie_credits = 1

    consume_credits(profile, 1)  # type: ignore[arg-type]
    assert profile.indie_credits == 0
    assert profile.founder_credits == 1
    assert profile.starter_credits == 2

    consume_credits(profile, 2)  # type: ignore[arg-type]
    assert profile.founder_credits == 0
    assert profile.starter_credits == 1

    consume_credits(profile, 1)  # type: ignore[arg-type]
    assert profile.starter_credits == 0

    with pytest.raises(CreditError):
        consume_credits(profile, 1)  # type: ignore[arg-type]


def test_refund_credits() -> None:
    profile = FakeProfile()
    profile.starter_credits = 1
    refund_credits(profile, 2)  # type: ignore[arg-type]
    assert profile.starter_credits == 3


def test_credits_snapshot() -> None:
    profile = FakeProfile()
    profile.founder_credits = 3
    snap = get_credits_snapshot(profile)  # type: ignore[arg-type]
    assert snap.total_credits == 3
    assert snap.can_run_full is True
    assert snap.can_run_preview is True
    assert snap.depth_credit_costs["deep"] == 3

    profile.free_preview_used = True
    snap = get_credits_snapshot(profile)  # type: ignore[arg-type]
    assert snap.can_run_preview is False
