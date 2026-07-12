from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from app.collectors.extraction import ScrapedReview
from app.collectors.playwright_collector import CompetitorScrapeResult
from app.config import settings
from app.db.models import Competitor

logger = logging.getLogger(__name__)


class CrawleeCollectorError(Exception):
    pass


def _parse_review(item: dict[str, Any], source: str) -> ScrapedReview | None:
    text = item.get("text")
    if not isinstance(text, str) or not text.strip():
        return None

    rating = item.get("rating")
    if isinstance(rating, float):
        rating = int(round(rating))
    if rating is not None and not isinstance(rating, int):
        rating = None

    review_date = None
    raw_date = item.get("reviewDate") or item.get("review_date")
    if isinstance(raw_date, str) and raw_date.strip():
        try:
            cleaned = raw_date.strip().replace("Z", "+00:00")
            review_date = datetime.fromisoformat(cleaned)
            if review_date.tzinfo is None:
                review_date = review_date.replace(tzinfo=UTC)
        except ValueError:
            review_date = None

    title = item.get("title")
    author = item.get("author")
    language = item.get("language")

    return ScrapedReview(
        source=source,
        text=text.strip(),
        rating=rating if isinstance(rating, int) else None,
        title=title.strip() if isinstance(title, str) and title.strip() else None,
        author=author.strip() if isinstance(author, str) and author.strip() else None,
        review_date=review_date,
        language=language.strip() if isinstance(language, str) and language.strip() else None,
    )


class CrawleeReviewCollector:
    """Collect reviews via the standalone review-collector service (Crawlee + Webshare)."""

    def __init__(self) -> None:
        if not settings.review_collector_url.strip():
            raise CrawleeCollectorError("REVIEW_COLLECTOR_URL is not configured")
        if not settings.review_collector_api_key.strip():
            raise CrawleeCollectorError("REVIEW_COLLECTOR_API_KEY is not configured")
        self._client: httpx.Client | None = None

    def __enter__(self) -> "CrawleeReviewCollector":
        self._client = httpx.Client(
            base_url=settings.review_collector_url.rstrip("/"),
            timeout=settings.review_collector_timeout_seconds,
            headers={
                "Authorization": f"Bearer {settings.review_collector_api_key}",
                "Content-Type": "application/json",
            },
        )
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self._client:
            self._client.close()
        self._client = None

    def ping(self) -> bool:
        if not self._client:
            return False
        try:
            response = self._client.get("/health", timeout=5.0)
            return response.status_code == 200
        except httpx.HTTPError:
            return False

    def collect_competitor(self, competitor: Competitor, *, max_reviews: int) -> CompetitorScrapeResult:
        if not self._client:
            raise RuntimeError("CrawleeReviewCollector must be used as a context manager")

        result = CompetitorScrapeResult(
            competitor_id=str(competitor.id),
            competitor_name=competitor.name,
            source=competitor.source,
        )

        query = (competitor.url or competitor.name).strip()
        payload = {
            "query": query,
            "source": competitor.source,
            "maxReviews": max_reviews,
            "maxRating": settings.max_negative_review_rating,
        }

        try:
            response = self._client.post("/v1/collect", json=payload)
        except httpx.HTTPError as exc:
            logger.warning("review-collector request failed for %s: %s", competitor.name, exc)
            result.errors.append(f"review-collector request error: {exc}")
            return result

        if response.status_code == 401:
            result.errors.append("review-collector: unauthorized (check REVIEW_COLLECTOR_API_KEY)")
            return result
        if response.status_code >= 400:
            snippet = response.text[:300]
            logger.warning(
                "review-collector returned %s for %s: %s",
                response.status_code,
                competitor.name,
                snippet,
            )
            result.errors.append(f"review-collector error {response.status_code}: {snippet}")
            return result

        try:
            data = response.json()
        except ValueError:
            result.errors.append("review-collector returned non-JSON response")
            return result

        items = data.get("reviews") if isinstance(data, dict) else None
        if not isinstance(items, list):
            result.errors.append("review-collector returned unexpected payload")
            return result

        reviews: list[ScrapedReview] = []
        for item in items:
            if isinstance(item, dict):
                parsed = _parse_review(item, competitor.source)
                if parsed:
                    reviews.append(parsed)

        result.reviews = reviews[:max_reviews]
        stats = data.get("stats") if isinstance(data, dict) else {}
        if isinstance(stats, dict):
            result.pages_fetched = int(stats.get("pagesFetched") or (0 if data.get("cached") else 1))
        else:
            result.pages_fetched = 0 if data.get("cached") else 1

        remote_errors = data.get("errors") if isinstance(data, dict) else None
        if isinstance(remote_errors, list):
            result.errors.extend(str(e) for e in remote_errors[:5])

        logger.info(
            "review-collector for %s (%s): %s reviews (cached=%s)",
            competitor.name,
            competitor.source,
            len(result.reviews),
            bool(data.get("cached")) if isinstance(data, dict) else False,
        )
        return result
