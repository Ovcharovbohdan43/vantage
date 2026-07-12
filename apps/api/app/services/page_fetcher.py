from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import httpx
from playwright.sync_api import Browser, Page, Playwright, sync_playwright

from app.collectors.browser import launch_stealth_browser, new_stealth_context, wait_past_challenge
from app.config import settings

if TYPE_CHECKING:
    from collections.abc import Iterator

logger = logging.getLogger(__name__)


class PageFetcher:
    """Fetch HTML from G2/Capterra — httpx first, Playwright (stealth) when blocked."""

    def __init__(self, client: httpx.Client) -> None:
        self._client = client
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._page: Page | None = None
        self._playwright_failed = False

    def __enter__(self) -> PageFetcher:
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    def close(self) -> None:
        if self._browser:
            try:
                self._browser.close()
            except Exception:  # noqa: BLE001
                pass
        if self._playwright:
            try:
                self._playwright.stop()
            except Exception:  # noqa: BLE001
                pass
        self._browser = None
        self._playwright = None
        self._page = None

    def _ensure_playwright(self) -> Page | None:
        if self._page:
            return self._page
        if self._playwright_failed:
            return None
        try:
            self._playwright = sync_playwright().start()
            self._browser = launch_stealth_browser(self._playwright)
            self._page = new_stealth_context(self._browser).new_page()
            return self._page
        except Exception as exc:  # noqa: BLE001 — fall back to httpx-only if Playwright unavailable
            self._playwright_failed = True
            logger.warning("Playwright unavailable for page fetch: %s", exc)
            self.close()
            return None

    def fetch_html(self, url: str) -> str | None:
        try:
            response = self._client.get(url)
            if response.status_code < 400:
                return response.text
            if response.status_code != 403:
                return None
        except httpx.HTTPError:
            pass

        page = self._ensure_playwright()
        if not page:
            return None

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=settings.scraper_page_timeout_ms)
            return wait_past_challenge(page)
        except Exception as exc:  # noqa: BLE001
            logger.info("Playwright fetch failed for %s: %s", url, exc)
            return None


def page_fetcher(client: httpx.Client) -> Iterator[PageFetcher]:
    fetcher = PageFetcher(client)
    try:
        yield fetcher
    finally:
        fetcher.close()
