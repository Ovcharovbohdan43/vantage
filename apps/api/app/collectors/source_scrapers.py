from __future__ import annotations

import logging
import time
from urllib.parse import urlencode, urlparse, urlunparse

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError

from app.collectors.base import ScrapeAttemptLog, ScraperBlockedError, ScraperNavigationError, is_blocked_content
from app.collectors.browser import wait_past_challenge
from app.collectors.extraction import ScrapedReview, extract_reviews_from_html
from app.config import settings

logger = logging.getLogger(__name__)


def _with_page_query(url: str, page_num: int) -> str:
    if page_num <= 1:
        return url
    parsed = urlparse(url)
    query = dict(pair.split("=") for pair in parsed.query.split("&") if pair) if parsed.query else {}
    query["page"] = str(page_num)
    return urlunparse(parsed._replace(query=urlencode(query)))


def scrape_g2_reviews(page: Page, url: str, *, max_reviews: int, log: ScrapeAttemptLog) -> list[ScrapedReview]:
    collected: list[ScrapedReview] = []
    seen: set[str] = set()
    page_num = 1

    while len(collected) < max_reviews:
        target_url = _with_page_query(url, page_num)
        try:
            # Cloudflare returns an initial 403 challenge that resolves client-side,
            # so we don't abort on status — we wait for the interstitial to clear.
            page.goto(target_url, wait_until="domcontentloaded", timeout=settings.scraper_page_timeout_ms)
        except PlaywrightTimeoutError as exc:
            log.errors.append(f"G2 timeout on page {page_num}: {exc}")
            break

        log.pages_fetched += 1
        html = wait_past_challenge(page)
        title = page.title()
        if is_blocked_content(html, title) or len(html) < 5000:
            raise ScraperBlockedError(f"G2 blocked access for {target_url}")

        batch = extract_reviews_from_html(html, "g2")
        if not batch:
            break

        added = 0
        for review in batch:
            if review.text in seen:
                continue
            seen.add(review.text)
            collected.append(review)
            added += 1
            if len(collected) >= max_reviews:
                break

        if added == 0:
            break

        page_num += 1
        time.sleep(settings.scraper_request_delay_seconds)

    logger.info("G2 scrape %s: %s reviews from %s pages", url, len(collected), log.pages_fetched)
    return collected[:max_reviews]


def _capterra_reviews_url(product_url: str) -> str:
    parsed = urlparse(product_url.rstrip("/"))
    if parsed.path.endswith("/reviews"):
        return product_url
    return f"{product_url.rstrip('/')}/reviews/"


def scrape_capterra_reviews(
    page: Page, url: str, *, max_reviews: int, log: ScrapeAttemptLog
) -> list[ScrapedReview]:
    collected: list[ScrapedReview] = []
    seen: set[str] = set()
    reviews_url = _capterra_reviews_url(url)
    page_num = 1

    while len(collected) < max_reviews:
        target_url = _with_page_query(reviews_url, page_num)
        try:
            page.goto(target_url, wait_until="domcontentloaded", timeout=settings.scraper_page_timeout_ms)
        except PlaywrightTimeoutError as exc:
            log.errors.append(f"Capterra timeout on page {page_num}: {exc}")
            break

        log.pages_fetched += 1
        html = wait_past_challenge(page)
        title = page.title()
        if is_blocked_content(html, title) or len(html) < 5000:
            raise ScraperBlockedError(f"Capterra blocked access for {target_url}")

        batch = extract_reviews_from_html(html, "capterra")
        if not batch:
            # Try clicking load-more once before giving up
            load_more = page.locator('button:has-text("Load more"), button:has-text("Show more")').first
            if page_num == 1 and load_more.count() > 0:
                try:
                    load_more.click(timeout=5000)
                    page.wait_for_timeout(1500)
                    html = page.content()
                    batch = extract_reviews_from_html(html, "capterra")
                except PlaywrightTimeoutError:
                    pass

        if not batch:
            break

        added = 0
        for review in batch:
            if review.text in seen:
                continue
            seen.add(review.text)
            collected.append(review)
            added += 1
            if len(collected) >= max_reviews:
                break

        if added == 0:
            break

        page_num += 1
        time.sleep(settings.scraper_request_delay_seconds)

    logger.info("Capterra scrape %s: %s reviews from %s pages", url, len(collected), log.pages_fetched)
    return collected[:max_reviews]
