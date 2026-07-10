from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

BLOCK_MARKERS = (
    "captcha",
    "access denied",
    "verify you are human",
    "unusual traffic",
    "cf-browser-verification",
    "please enable javascript",
)


class ScraperBlockedError(Exception):
    pass


class ScraperNavigationError(Exception):
    pass


@dataclass
class ScrapeAttemptLog:
    pages_fetched: int = 0
    errors: list[str] = field(default_factory=list)


def is_blocked_content(html: str, title: str = "") -> bool:
    haystack = f"{title}\n{html}".lower()
    return any(marker in haystack for marker in BLOCK_MARKERS)


def with_retries(
    fn: Callable[[], T],
    *,
    max_retries: int,
    base_delay_seconds: float,
    on_retry: Callable[[int, Exception], None] | None = None,
) -> T:
    last_error: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except (ScraperBlockedError, ScraperNavigationError) as exc:
            last_error = exc
            if attempt >= max_retries:
                break
            delay = base_delay_seconds * (2**attempt)
            if on_retry:
                on_retry(attempt + 1, exc)
            logger.warning("Scrape retry %s after error: %s", attempt + 1, exc)
            time.sleep(delay)
    assert last_error is not None
    raise last_error
