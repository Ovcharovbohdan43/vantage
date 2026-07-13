"""Rate limits for /support to prevent abuse of repeated ticket emails."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EmailMessage

# Minimum gap between support tickets from the same account.
SUPPORT_COOLDOWN = timedelta(minutes=2)
# Rolling windows
SUPPORT_MAX_PER_HOUR = 3
SUPPORT_MAX_PER_DAY = 8


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def is_support_ticket_row(row: EmailMessage) -> bool:
    subject = (row.subject or "").strip()
    if subject.startswith("[Vantage Support]"):
        return True
    tags = (row.message_metadata or {}).get("tags") or []
    for tag in tags:
        if isinstance(tag, dict) and tag.get("name") == "type" and tag.get("value") == "support_ticket":
            return True
    meta_user = (row.message_metadata or {}).get("user_id")
    if meta_user and (row.message_metadata or {}).get("kind") == "support_ticket":
        return True
    return False


def evaluate_support_rate_limit(
    tickets: list[EmailMessage],
    *,
    now: datetime | None = None,
) -> tuple[int, str] | None:
    """Return (retry_after_seconds, message) if limited, else None."""
    now = _aware(now or datetime.now(timezone.utc))
    if not tickets:
        return None

    ordered = sorted(tickets, key=lambda r: _aware(r.created_at), reverse=True)
    last = _aware(ordered[0].created_at)
    since_last = now - last
    if since_last < SUPPORT_COOLDOWN:
        wait = int((SUPPORT_COOLDOWN - since_last).total_seconds()) + 1
        return (
            wait,
            f"Please wait {wait} seconds before sending another support message.",
        )

    hour_ago = now - timedelta(hours=1)
    day_ago = now - timedelta(days=1)
    hour_count = sum(1 for t in ordered if _aware(t.created_at) >= hour_ago)
    day_count = sum(1 for t in ordered if _aware(t.created_at) >= day_ago)

    if hour_count >= SUPPORT_MAX_PER_HOUR:
        oldest_in_window = min(
            (_aware(t.created_at) for t in ordered if _aware(t.created_at) >= hour_ago),
            default=last,
        )
        wait = int((oldest_in_window + timedelta(hours=1) - now).total_seconds()) + 1
        wait = max(wait, 1)
        return (
            wait,
            f"Support limit reached ({SUPPORT_MAX_PER_HOUR} messages per hour). Try again in {wait} seconds.",
        )

    if day_count >= SUPPORT_MAX_PER_DAY:
        oldest_in_window = min(
            (_aware(t.created_at) for t in ordered if _aware(t.created_at) >= day_ago),
            default=last,
        )
        wait = int((oldest_in_window + timedelta(days=1) - now).total_seconds()) + 1
        wait = max(wait, 1)
        return (
            wait,
            f"Daily support limit reached ({SUPPORT_MAX_PER_DAY} messages). Try again later.",
        )

    return None


async def load_recent_support_tickets(
    db: AsyncSession,
    *,
    user_id: str,
) -> list[EmailMessage]:
    """Load outbound support tickets attributable to this user (last 24h)."""
    since = datetime.now(timezone.utc) - timedelta(days=1)
    result = await db.execute(
        select(EmailMessage)
        .where(
            EmailMessage.direction == "outbound",
            EmailMessage.created_at >= since,
            EmailMessage.subject.ilike(f"%{user_id}%"),
        )
        .order_by(EmailMessage.created_at.desc())
        .limit(40)
    )
    rows = list(result.scalars().all())
    return [r for r in rows if is_support_ticket_row(r)]


async def assert_support_rate_limit(db: AsyncSession, *, user_id: str) -> None:
    tickets = await load_recent_support_tickets(db, user_id=user_id)
    limited = evaluate_support_rate_limit(tickets)
    if limited is None:
        return
    wait, message = limited
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "message": message,
            "code": "support_rate_limited",
            "retry_after_seconds": wait,
        },
        headers={"Retry-After": str(wait)},
    )
