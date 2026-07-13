from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.services.support_rate_limit import (
    SUPPORT_COOLDOWN,
    SUPPORT_MAX_PER_DAY,
    SUPPORT_MAX_PER_HOUR,
    evaluate_support_rate_limit,
    is_support_ticket_row,
)


def _ticket(minutes_ago: float, subject: str = "[Vantage Support] Help — user-id") -> SimpleNamespace:
    return SimpleNamespace(
        subject=subject,
        created_at=datetime.now(timezone.utc) - timedelta(minutes=minutes_ago),
        message_metadata={"tags": [{"name": "type", "value": "support_ticket"}]},
    )


def test_is_support_ticket_row_by_subject_and_tags():
    by_subject = SimpleNamespace(
        subject="[Vantage Support] Billing — abc",
        message_metadata={},
    )
    by_tag = SimpleNamespace(
        subject="Something else",
        message_metadata={"tags": [{"name": "type", "value": "support_ticket"}]},
    )
    other = SimpleNamespace(
        subject="Welcome to Vantage",
        message_metadata={"tags": [{"name": "type", "value": "signup_welcome"}]},
    )
    assert is_support_ticket_row(by_subject) is True
    assert is_support_ticket_row(by_tag) is True
    assert is_support_ticket_row(other) is False


def test_cooldown_blocks_immediate_resend():
    tickets = [_ticket(0.1)]
    limited = evaluate_support_rate_limit(tickets)
    assert limited is not None
    wait, message = limited
    assert wait >= 1
    assert "wait" in message.lower()


def test_allows_after_cooldown():
    tickets = [_ticket(SUPPORT_COOLDOWN.total_seconds() / 60 + 0.5)]
    assert evaluate_support_rate_limit(tickets) is None


def test_hourly_cap():
    # Past cooldown on every ticket, 3 within the last hour
    gap = SUPPORT_COOLDOWN.total_seconds() / 60 + 0.5
    tickets = [_ticket(gap * (i + 1)) for i in range(SUPPORT_MAX_PER_HOUR)]
    limited = evaluate_support_rate_limit(tickets)
    assert limited is not None
    assert "per hour" in limited[1].lower()


def test_daily_cap():
    # ~70 min apart so only one falls in the last hour; most recent past cooldown
    tickets = [_ticket(70 * (i + 1)) for i in range(SUPPORT_MAX_PER_DAY)]
    limited = evaluate_support_rate_limit(tickets)
    assert limited is not None
    assert "daily" in limited[1].lower()
