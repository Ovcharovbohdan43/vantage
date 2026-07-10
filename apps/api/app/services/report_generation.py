from __future__ import annotations

import logging
from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import Competitor, PainCluster, Project, Report
from app.services.competitor_discovery import list_project_competitors
from app.services.llm_cluster_analysis import analyze_cluster_with_llm
from app.services.llm_report_synthesis import synthesize_report_with_llm
from app.services.market_scoring import build_heuristic_report, derive_data_confidence

logger = logging.getLogger(__name__)


@dataclass
class ReportGenerationResult:
    report_id: UUID
    clusters_analyzed: int = 0
    llm_used: bool = False
    warnings: list[str] = field(default_factory=list)


def _cluster_to_snapshot(cluster: PainCluster) -> dict:
    quotes = [
        {
            "text": example.get("text"),
            "rating": example.get("rating"),
            "competitor": example.get("competitor"),
            "source": example.get("source"),
        }
        for example in (cluster.examples or [])[:5]
        if example.get("text")
    ]
    return {
        "id": str(cluster.id),
        "title": cluster.title,
        "description": cluster.description,
        "frequency": cluster.frequency,
        "severity_score": cluster.severity_score,
        "emotional_intensity": cluster.emotional_intensity,
        "commercial_opportunity": cluster.commercial_opportunity,
        "solution_direction": cluster.solution_direction,
        "quotes": quotes,
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


def _apply_cluster_analysis(cluster: PainCluster, project: Project) -> bool:
    analysis = analyze_cluster_with_llm(cluster, project)
    if not analysis:
        return False

    cluster.title = analysis.title
    cluster.description = analysis.description
    cluster.severity_score = analysis.severity_score
    cluster.emotional_intensity = analysis.emotional_intensity
    cluster.commercial_opportunity = analysis.commercial_opportunity
    cluster.solution_direction = analysis.solution_direction

    allowed_texts = [(example.get("text") or "").strip() for example in cluster.examples or []]
    validated_quotes = [
        quote.text.strip()
        for quote in analysis.user_quotes
        if any(
            quote.text.strip() in allowed or allowed in quote.text.strip()
            for allowed in allowed_texts
            if allowed
        )
    ]
    if not validated_quotes and allowed_texts:
        validated_quotes = allowed_texts[:2]

    return True


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
    warnings: list[str],
) -> ReportGenerationResult:
    top_clusters = clusters[:3]
    preview_snapshot = [
        {
            "id": str(cluster.id),
            "title": cluster.title,
            "description": None,
            "frequency": cluster.frequency,
            "severity_score": None,
            "emotional_intensity": None,
            "commercial_opportunity": None,
            "solution_direction": None,
            "quotes": [],
        }
        for cluster in top_clusters
    ]

    total_reviews_available = sum(c.reviews_count or 0 for c in competitors)
    summary = (
        f"We found {len(competitors)} competitors and analyzed {reviews_collected} negative reviews"
        f" (of ~{total_reviews_available:,} available). "
        f"Market saturation looks {market_saturation}. "
        "Unlock the full report for quotes, opportunity analysis, and a build/pivot recommendation."
    )

    db.execute(delete(Report).where(Report.project_id == project.id))
    report = Report(
        project_id=project.id,
        summary=summary,
        market_saturation=market_saturation,
        market_score=market_score,
        risk_score=risk_score,
        data_confidence="low",
        recommendations={"verdict": "pivot", "reasoning": "", "next_steps": []},
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

    # Release the read transaction before slow LLM calls so we don't sit
    # idle-in-transaction (Supabase pooler enforces a statement timeout).
    # expire_on_commit=False keeps the loaded ORM objects usable in memory.
    db.commit()

    llm_used = False
    analyzed = 0
    if project.research_mode != "preview":
        for index, cluster in enumerate(clusters, start=1):
            if _apply_cluster_analysis(cluster, project):
                analyzed += 1
                llm_used = True
            if on_progress:
                on_progress(clusters_done=index, clusters_total=len(clusters))

        synthesis = synthesize_report_with_llm(
            project,
            clusters,
            competitors,
            reviews_collected=reviews_collected,
            warnings=job_warnings,
        )
    else:
        synthesis = None
        job_warnings.append("preview_mode")

    if synthesis:
        llm_used = True
        summary = synthesis.summary
        market_saturation = synthesis.market_saturation
        market_score = synthesis.market_score
        risk_score = synthesis.risk_score
        recommendations = synthesis.recommendations.model_dump()
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
        recommendations = heuristic.recommendations
        if not llm_used:
            job_warnings.append("llm_unavailable")

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
            warnings=job_warnings,
        )

    data_confidence = derive_data_confidence(
        reviews_collected=reviews_collected,
        cluster_count=len(clusters),
        warnings=job_warnings,
    )

    snapshot = [_cluster_to_snapshot(cluster) for cluster in clusters]
    competitor_snapshot = [_competitor_to_snapshot(row) for row in competitors]

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
