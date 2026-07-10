"""Backward-compat shim — use credits.py for new code."""

from app.services.credits import CreditError as ResearchLimitError
from app.services.credits import assert_can_start_full as assert_can_create_full_research
from app.services.credits import assert_can_start_preview
from app.services.credits import get_user_credits as get_usage_snapshot

__all__ = [
    "ResearchLimitError",
    "assert_can_create_full_research",
    "assert_can_start_preview",
    "get_usage_snapshot",
]
