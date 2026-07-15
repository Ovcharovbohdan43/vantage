from __future__ import annotations

import logging
import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import (
    Competitor,
    LibraryArticle,
    LibraryArticleRevision,
    PainCluster,
    Project,
    Report,
    ResearchJob,
    Review,
)
from app.services.library_categories import normalize_library_category
from app.services.library_slug import ensure_unique_slug, slugify
from app.services.llm_library_article import build_fallback_library_article, generate_library_article_with_llm
from app.services.llm_library_sanitization import sanitize_library_article
from app.services.llm_cluster_analysis import cluster_examples_list
from app.services.llm_schemas import LibraryArticleDraft

logger = logging.getLogger(__name__)

LIBRARY_GENERATION_VERSION = "public-report-v2"
CONFIDENCE_PCT = {"high": 83, "medium": 68, "low": 48}
PUBLIC_CLUSTER_FIELDS = (
    "mention_count",
    "share_pct",
    "negative_share_pct",
    "emotional_intensity",
    "commercial_opportunity",
    "trend",
    "year_counts",
    "date_coverage",
    "competitors",
    "top_terms",
    "feature_requests",
    "sub_themes",
    "why_opportunity",
)


@dataclass
class LibraryGenerationResult:
    article_id: UUID | None
    status: str
    slug: str | None = None
    error: str | None = None
    revision_id: UUID | None = None


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


def _public_pain_points(draft: LibraryArticleDraft, report: Report) -> list[dict]:
    analytics_by_id = {
        str(cluster.get("id")): cluster
        for cluster in (report.pain_clusters_snapshot or [])
        if cluster.get("id")
    }
    points: list[dict] = []
    for pain in draft.pain_points:
        item = pain.model_dump()
        analytics = analytics_by_id.get(str(pain.cluster_id), {})
        for field in PUBLIC_CLUSTER_FIELDS:
            value = analytics.get(field)
            if value is not None:
                item[field] = value
        # Canonical report values always win over prose-generation inputs.
        item["frequency"] = int(
            analytics.get("frequency")
            or analytics.get("mention_count")
            or item["frequency"]
        )
        item["severity_score"] = float(
            analytics.get("severity_score") or item["severity_score"]
        )
        points.append(item)
    return points


def _public_competitors(report: Report) -> list[dict]:
    return [
        {
            "id": str(item.get("id") or ""),
            "name": str(item.get("name") or "Product"),
            "source": str(item.get("source") or ""),
            "rating": item.get("rating"),
            "reviews_count": item.get("reviews_count"),
        }
        for item in (report.competitors_snapshot or [])
        if item.get("name")
    ]


def _build_content_payload(
    draft: LibraryArticleDraft,
    report: Report,
    sources: list[str],
    *,
    products_analyzed: int,
    reviews_analyzed: int,
    analyzed_at: datetime,
) -> dict:
    pain_points = _public_pain_points(draft, report)
    pain_signals = sum(
        int(point.get("mention_count") or point.get("frequency") or 0)
        for point in pain_points
    )
    major_problems = sum(
        1
        for point in pain_points
        if float(point.get("severity_score") or 0) >= 6
        or int(point.get("mention_count") or point.get("frequency") or 0) >= 10
    )
    recommendations = report.recommendations or {}
    opportunity_size = recommendations.get("opportunity_size") or {}

    return {
        "dataset": {
            "products_analyzed": products_analyzed,
            "reviews_analyzed": reviews_analyzed,
            "sources": [s.upper() for s in sources],
            "rating_range": "1-3",
            "analyzed_at": analyzed_at.isoformat(),
        },
        "scores": {
            "market_score": round(float(report.market_score), 1),
            "risk_score": round(float(report.risk_score), 1),
            "data_confidence": report.data_confidence,
            "confidence_pct": CONFIDENCE_PCT.get(report.data_confidence, 68),
        },
        "stats": {
            "pain_signals": pain_signals,
            "clusters_found": len(pain_points),
            "major_problems": max(major_problems, min(5, len(pain_points))),
            "negative_signals": int(
                opportunity_size.get("negative_signals") or pain_signals
            ),
            "underserved_problems": int(
                opportunity_size.get("underserved_problems") or major_problems
            ),
        },
        "market_saturation": {
            "level": report.market_saturation,
            "competition_level": draft.competition_level,
            "explanation": draft.market_saturation_explanation,
        },
        "pain_points": pain_points,
        "competitors": _public_competitors(report),
        "market_opportunities": [o.model_dump() for o in draft.market_opportunities],
        "risk_analysis": [r.model_dump() for r in draft.risk_analysis],
        "final_takeaway": draft.final_takeaway,
        "generation": {
            "version": LIBRARY_GENERATION_VERSION,
            "numeric_source": "report_snapshot",
        },
    }


def _source_fingerprint(report: Report, article: LibraryArticle) -> str:
    payload = {
        "article_id": str(article.id),
        "version": LIBRARY_GENERATION_VERSION,
        "report_updated_at": report.updated_at.isoformat() if report.updated_at else None,
        "scores": [report.market_score, report.risk_score, report.data_confidence],
        "clusters": report.pain_clusters_snapshot or [],
        "competitors": report.competitors_snapshot or [],
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _build_seo_payload(
    draft: LibraryArticleDraft,
    slug: str,
    *,
    title: str,
    executive_summary: str,
) -> dict:
    canonical = f"{settings.app_web_url.rstrip('/')}/library/{slug}"
    description = draft.seo.description
    seo_title = title if len(title) <= 70 else draft.seo.title
    return {
        "title": seo_title,
        "description": description,
        "slug": slug,
        "canonical_url": canonical,
        "og_title": title,
        "og_description": description,
        "twitter_card": "summary_large_image",
        "json_ld": {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": title,
            "description": description,
            "url": canonical,
            "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
            "author": {"@type": "Organization", "name": "Vantage Research Library"},
            "publisher": {
                "@type": "Organization",
                "name": "Vantage",
                "logo": {
                    "@type": "ImageObject",
                    "url": f"{settings.app_web_url.rstrip('/')}/brand/app-icon-512.png",
                },
            },
            "image": [f"{settings.app_web_url.rstrip('/')}/opengraph-image"],
        },
    }


def generate_library_article_for_project(
    db: Session,
    project_id: UUID,
    *,
    allow_preview: bool = False,
    stage_only: bool = False,
) -> LibraryGenerationResult:
    project = db.get(Project, project_id)
    if not project:
        return LibraryGenerationResult(article_id=None, status="failed", error="project_not_found")

    if project.research_mode != "full" and not allow_preview:
        return LibraryGenerationResult(article_id=None, status="skipped", error="preview_not_published")

    report = db.scalar(select(Report).where(Report.project_id == project_id))
    if not report:
        return LibraryGenerationResult(article_id=None, status="failed", error="report_not_found")

    existing = db.scalar(select(LibraryArticle).where(LibraryArticle.project_id == project_id))
    if stage_only and (not existing or existing.status != "published"):
        return LibraryGenerationResult(
            article_id=existing.id if existing else None,
            status="failed",
            error="stage_requires_published_article",
        )

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
        if existing:
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

    if existing:
        slug = existing.slug
    else:
        base_slug = slugify(draft.seo.slug or title)
        slug = ensure_unique_slug(base_slug, _existing_slugs(db))

    analyzed_at = job.completed_at or datetime.now(UTC)
    content = _build_content_payload(
        draft,
        report,
        sources,
        products_analyzed=len(competitors),
        reviews_analyzed=reviews_collected,
        analyzed_at=analyzed_at,
    )

    seo = _build_seo_payload(draft, slug, title=title, executive_summary=executive_summary)
    reviews_snapshot = _load_reviews_snapshot(db, project_id)

    if stage_only and existing:
        fingerprint = _source_fingerprint(report, existing)
        revision = db.scalar(
            select(LibraryArticleRevision).where(
                LibraryArticleRevision.article_id == existing.id,
                LibraryArticleRevision.generation_version == LIBRARY_GENERATION_VERSION,
                LibraryArticleRevision.source_fingerprint == fingerprint,
            )
        )
        if not revision:
            revision = LibraryArticleRevision(
                article_id=existing.id,
                generation_version=LIBRARY_GENERATION_VERSION,
                source_fingerprint=fingerprint,
                status="staged",
                category=library_category,
                title=title,
                executive_summary=executive_summary,
                content=content,
                seo=seo,
                reviews_snapshot=reviews_snapshot,
                market_saturation=report.market_saturation,
                competition_level=draft.competition_level,
                products_count=len(competitors),
                reviews_count=reviews_collected,
            )
            db.add(revision)
            db.commit()
            db.refresh(revision)
        return LibraryGenerationResult(
            article_id=existing.id,
            revision_id=revision.id,
            status=revision.status,
            slug=existing.slug,
        )

    article = existing
    if not article:
        article = LibraryArticle(project_id=project_id, slug=slug)
        db.add(article)

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
    if article.published_at is None:
        article.published_at = datetime.now(UTC)
    article.generation_error = None
    article.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(article)

    return LibraryGenerationResult(article_id=article.id, status="published", slug=article.slug)


def activate_library_article_revision(
    db: Session,
    revision_id: UUID,
) -> LibraryGenerationResult:
    revision = db.scalar(
        select(LibraryArticleRevision)
        .where(LibraryArticleRevision.id == revision_id)
        .with_for_update()
    )
    if not revision:
        return LibraryGenerationResult(
            article_id=None,
            revision_id=revision_id,
            status="failed",
            error="revision_not_found",
        )

    article = db.scalar(
        select(LibraryArticle)
        .where(LibraryArticle.id == revision.article_id)
        .with_for_update()
    )
    if not article:
        return LibraryGenerationResult(
            article_id=None,
            revision_id=revision.id,
            status="failed",
            error="article_not_found",
        )
    if revision.status == "active":
        return LibraryGenerationResult(
            article_id=article.id,
            revision_id=revision.id,
            status="active",
            slug=article.slug,
        )
    if revision.status != "staged":
        return LibraryGenerationResult(
            article_id=article.id,
            revision_id=revision.id,
            status="failed",
            slug=article.slug,
            error=f"revision_not_staged:{revision.status}",
        )

    canonical_seo = dict(revision.seo or {})
    canonical_url = f"{settings.app_web_url.rstrip('/')}/library/{article.slug}"
    canonical_seo["slug"] = article.slug
    canonical_seo["canonical_url"] = canonical_url
    json_ld = dict(canonical_seo.get("json_ld") or {})
    json_ld["url"] = canonical_url
    json_ld["mainEntityOfPage"] = {"@type": "WebPage", "@id": canonical_url}
    canonical_seo["json_ld"] = json_ld

    active_revisions = db.scalars(
        select(LibraryArticleRevision).where(
            LibraryArticleRevision.article_id == article.id,
            LibraryArticleRevision.status == "active",
        )
    ).all()
    for active in active_revisions:
        active.status = "superseded"

    article.status = "published"
    article.category = revision.category
    article.title = revision.title
    article.executive_summary = revision.executive_summary
    article.content = revision.content
    article.seo = canonical_seo
    article.reviews_snapshot = revision.reviews_snapshot
    article.market_saturation = revision.market_saturation
    article.competition_level = revision.competition_level
    article.products_count = revision.products_count
    article.reviews_count = revision.reviews_count
    article.generation_error = None
    article.updated_at = datetime.now(UTC)

    revision.status = "active"
    revision.activated_at = datetime.now(UTC)
    db.commit()
    db.refresh(article)
    return LibraryGenerationResult(
        article_id=article.id,
        revision_id=revision.id,
        status="active",
        slug=article.slug,
    )
