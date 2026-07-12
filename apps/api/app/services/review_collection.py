import logging
import time
from dataclasses import dataclass, field
from math import ceil
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.collectors.crawlee_collector import CrawleeReviewCollector
from app.collectors.extraction import ScrapedReview, compute_content_hash
from app.config import settings
from app.db.models import Competitor, Project, Review
from app.services.research_limits import (
    MIN_COMPETITOR_SUCCESS_RATIO,
    MIN_REVIEW_LENGTH,
    get_min_total_reviews,
    get_plan_limits,
)

logger = logging.getLogger(__name__)


@dataclass
class CollectionResult:
    total_reviews: int
    competitors_attempted: int
    competitors_with_reviews: int
    pages_fetched: int
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def build_review_collector():
    """Use the standalone Crawlee + Webshare review-collector service.

    This branch replaces Apify; there is no Playwright/Apify fallback.
    """
    if not settings.use_crawlee:
        raise RuntimeError(
            "SCRAPER_PROVIDER=crawlee requires REVIEW_COLLECTOR_URL and "
            "REVIEW_COLLECTOR_API_KEY (see apps/review-collector/README.md)."
        )
    logger.info("Using Crawlee review-collector at %s", settings.review_collector_url)
    return CrawleeReviewCollector()


def count_project_reviews(db: Session, project_id: UUID) -> int:
    result = db.scalar(
        select(func.count())
        .select_from(Review)
        .join(Competitor, Review.competitor_id == Competitor.id)
        .where(Competitor.project_id == project_id)
    )
    return int(result or 0)


def save_reviews_batch(
    db: Session,
    *,
    competitor_id: UUID,
    source: str,
    reviews: list[ScrapedReview],
) -> int:
    if not reviews:
        return 0

    rows: list[dict] = []
    for review in reviews:
        text = review.text.strip()
        if len(text) < MIN_REVIEW_LENGTH:
            continue
        rows.append(
            {
                "competitor_id": competitor_id,
                "source": source,
                "content_hash": compute_content_hash(str(competitor_id), source, text),
                "rating": review.rating,
                "title": review.title,
                "text": text,
                "language": review.language,
                "author": review.author,
                "review_date": review.review_date,
            }
        )

    if not rows:
        return 0

    stmt = insert(Review).values(rows)
    stmt = stmt.on_conflict_do_nothing(index_elements=["competitor_id", "content_hash"])
    result = db.execute(stmt)
    db.flush()
    return result.rowcount or 0


def collect_reviews_for_project(
    db: Session,
    project: Project,
    competitors: list[Competitor],
    *,
    on_progress=None,
) -> CollectionResult:
    limits = get_plan_limits(project)
    selected = competitors[: limits.max_competitors]

    result = CollectionResult(
        total_reviews=count_project_reviews(db, project.id),
        competitors_attempted=len(selected),
        competitors_with_reviews=0,
        pages_fetched=0,
    )

    if not selected:
        result.errors.append("No competitors available for review collection")
        return result

    with build_review_collector() as collector:
        # Fail fast if the standalone collector is down (avoids N connection-refused loops).
        if hasattr(collector, "ping") and not collector.ping():
            result.errors.append(
                "review-collector is unreachable at REVIEW_COLLECTOR_URL "
                f"({settings.review_collector_url}). Start it with: npm run dev:collector"
            )
            return result

        for index, competitor in enumerate(selected, start=1):
            scrape_result = collector.collect_competitor(
                competitor,
                max_reviews=limits.max_reviews_per_competitor,
            )
            result.pages_fetched += scrape_result.pages_fetched
            result.errors.extend(scrape_result.errors)

            saved = save_reviews_batch(
                db,
                competitor_id=competitor.id,
                source=competitor.source,
                reviews=scrape_result.reviews,
            )
            if saved > 0:
                result.competitors_with_reviews += 1

            result.total_reviews = count_project_reviews(db, project.id)

            if on_progress:
                on_progress(
                    competitors_done=index,
                    competitors_total=len(selected),
                    reviews_collected=result.total_reviews,
                )

            # Soft pacing between products — G2 bans networks that look like rapid bursts.
            if index < len(selected):
                pause = max(8.0, settings.scraper_request_delay_seconds * 4)
                time.sleep(pause)

            if scrape_result.blocked and settings.scraper_stop_on_block:
                result.warnings.append("scraper_blocked")
                break

    min_successful = max(1, ceil(len(selected) * MIN_COMPETITOR_SUCCESS_RATIO))
    if result.competitors_with_reviews < min_successful:
        result.errors.append(
            f"Only {result.competitors_with_reviews}/{len(selected)} competitors returned reviews "
            f"(minimum {min_successful})."
        )

    if result.total_reviews == 0:
        result.errors.append("No reviews collected from G2 or Capterra.")
    elif result.total_reviews < get_min_total_reviews(project):
        result.warnings.append("insufficient_reviews")

    logger.info(
        "Review collection for project %s: %s reviews, %s/%s competitors, %s pages",
        project.id,
        result.total_reviews,
        result.competitors_with_reviews,
        len(selected),
        result.pages_fetched,
    )
    return result


def collection_failed_error(result: CollectionResult) -> dict:
    return {
        "code": "review_collection_failed",
        "message": "Could not collect enough reviews from G2/Capterra. Try again later or add competitors manually.",
        "details": {
            "reviews_collected": result.total_reviews,
            "competitors_with_reviews": result.competitors_with_reviews,
            "errors": result.errors[:5],
        },
    }
