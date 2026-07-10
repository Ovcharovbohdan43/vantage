from __future__ import annotations

import logging
from dataclasses import dataclass, field

from playwright.sync_api import Browser, Page, Playwright, sync_playwright

from app.collectors.base import ScrapeAttemptLog, ScraperBlockedError, with_retries
from app.collectors.browser import launch_stealth_browser, new_stealth_context
from app.collectors.extraction import ScrapedReview
from app.collectors.source_scrapers import scrape_capterra_reviews, scrape_g2_reviews
from app.config import settings
from app.db.models import Competitor

logger = logging.getLogger(__name__)


@dataclass
class CompetitorScrapeResult:
    competitor_id: str
    competitor_name: str
    source: str
    reviews: list[ScrapedReview] = field(default_factory=list)
    pages_fetched: int = 0
    errors: list[str] = field(default_factory=list)
    blocked: bool = False


class PlaywrightReviewCollector:
    def __init__(self) -> None:
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._page: Page | None = None

    def __enter__(self) -> PlaywrightReviewCollector:
        self._playwright = sync_playwright().start()
        self._browser = launch_stealth_browser(self._playwright)
        self._page = new_stealth_context(self._browser).new_page()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()
        self._browser = None
        self._playwright = None
        self._page = None

    def collect_competitor(self, competitor: Competitor, *, max_reviews: int) -> CompetitorScrapeResult:
        if not self._page:
            raise RuntimeError("PlaywrightReviewCollector must be used as a context manager")

        log = ScrapeAttemptLog()
        result = CompetitorScrapeResult(
            competitor_id=str(competitor.id),
            competitor_name=competitor.name,
            source=competitor.source,
        )

        def run_scrape() -> list[ScrapedReview]:
            if competitor.source == "g2":
                return scrape_g2_reviews(self._page, competitor.url, max_reviews=max_reviews, log=log)
            if competitor.source == "capterra":
                return scrape_capterra_reviews(self._page, competitor.url, max_reviews=max_reviews, log=log)
            raise ValueError(f"Unsupported source: {competitor.source}")

        try:
            reviews = with_retries(
                run_scrape,
                max_retries=settings.scraper_max_retries,
                base_delay_seconds=settings.scraper_request_delay_seconds,
            )
            result.reviews = reviews
        except ScraperBlockedError as exc:
            result.blocked = True
            result.errors.append(str(exc))
        except Exception as exc:  # noqa: BLE001 — keep pipeline resilient per competitor
            logger.exception("Failed scraping %s", competitor.name)
            result.errors.append(str(exc))

        result.pages_fetched = log.pages_fetched
        result.errors.extend(log.errors)
        return result
