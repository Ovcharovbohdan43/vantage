import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Competitor, Project
from app.services.llm_competitors import suggest_competitors_with_llm
from app.services.page_fetcher import PageFetcher
from app.services.research_limits import DEPTH_LIMITS as DEPTH_TARGET_COUNTS, get_plan_limits
from app.services.source_validator import ValidatedCompetitorPage, resolve_competitor_page

logger = logging.getLogger(__name__)

MIN_COMPETITORS = 3


@dataclass
class DiscoveryResult:
    competitors: list[ValidatedCompetitorPage]
    attempted: int
    skipped_existing: int
    llm_error: str | None = None


def depth_target(research_depth: str) -> int:
    return DEPTH_TARGET_COUNTS.get(research_depth, DEPTH_TARGET_COUNTS["standard"]).max_competitors


def list_project_competitors(db: Session, project_id: UUID) -> list[Competitor]:
    return list(
        db.scalars(
            select(Competitor).where(Competitor.project_id == project_id).order_by(Competitor.created_at.asc())
        )
    )


def save_competitor(db: Session, project_id: UUID, page: ValidatedCompetitorPage) -> Competitor | None:
    existing_urls = set(
        db.scalars(select(Competitor.url).where(Competitor.project_id == project_id)).all()
    )
    if page.url in existing_urls:
        return None

    competitor = Competitor(
        project_id=project_id,
        name=page.name,
        description=page.description,
        url=page.url,
        category=page.category,
        rating=page.rating,
        reviews_count=page.reviews_count,
        source=page.source,
    )
    db.add(competitor)
    db.flush()
    return competitor


def _validate_suggestion(
    *,
    name: str,
    description: str | None,
    category: str,
    sources: list[str],
) -> ValidatedCompetitorPage | None:
    """Each worker uses its own HTTP client — PageFetcher is not shared across threads."""
    timeout = httpx.Timeout(settings.competitor_http_timeout_seconds)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client, PageFetcher(
        client
    ) as fetcher:
        return resolve_competitor_page(
            fetcher,
            name=name,
            sources=sources,
            description=description,
            category=category,
        )


def discover_competitors_for_project(
    db: Session,
    project: Project,
    *,
    on_found=None,
) -> DiscoveryResult:
    existing = list_project_competitors(db, project.id)
    validated_pages = [
        ValidatedCompetitorPage(
            name=row.name,
            url=row.url,
            source=row.source,
            description=row.description,
            category=row.category,
            rating=row.rating,
            reviews_count=row.reviews_count,
        )
        for row in existing
    ]

    target = get_plan_limits(project).max_competitors
    if len(validated_pages) >= target:
        return DiscoveryResult(
            competitors=validated_pages[:target],
            attempted=0,
            skipped_existing=len(validated_pages),
        )

    if len(validated_pages) >= MIN_COMPETITORS and len(validated_pages) >= target // 2:
        return DiscoveryResult(
            competitors=validated_pages,
            attempted=0,
            skipped_existing=len(validated_pages),
        )

    try:
        suggestions = suggest_competitors_with_llm(
            title=project.title,
            description=project.description,
            category=project.category,
            target_audience=project.target_audience,
            research_depth=project.research_depth,
        )
    except Exception as exc:  # noqa: BLE001 — LLM is best-effort; fall back to manual competitors
        logger.warning("LLM competitor suggestion failed: %s", exc)
        return DiscoveryResult(
            competitors=validated_pages,
            attempted=0,
            skipped_existing=len(existing),
            llm_error=str(exc),
        )

    sources = project.sources or ["g2", "capterra"]
    needed = max(0, target - len(validated_pages))
    # Over-fetch a few validations in parallel so soft-fails don't stall the pipeline.
    to_validate = suggestions[: max(needed + 4, needed)]
    attempted = 0
    concurrency = max(1, min(settings.discovery_concurrency, len(to_validate) or 1))

    if not to_validate:
        return DiscoveryResult(
            competitors=validated_pages,
            attempted=0,
            skipped_existing=len(existing),
        )

    logger.info(
        "Validating %s competitor suggestions with concurrency=%s (need %s more)",
        len(to_validate),
        concurrency,
        needed,
    )

    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        futures = {
            pool.submit(
                _validate_suggestion,
                name=suggestion.name,
                description=suggestion.description,
                category=project.category,
                sources=sources,
            ): suggestion
            for suggestion in to_validate
        }

        for future in as_completed(futures):
            if len(validated_pages) >= target:
                for pending in futures:
                    pending.cancel()
                break

            suggestion = futures[future]
            attempted += 1
            try:
                page = future.result()
            except Exception as exc:  # noqa: BLE001
                logger.info("Competitor validation failed for %s: %s", suggestion.name, exc)
                continue

            if not page:
                logger.info(
                    "Could not live-validate competitor page for %s (likely blocked) — soft-accept skipped",
                    suggestion.name,
                )
                continue

            if any(existing_page.url == page.url for existing_page in validated_pages):
                continue

            saved = save_competitor(db, project.id, page)
            if saved:
                validated_pages.append(page)
                if on_found:
                    on_found(len(validated_pages))

    return DiscoveryResult(
        competitors=validated_pages,
        attempted=attempted,
        skipped_existing=len(existing),
    )


def insufficient_competitors_error(found: int, llm_error: str | None = None) -> dict:
    if llm_error:
        message = (
            "Automatic competitor discovery is unavailable (AI provider error). "
            f"Add at least {MIN_COMPETITORS} competitors manually to continue."
        )
    else:
        message = (
            f"Found only {found} competitor(s) with a valid G2 or Capterra page. "
            f"Add at least {MIN_COMPETITORS} manually or try again with a broader category."
        )
    details: dict = {"found": found, "required": MIN_COMPETITORS}
    if llm_error:
        details["llm_error"] = llm_error
    return {
        "code": "insufficient_competitors",
        "message": message,
        "details": details,
    }
