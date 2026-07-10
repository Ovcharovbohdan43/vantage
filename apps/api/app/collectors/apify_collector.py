from __future__ import annotations

import logging

import httpx

from app.collectors.extraction import reviews_from_apify_items
from app.collectors.playwright_collector import CompetitorScrapeResult
from app.config import settings
from app.db.models import Competitor

logger = logging.getLogger(__name__)

APIFY_BASE_URL = "https://api.apify.com/v2"
# zen-studio/software-review-scraper requires at least 100 reviews per run.
APIFY_MIN_MAX_RESULTS = 100


class ApifyError(Exception):
    pass


def _actor_path(actor_id: str) -> str:
    actor_id = actor_id.strip()
    if "/" in actor_id:
        return actor_id.replace("/", "~")
    return actor_id


def _platform_pair(source: str) -> list[str]:
    """Actor input requires >=2 platforms; keep the competitor's source first."""
    if source == "g2":
        return ["g2", "capterra"]
    if source == "capterra":
        return ["capterra", "g2"]
    return ["g2", "capterra"]


def _negative_star_ratings() -> list[str]:
    """Star ratings that carry pain signal (1..max_negative_review_rating).

    Happy 4-5 star reviews are useless for pain research, so we ask the actor to
    return only low ratings — this focuses the dataset and cuts per-review cost.
    """
    top = max(1, min(5, settings.max_negative_review_rating))
    return [str(star) for star in range(1, top + 1)]


def _build_input(competitor: Competitor, max_reviews: int) -> dict:
    """Build run_input for zen-studio/software-review-scraper."""
    # Validated G2/Capterra URLs give the most accurate product match.
    query = (competitor.url or competitor.name).strip()
    return {
        "query": query,
        "platforms": _platform_pair(competitor.source),
        "maxResults": max(APIFY_MIN_MAX_RESULTS, max_reviews),
        # Lowest ratings first so the negative signal is collected before the cap.
        "sort": "lowest_rated",
        "starRatings": _negative_star_ratings(),
    }


class ApifyReviewCollector:
    """Collect reviews via zen-studio/software-review-scraper on Apify."""

    def __init__(self) -> None:
        if not settings.apify_token.strip():
            raise ApifyError("APIFY_TOKEN is not configured")
        self._client: httpx.Client | None = None

    def __enter__(self) -> "ApifyReviewCollector":
        self._client = httpx.Client(timeout=settings.apify_timeout_seconds + 60)
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if self._client:
            self._client.close()
        self._client = None

    def collect_competitor(self, competitor: Competitor, *, max_reviews: int) -> CompetitorScrapeResult:
        if not self._client:
            raise RuntimeError("ApifyReviewCollector must be used as a context manager")

        result = CompetitorScrapeResult(
            competitor_id=str(competitor.id),
            competitor_name=competitor.name,
            source=competitor.source,
        )

        actor_id = settings.apify_reviews_actor
        run_input = _build_input(competitor, max_reviews)
        endpoint = f"{APIFY_BASE_URL}/acts/{_actor_path(actor_id)}/run-sync-get-dataset-items"
        params = {
            "token": settings.apify_token,
            "timeout": settings.apify_timeout_seconds,
            "clean": "true",
        }

        try:
            response = self._client.post(endpoint, params=params, json=run_input)
        except httpx.HTTPError as exc:
            logger.warning("Apify request failed for %s: %s", competitor.name, exc)
            result.errors.append(f"Apify request error: {exc}")
            return result

        if response.status_code == 402:
            result.errors.append("Apify: insufficient credit / usage limit reached")
            return result
        if response.status_code in (401, 403):
            result.errors.append("Apify: invalid or unauthorized token")
            return result
        if response.status_code >= 400:
            snippet = response.text[:200]
            logger.warning("Apify actor %s returned %s: %s", actor_id, response.status_code, snippet)
            result.errors.append(f"Apify actor error {response.status_code}: {snippet}")
            return result

        try:
            items = response.json()
        except ValueError:
            result.errors.append("Apify returned a non-JSON response")
            return result

        if not isinstance(items, list):
            result.errors.append("Apify returned an unexpected payload shape")
            return result

        platform_items = [
            item
            for item in items
            if isinstance(item, dict) and item.get("platform") == competitor.source
        ]
        if not platform_items:
            # Actor may return reviews from sibling platforms when product matching is fuzzy.
            platform_items = [item for item in items if isinstance(item, dict)]

        reviews = reviews_from_apify_items(platform_items, competitor.source)
        result.reviews = reviews[:max_reviews]
        result.pages_fetched = 1
        logger.info(
            "Apify scrape for %s (%s): %s reviews kept from %s dataset items (platform=%s)",
            competitor.name,
            competitor.source,
            len(result.reviews),
            len(items),
            competitor.source,
        )
        return result
