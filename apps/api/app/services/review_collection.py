import logging
import time
from contextlib import nullcontext
from dataclasses import dataclass, field
from math import ceil
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.collectors.apify_collector import ApifyReviewCollector
from app.collectors.crawlee_collector import CrawleeReviewCollector
from app.collectors.extraction import ScrapedReview, compute_content_hash
from app.config import settings
from app.db.models import Competitor, Project, Review
from app.services.research_cancel import ResearchCancelled
from app.services.research_limits import (
    MIN_COMPETITOR_SUCCESS_RATIO,
    MIN_REVIEW_LENGTH,
    get_min_total_reviews,
    get_plan_limits,
)

logger = logging.getLogger(__name__)


def _sleep_unless_cancelled(seconds: float, should_cancel) -> None:
    """Sleep in short slices so cancel is noticed without waiting for Apify/Crawlee."""
    if seconds <= 0:
        return
    deadline = time.monotonic() + seconds
    while True:
        if should_cancel and should_cancel():
            raise ResearchCancelled()
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(min(0.5, remaining))


@dataclass
class CollectionResult:
    total_reviews: int
    competitors_attempted: int
    competitors_with_reviews: int
    pages_fetched: int
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def count_project_reviews(db: Session, project_id: UUID) -> int:
    result = db.scalar(
        select(func.count())
        .select_from(Review)
        .join(Competitor, Review.competitor_id == Competitor.id)
        .where(Competitor.project_id == project_id)
    )
    return int(result or 0)


def count_competitor_reviews(db: Session, competitor_id: UUID) -> int:
    result = db.scalar(select(func.count()).select_from(Review).where(Review.competitor_id == competitor_id))
    return int(result or 0)


def average_competitor_rating(db: Session, competitor_id: UUID) -> float | None:
    result = db.scalar(
        select(func.avg(Review.rating)).where(
            Review.competitor_id == competitor_id,
            Review.rating.is_not(None),
        )
    )
    if result is None:
        return None
    return round(float(result), 1)


def refresh_competitor_market_stats(db: Session, competitor: Competitor) -> None:
    """Keep Market Map in sync after soft-accept discovery + review collection."""
    collected = count_competitor_reviews(db, competitor.id)
    if collected > 0:
        # Prefer collected volume when discovery could not scrape page metadata.
        competitor.reviews_count = max(competitor.reviews_count or 0, collected)
        avg_rating = average_competitor_rating(db, competitor.id)
        if avg_rating is not None:
            # Soft-accept leaves rating null; fill from collected reviews.
            # If discovery already had a page rating, keep the higher-signal page rating
            # only when we already have one — otherwise use collected avg.
            if competitor.rating is None:
                competitor.rating = avg_rating
        db.flush()
    elif competitor.reviews_count is None and competitor.rating is None:
        # Still waiting — leave null so UI shows "reviews pending".
        pass


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
    should_cancel=None,
) -> CollectionResult:
    """Crawlee/Webshare is primary; Apify runs only when a competitor yields no reviews."""
    limits = get_plan_limits(project)
    selected = competitors[: limits.max_competitors]

    result = CollectionResult(
        total_reviews=count_project_reviews(db, project.id),
        competitors_attempted=len(selected),
        competitors_with_reviews=0,
        pages_fetched=0,
    )

    if should_cancel and should_cancel():
        raise ResearchCancelled()

    if not selected:
        result.errors.append("No competitors available for review collection")
        return result

    crawlee_ready = settings.crawlee_configured and not settings.use_apify
    apify_ready = settings.apify_configured

    if not crawlee_ready and not apify_ready:
        result.errors.append(
            "No review collector configured. Set REVIEW_COLLECTOR_URL + "
            "REVIEW_COLLECTOR_API_KEY (primary) and/or APIFY_TOKEN (fallback)."
        )
        return result

    # Decide whether Crawlee is reachable before spending N attempts.
    crawlee_alive = False
    if crawlee_ready:
        try:
            with CrawleeReviewCollector() as probe:
                crawlee_alive = probe.ping()
        except Exception as exc:
            logger.warning("Crawlee probe failed: %s", exc)
            crawlee_alive = False
        if not crawlee_alive:
            result.warnings.append("crawlee_unreachable")
            logger.warning(
                "review-collector unreachable at %s — Apify fallback only",
                settings.review_collector_url,
            )

    if not crawlee_alive and not apify_ready:
        result.errors.append(
            "review-collector is unreachable and APIFY_TOKEN is not set for fallback."
        )
        return result

    if should_cancel and should_cancel():
        raise ResearchCancelled()

    primary_ctx = CrawleeReviewCollector() if crawlee_alive else nullcontext()
    fallback_ctx = ApifyReviewCollector() if apify_ready else nullcontext()

    with primary_ctx as primary, fallback_ctx as fallback:
        for index, competitor in enumerate(selected, start=1):
            if should_cancel and should_cancel():
                raise ResearchCancelled()

            scrape_result = None
            used_fallback = False

            if primary is not None:
                scrape_result = primary.collect_competitor(
                    competitor,
                    max_reviews=limits.max_reviews_per_competitor,
                )
                if should_cancel and should_cancel():
                    raise ResearchCancelled()
                result.pages_fetched += scrape_result.pages_fetched
                result.errors.extend(scrape_result.errors)
                if (not scrape_result.reviews) and fallback is not None:
                    if should_cancel and should_cancel():
                        raise ResearchCancelled()
                    logger.info(
                        "Crawlee returned 0 reviews for %s — trying Apify fallback",
                        competitor.name,
                    )
                    scrape_result = fallback.collect_competitor(
                        competitor,
                        max_reviews=limits.max_reviews_per_competitor,
                    )
                    used_fallback = True
                    result.pages_fetched += scrape_result.pages_fetched
                    result.errors.extend(scrape_result.errors)
            elif fallback is not None:
                scrape_result = fallback.collect_competitor(
                    competitor,
                    max_reviews=limits.max_reviews_per_competitor,
                )
                used_fallback = True
                result.pages_fetched += scrape_result.pages_fetched
                result.errors.extend(scrape_result.errors)
            else:
                continue

            if should_cancel and should_cancel():
                raise ResearchCancelled()

            if used_fallback:
                result.warnings.append(f"apify_fallback:{competitor.name}")

            saved = save_reviews_batch(
                db,
                competitor_id=competitor.id,
                source=competitor.source,
                reviews=scrape_result.reviews,
            )
            if saved > 0:
                result.competitors_with_reviews += 1
            refresh_competitor_market_stats(db, competitor)
            # Commit per competitor so the Market Map UI (polling listCompetitors)
            # sees rating/reviews_count while collection is still running.
            db.commit()
            result.total_reviews = count_project_reviews(db, project.id)

            if on_progress:
                on_progress(
                    competitors_done=index,
                    competitors_total=len(selected),
                    reviews_collected=result.total_reviews,
                )

            if index < len(selected):
                pause = max(4.0, settings.scraper_request_delay_seconds * 2)
                _sleep_unless_cancelled(pause, should_cancel)

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
