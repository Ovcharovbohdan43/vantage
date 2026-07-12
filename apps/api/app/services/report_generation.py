from __future__ import annotations

import logging
from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import Competitor, PainCluster, Project, Report, Review
from app.services.competitor_discovery import list_project_competitors
from app.services.llm_cluster_analysis import (
    analyze_clusters_parallel,
    cluster_examples_list,
    cluster_sub_themes_list,
)
from app.services.llm_report_synthesis import synthesize_report_with_llm
from app.services.llm_schemas import ClusterAnalysisResult
from app.services.market_scoring import build_heuristic_report, derive_data_confidence
from app.services.pain_clustering import nest_subthemes_from_signals
from app.services.report_analytics import (
    ReviewSignal,
    analyze_cluster_reviews,
    build_opportunity_size,
    opportunity_reasoning_from_analytics,
)
from app.services.review_cleaning import CleanedReview

logger = logging.getLogger(__name__)


@dataclass
class ReportGenerationResult:
    report_id: UUID
    clusters_analyzed: int = 0
    llm_used: bool = False
    warnings: list[str] = field(default_factory=list)


def _as_uuid(value: str | UUID) -> UUID | None:
    try:
        return value if isinstance(value, UUID) else UUID(str(value))
    except (ValueError, TypeError):
        return None


def _load_review_signals(db: Session, project_id: UUID) -> dict[UUID, ReviewSignal]:
    rows = db.execute(
        select(Review, Competitor)
        .join(Competitor, Review.competitor_id == Competitor.id)
        .where(Competitor.project_id == project_id)
    ).all()
    out: dict[UUID, ReviewSignal] = {}
    for review, competitor in rows:
        embedding = None
        if review.embedding is not None:
            try:
                embedding = list(review.embedding)
            except TypeError:
                embedding = None
        out[review.id] = ReviewSignal(
            id=review.id,
            text=review.text,
            competitor_name=competitor.name,
            source=review.source,
            rating=review.rating,
            review_date=review.review_date,
            embedding=embedding,
        )
    return out


def _signals_for_cluster(
    cluster: PainCluster,
    by_id: dict[UUID, ReviewSignal],
) -> list[ReviewSignal]:
    signals: list[ReviewSignal] = []
    for raw_id in cluster.representative_review_ids or []:
        rid = _as_uuid(raw_id)
        if rid and rid in by_id:
            signals.append(by_id[rid])
    if signals:
        return signals
    # Fallback: quotes embedded in examples
    for example in cluster_examples_list(cluster.examples):
        rid = _as_uuid(example.get("review_id"))
        if rid and rid in by_id:
            signals.append(by_id[rid])
    return signals


def _ensure_sub_themes(
    cluster: PainCluster,
    signals: list[ReviewSignal],
) -> list:
    existing = cluster_sub_themes_list(cluster.examples)
    if existing:
        from app.services.report_analytics import SubThemeBuilt

        return [
            SubThemeBuilt(
                title_placeholder=str(t.get("title") or "Sub-theme"),
                frequency=int(t.get("frequency") or 0),
                review_ids=[str(x) for x in (t.get("review_ids") or [])],
                examples=list(t.get("examples") or []),
            )
            for t in existing
        ]

    member_ids: list[UUID] = []
    embeddings: list[list[float]] = []
    reviews_by_id: dict[UUID, CleanedReview] = {}
    for signal in signals:
        if not signal.embedding:
            continue
        member_ids.append(signal.id)
        embeddings.append(signal.embedding)
        reviews_by_id[signal.id] = CleanedReview(
            id=signal.id,
            competitor_id=signal.id,  # unused for nesting titles
            competitor_name=signal.competitor_name,
            source=signal.source,
            text=signal.text,
            normalized_text=signal.text.lower(),
            rating=signal.rating,
            title=None,
            author=None,
        )
    return nest_subthemes_from_signals(member_ids, embeddings, reviews_by_id)


def _apply_feature_request_groups(
    analysis: ClusterAnalysisResult,
    request_candidates: list[dict],
) -> list[dict]:
    grouped: list[dict] = []
    for group in analysis.feature_request_groups:
        indices = sorted({i for i in group.candidate_indices if 0 <= i < len(request_candidates)})
        if not indices:
            continue
        grouped.append(
            {
                "label": group.label.strip(),
                "count": len(indices),
                "examples": [request_candidates[i].get("text") for i in indices[:3]],
            }
        )
    grouped.sort(key=lambda item: item["count"], reverse=True)
    return grouped[:8]


def _apply_sub_theme_titles(analysis: ClusterAnalysisResult, sub_themes: list[dict]) -> list[dict]:
    renamed = [dict(theme) for theme in sub_themes]
    for item in analysis.sub_theme_titles:
        if 0 <= item.index < len(renamed):
            renamed[item.index]["title"] = item.title.strip()
    return renamed


def _apply_cluster_analysis_result(
    cluster: PainCluster,
    analysis: ClusterAnalysisResult,
    *,
    analytics: dict,
) -> dict:
    cluster.title = analysis.title
    cluster.description = analysis.description
    cluster.severity_score = analysis.severity_score
    cluster.emotional_intensity = analysis.emotional_intensity
    cluster.commercial_opportunity = analysis.commercial_opportunity
    cluster.solution_direction = None  # no longer LLM "feature advice"

    feature_requests = _apply_feature_request_groups(
        analysis,
        analytics.get("request_candidates") or [],
    )
    sub_themes = _apply_sub_theme_titles(analysis, analytics.get("sub_themes") or [])

    return {
        **analytics,
        "why_opportunity": analysis.why_opportunity,
        "feature_requests": feature_requests,
        "sub_themes": sub_themes,
    }


def _cluster_to_snapshot(cluster: PainCluster, analytics: dict | None = None) -> dict:
    analytics = analytics or {}
    quotes = analytics.get("quotes")
    if not quotes:
        quotes = [
            {
                "text": example.get("text"),
                "rating": example.get("rating"),
                "competitor": example.get("competitor"),
                "source": example.get("source"),
                "review_date": example.get("review_date"),
            }
            for example in cluster_examples_list(cluster.examples)[:20]
            if example.get("text")
        ]
    return {
        "id": str(cluster.id),
        "title": cluster.title,
        "description": cluster.description,
        "frequency": cluster.frequency,
        "mention_count": analytics.get("mention_count", cluster.frequency),
        "share_pct": analytics.get("share_pct"),
        "negative_share_pct": analytics.get("negative_share_pct"),
        "severity_score": cluster.severity_score,
        "emotional_intensity": cluster.emotional_intensity,
        "commercial_opportunity": cluster.commercial_opportunity,
        "solution_direction": cluster.solution_direction,
        "trend": analytics.get("trend"),
        "year_counts": analytics.get("year_counts") or [],
        "date_coverage": analytics.get("date_coverage"),
        "competitors": analytics.get("competitors") or [],
        "top_terms": analytics.get("top_terms") or [],
        "feature_requests": analytics.get("feature_requests") or [],
        "sub_themes": analytics.get("sub_themes") or [],
        "why_opportunity": analytics.get("why_opportunity"),
        "quotes": quotes[:20],
    }


def _competitor_to_snapshot(row: Competitor) -> dict:
    return {
        "id": str(row.id),
        "name": row.name,
        "url": row.url,
        "source": row.source,
        "rating": row.rating,
        "reviews_count": row.reviews_count,
    }


def _save_preview_report(
    db: Session,
    project: Project,
    *,
    clusters: list[PainCluster],
    competitors: list[Competitor],
    reviews_collected: int,
    market_saturation: str,
    market_score: float,
    risk_score: float,
    opportunity_size: dict,
    warnings: list[str],
) -> ReportGenerationResult:
    top_clusters = clusters[:3]
    preview_snapshot = [
        {
            "id": str(cluster.id),
            "title": cluster.title,
            "description": None,
            "frequency": cluster.frequency,
            "mention_count": cluster.frequency,
            "share_pct": None,
            "severity_score": None,
            "emotional_intensity": None,
            "commercial_opportunity": None,
            "solution_direction": None,
            "quotes": [],
            "sub_themes": [],
            "competitors": [],
            "top_terms": [],
            "feature_requests": [],
        }
        for cluster in top_clusters
    ]

    total_reviews_available = sum(c.reviews_count or 0 for c in competitors)
    summary = (
        f"We found {len(competitors)} competitors and analyzed {reviews_collected} negative reviews"
        f" (of ~{total_reviews_available:,} available). "
        f"Market saturation looks {market_saturation}. "
        "Unlock the full report for complaint breakdowns, competitor tables, and customer quotes."
    )

    reasoning = (
        f"Opportunity score {market_score:.0f}/100 from early market signals. "
        "Unlock the full report for the full evidence trail."
    )

    db.execute(delete(Report).where(Report.project_id == project.id))
    report = Report(
        project_id=project.id,
        summary=summary,
        market_saturation=market_saturation,
        market_score=market_score,
        risk_score=risk_score,
        data_confidence="low",
        recommendations={
            "verdict": "pivot",
            "reasoning": reasoning,
            "next_steps": [],
            "feature_ideas": [],
            "opportunity_reasoning": reasoning,
            "opportunity_size": opportunity_size,
        },
        pain_clusters_snapshot=preview_snapshot,
        competitors_snapshot=[_competitor_to_snapshot(row) for row in competitors[:3]],
    )
    db.add(report)
    db.flush()

    return ReportGenerationResult(
        report_id=report.id,
        clusters_analyzed=0,
        llm_used=False,
        warnings=warnings,
    )


def generate_report_for_project(
    db: Session,
    project: Project,
    *,
    reviews_collected: int,
    warnings: list[str] | None = None,
    on_progress=None,
) -> ReportGenerationResult:
    job_warnings = list(warnings or [])
    competitors = list_project_competitors(db, project.id)
    clusters = list(
        db.scalars(
            select(PainCluster)
            .where(PainCluster.project_id == project.id)
            .order_by(PainCluster.frequency.desc(), PainCluster.created_at.asc())
        ).all()
    )
    review_signals = _load_review_signals(db, project.id)

    # Analytics before LLM (and before releasing the transaction).
    negative_signals = sum(c.frequency for c in clusters) or reviews_collected
    reviews_analyzed = max(reviews_collected, len(review_signals))
    cluster_analytics: dict[str, dict] = {}

    for cluster in clusters:
        signals = _signals_for_cluster(cluster, review_signals)
        sub_themes = _ensure_sub_themes(cluster, signals)
        analytics = analyze_cluster_reviews(
            signals,
            reviews_analyzed=reviews_analyzed,
            negative_signals=max(negative_signals, 1),
            sub_themes=sub_themes,
            quote_limit=20,
        )
        cluster_analytics[str(cluster.id)] = {
            "mention_count": analytics.mention_count,
            "share_pct": analytics.share_pct,
            "negative_share_pct": analytics.negative_share_pct,
            "competitors": analytics.competitors,
            "year_counts": analytics.year_counts,
            "date_coverage": analytics.date_coverage,
            "trend": analytics.trend,
            "top_terms": analytics.top_terms,
            "request_candidates": analytics.request_candidates,
            "quotes": analytics.quotes,
            "sub_themes": analytics.sub_themes,
            "feature_requests": [],
            "why_opportunity": None,
        }

    major_problems = sum(
        1
        for cluster in clusters
        if (cluster.severity_score or 0) >= 6 or cluster.frequency >= 10
    )
    opportunity_size = build_opportunity_size(
        reviews_analyzed=reviews_analyzed,
        negative_signals=negative_signals,
        clusters_found=len(clusters),
        major_problem_count=major_problems,
    )
    opportunity_size_dict = {
        "reviews_analyzed": opportunity_size.reviews_analyzed,
        "negative_signals": opportunity_size.negative_signals,
        "clusters_found": opportunity_size.clusters_found,
        "underserved_problems": opportunity_size.underserved_problems,
    }

    # Release the read transaction before slow LLM calls.
    db.commit()

    llm_used = False
    analyzed = 0
    if project.research_mode != "preview" and clusters:
        llm_items = [
            (cluster, project, cluster_analytics.get(str(cluster.id)))
            for cluster in clusters
        ]
        if on_progress:
            on_progress(clusters_done=0, clusters_total=len(clusters))
        analyses = analyze_clusters_parallel(llm_items)
        for cluster in clusters:
            analysis = analyses.get(str(cluster.id))
            if not analysis:
                continue
            enriched = _apply_cluster_analysis_result(
                cluster,
                analysis,
                analytics=cluster_analytics[str(cluster.id)],
            )
            cluster_analytics[str(cluster.id)] = enriched
            analyzed += 1
            llm_used = True
        if on_progress:
            on_progress(clusters_done=len(clusters), clusters_total=len(clusters))

        opportunities_summary = [
            {
                "title": cluster.title,
                "mention_count": cluster_analytics[str(cluster.id)].get("mention_count"),
                "share_pct": cluster_analytics[str(cluster.id)].get("share_pct"),
                "trend": cluster_analytics[str(cluster.id)].get("trend"),
                "top_competitor": (
                    (cluster_analytics[str(cluster.id)].get("competitors") or [{}])[0].get("name")
                    if cluster_analytics[str(cluster.id)].get("competitors")
                    else None
                ),
                "feature_requests": [
                    fr.get("label")
                    for fr in (cluster_analytics[str(cluster.id)].get("feature_requests") or [])[:4]
                ],
                "why_opportunity": cluster_analytics[str(cluster.id)].get("why_opportunity"),
            }
            for cluster in clusters[:8]
        ]
        synthesis = synthesize_report_with_llm(
            project,
            clusters,
            competitors,
            reviews_collected=reviews_collected,
            analytics_payload={
                "opportunity_size": opportunity_size_dict,
                "opportunities_summary": opportunities_summary,
            },
        )
    else:
        synthesis = None
        if project.research_mode == "preview":
            job_warnings.append("preview_mode")

    opportunity_reasoning = None
    if synthesis:
        llm_used = True
        summary = synthesis.summary
        market_saturation = synthesis.market_saturation
        market_score = synthesis.market_score
        risk_score = synthesis.risk_score
        opportunity_reasoning = synthesis.opportunity_reasoning
        recommendations = {
            "verdict": "pivot",
            "reasoning": opportunity_reasoning,
            "next_steps": [],
            "feature_ideas": [],
            "opportunity_reasoning": opportunity_reasoning,
            "opportunity_size": opportunity_size_dict,
        }
    else:
        heuristic = build_heuristic_report(
            idea_title=project.title,
            clusters=clusters,
            competitors=competitors,
            reviews_collected=reviews_collected,
            warnings=job_warnings,
        )
        summary = heuristic.summary
        market_saturation = heuristic.market_saturation
        market_score = heuristic.market_score
        risk_score = heuristic.risk_score
        opportunity_reasoning = heuristic.opportunity_reasoning
        recommendations = {
            **heuristic.recommendations,
            "opportunity_size": opportunity_size_dict,
        }
        if not llm_used and project.research_mode != "preview":
            job_warnings.append("llm_unavailable")

    if not opportunity_reasoning and clusters:
        top = clusters[0]
        top_analytics = cluster_analytics.get(str(top.id), {})
        top_comp = (top_analytics.get("competitors") or [{}])[0]
        opportunity_reasoning = opportunity_reasoning_from_analytics(
            market_score=market_score,
            reviews_analyzed=reviews_analyzed,
            negative_signals=negative_signals,
            top_cluster_title=top.title,
            top_cluster_count=top.frequency,
            top_competitor=top_comp.get("name"),
            top_competitor_count=int(top_comp.get("complaints") or 0),
            trend=top_analytics.get("trend"),
        )
        recommendations["opportunity_reasoning"] = opportunity_reasoning
        recommendations["reasoning"] = opportunity_reasoning

    if project.research_mode == "preview":
        return _save_preview_report(
            db,
            project,
            clusters=clusters,
            competitors=competitors,
            reviews_collected=reviews_collected,
            market_saturation=market_saturation,
            market_score=market_score,
            risk_score=risk_score,
            opportunity_size=opportunity_size_dict,
            warnings=job_warnings,
        )

    data_confidence = derive_data_confidence(
        reviews_collected=reviews_collected,
        cluster_count=len(clusters),
        warnings=job_warnings,
    )

    snapshot = [
        _cluster_to_snapshot(cluster, cluster_analytics.get(str(cluster.id)))
        for cluster in clusters
    ]
    competitor_snapshot = [_competitor_to_snapshot(row) for row in competitors]

    # Persist LLM-renamed titles back onto ORM clusters.
    for cluster in clusters:
        db.merge(cluster)

    db.execute(delete(Report).where(Report.project_id == project.id))
    report = Report(
        project_id=project.id,
        summary=summary,
        market_saturation=market_saturation,
        market_score=market_score,
        risk_score=risk_score,
        data_confidence=data_confidence,
        recommendations=recommendations,
        pain_clusters_snapshot=snapshot,
        competitors_snapshot=competitor_snapshot,
    )
    db.add(report)
    db.flush()

    logger.info(
        "Report generated for project %s: clusters=%s analyzed=%s llm=%s confidence=%s",
        project.id,
        len(clusters),
        analyzed,
        llm_used,
        data_confidence,
    )

    return ReportGenerationResult(
        report_id=report.id,
        clusters_analyzed=analyzed,
        llm_used=llm_used,
        warnings=job_warnings,
    )
