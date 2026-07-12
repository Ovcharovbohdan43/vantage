from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Competitor, LibraryArticle, PainCluster, Project, Report, ResearchJob, Review
from app.services.library_categories import normalize_library_category
from app.services.library_slug import ensure_unique_slug, slugify
from app.services.llm_library_article import build_fallback_library_article, generate_library_article_with_llm
from app.services.llm_library_sanitization import sanitize_library_article
from app.services.llm_cluster_analysis import cluster_examples_list
from app.services.llm_schemas import LibraryArticleDraft

logger = logging.getLogger(__name__)


@dataclass
class LibraryGenerationResult:
    article_id: UUID | None
    status: str
    slug: str | None = None
    error: str | None = None


def _cluster_ids_for_review(db: Session, project_id: UUID, review_id: str) -> list[str]:
    cluster_ids: list[str] = []
    clusters = db.scalars(select(PainCluster).where(PainCluster.project_id == project_id)).all()
    for cluster in clusters:
        rep_ids = [str(x) for x in (cluster.representative_review_ids or [])]
        examples = cluster_examples_list(cluster.examples)
        if review_id in rep_ids or any(str(ex.get("review_id")) == review_id for ex in examples):
            cluster_ids.append(str(cluster.id))
    return cluster_ids


def _snapshot_from_cluster_examples(db: Session, project_id: UUID) -> list[dict]:
    clusters = db.scalars(
        select(PainCluster).where(PainCluster.project_id == project_id).order_by(PainCluster.frequency.desc())
    ).all()
    snapshot: list[dict] = []
    seen_texts: set[str] = set()
    idx = 0

    for cluster in clusters:
        cid = str(cluster.id)
        for ex in cluster_examples_list(cluster.examples):
            text = (ex.get("text") or "").strip()
            if not text or text in seen_texts:
                continue
            seen_texts.add(text)
            rid = str(ex.get("review_id") or f"cluster-{cid}-{idx}")
            snapshot.append(
                {
                    "id": rid,
                    "rating": ex.get("rating"),
                    "text": text,
                    "source": str(ex.get("source") or "g2").lower(),
                    "product": str(ex.get("competitor") or "Product"),
                    "competitor_id": "",
                    "cluster_ids": [cid],
                    "title": ex.get("title"),
                }
            )
            idx += 1
    return snapshot


def _snapshot_from_article_content(
    content: dict,
    competitors: list[Competitor],
) -> list[dict]:
    pain_points = content.get("pain_points") or []
    snapshot: list[dict] = []
    seen_texts: set[str] = set()
    idx = 0
    comp_names = [c.name for c in competitors] or ["Product"]

    for pain in pain_points:
        cid = str(pain.get("cluster_id") or f"pain-{idx}")
        for q_i, quote in enumerate(pain.get("quotes") or []):
            text = (quote.get("text") or "").strip()
            if not text or text in seen_texts:
                continue
            seen_texts.add(text)
            product = quote.get("product") or comp_names[idx % len(comp_names)]
            if product.lower() in ("analytics software", "product"):
                product = comp_names[idx % len(comp_names)]
            snapshot.append(
                {
                    "id": f"{cid}-{q_i}",
                    "rating": quote.get("rating"),
                    "text": text,
                    "source": str(quote.get("source") or "g2").lower(),
                    "product": product,
                    "competitor_id": "",
                    "cluster_ids": [cid],
                }
            )
            idx += 1
    return snapshot


def build_reviews_snapshot(db: Session, project_id: UUID, article_content: dict | None = None) -> list[dict]:
    """Build evidence snapshot: DB reviews → cluster examples → article quotes."""
    rows = db.execute(
        select(Review, Competitor)
        .join(Competitor, Review.competitor_id == Competitor.id)
        .where(Competitor.project_id == project_id)
        .order_by(Review.rating.asc().nulls_last(), Review.created_at.desc())
    ).all()

    if rows:
        snapshot: list[dict] = []
        for review, competitor in rows:
            rid = str(review.id)
            snapshot.append(
                {
                    "id": rid,
                    "rating": review.rating,
                    "text": review.text,
                    "source": review.source,
                    "product": competitor.name,
                    "competitor_id": str(competitor.id),
                    "cluster_ids": _cluster_ids_for_review(db, project_id, rid),
                    "title": review.title,
                }
            )
        return snapshot

    from_clusters = _snapshot_from_cluster_examples(db, project_id)
    if from_clusters:
        return from_clusters

    competitors = list(db.scalars(select(Competitor).where(Competitor.project_id == project_id)).all())
    content = article_content
    if content is None:
        article = db.scalar(select(LibraryArticle).where(LibraryArticle.project_id == project_id))
        content = article.content if article else {}
    return _snapshot_from_article_content(content or {}, competitors)


def _load_reviews_snapshot(db: Session, project_id: UUID) -> list[dict]:
    return build_reviews_snapshot(db, project_id)


def _existing_slugs(db: Session) -> set[str]:
    return set(db.scalars(select(LibraryArticle.slug)).all())


def _build_content_payload(draft: LibraryArticleDraft, report: Report, sources: list[str]) -> dict:
    return {
        "dataset": {
            "products_analyzed": 0,  # filled by caller
            "reviews_analyzed": 0,
            "sources": [s.upper() for s in sources],
            "rating_range": "1-3",
        },
        "market_saturation": {
            "level": report.market_saturation,
            "competition_level": draft.competition_level,
            "explanation": draft.market_saturation_explanation,
        },
        "pain_points": [p.model_dump() for p in draft.pain_points],
        "market_opportunities": [o.model_dump() for o in draft.market_opportunities],
        "risk_analysis": [r.model_dump() for r in draft.risk_analysis],
        "final_takeaway": draft.final_takeaway,
    }


def _build_seo_payload(
    draft: LibraryArticleDraft,
    slug: str,
    *,
    title: str,
    executive_summary: str,
) -> dict:
    canonical = f"{settings.app_web_url.rstrip('/')}/library/{slug}"
    description = draft.seo.description
    return {
        "title": draft.seo.title,
        "description": description,
        "slug": slug,
        "canonical_url": canonical,
        "og_title": draft.seo.title,
        "og_description": description,
        "twitter_card": "summary_large_image",
        "json_ld": {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": title,
            "description": description,
            "url": canonical,
            "author": {"@type": "Organization", "name": "Vantage Research Library"},
            "publisher": {"@type": "Organization", "name": "Vantage"},
        },
    }


def generate_library_article_for_project(
    db: Session,
    project_id: UUID,
    *,
    allow_preview: bool = False,
) -> LibraryGenerationResult:
    project = db.get(Project, project_id)
    if not project:
        return LibraryGenerationResult(article_id=None, status="failed", error="project_not_found")

    if project.research_mode != "full" and not allow_preview:
        return LibraryGenerationResult(article_id=None, status="skipped", error="preview_not_published")

    report = db.scalar(select(Report).where(Report.project_id == project_id))
    if not report:
        return LibraryGenerationResult(article_id=None, status="failed", error="report_not_found")

    job = db.scalar(
        select(ResearchJob)
        .where(ResearchJob.project_id == project_id)
        .order_by(ResearchJob.created_at.desc())
    )
    stats = (job.stats if job else {}) or {}
    reviews_collected = int(stats.get("reviews_collected", 0))

    competitors = list(
        db.scalars(select(Competitor).where(Competitor.project_id == project_id)).all()
    )
    clusters = list(
        db.scalars(
            select(PainCluster)
            .where(PainCluster.project_id == project_id)
            .order_by(PainCluster.frequency.desc())
        ).all()
    )

    library_category = normalize_library_category(project.category)
    sources = list(project.sources or ["g2"])

    db.commit()

    draft = generate_library_article_with_llm(
        category=project.category,
        library_category=library_category,
        competitors=competitors,
        clusters=clusters,
        report=report,
        reviews_collected=reviews_collected,
        sources=sources,
    )
    if not draft:
        draft = build_fallback_library_article(
            library_category=library_category,
            competitors=competitors,
            clusters=clusters,
            report=report,
            reviews_collected=reviews_collected,
            sources=sources,
        )

    sanitization = sanitize_library_article(draft)
    if not sanitization.is_safe:
        logger.warning("Library article failed sanitization: %s", sanitization.issues)
        existing = db.scalar(select(LibraryArticle).where(LibraryArticle.project_id == project_id))
        if existing:
            existing.status = "failed"
            existing.generation_error = {"issues": sanitization.issues}
            existing.updated_at = datetime.now(UTC)
            db.commit()
            return LibraryGenerationResult(
                article_id=existing.id,
                status="failed",
                error="sanitization_failed",
            )
        return LibraryGenerationResult(article_id=None, status="failed", error="sanitization_failed")

    title = sanitization.sanitized_title
    executive_summary = sanitization.sanitized_executive_summary
    draft.final_takeaway = sanitization.sanitized_final_takeaway

    base_slug = slugify(draft.seo.slug or title)
    slug = ensure_unique_slug(base_slug, _existing_slugs(db))

    content = _build_content_payload(draft, report, sources)
    content["dataset"]["products_analyzed"] = len(competitors)
    content["dataset"]["reviews_analyzed"] = reviews_collected
    content["dataset"]["analyzed_at"] = (job.completed_at or datetime.now(UTC)).isoformat()
    content["final_takeaway"] = draft.final_takeaway

    seo = _build_seo_payload(draft, slug, title=title, executive_summary=executive_summary)
    reviews_snapshot = _load_reviews_snapshot(db, project_id)

    article = db.scalar(select(LibraryArticle).where(LibraryArticle.project_id == project_id))
    if not article:
        article = LibraryArticle(project_id=project_id, slug=slug)
        db.add(article)
    else:
        article.slug = slug

    article.status = "published"
    article.category = library_category
    article.title = title
    article.executive_summary = executive_summary
    article.content = content
    article.seo = seo
    article.reviews_snapshot = reviews_snapshot
    article.market_saturation = report.market_saturation
    article.competition_level = draft.competition_level
    article.products_count = len(competitors)
    article.reviews_count = reviews_collected
    article.published_at = datetime.now(UTC)
    article.generation_error = None
    article.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(article)

    return LibraryGenerationResult(article_id=article.id, status="published", slug=article.slug)
