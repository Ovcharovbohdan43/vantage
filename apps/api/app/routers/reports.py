from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Competitor, Project, Report, ResearchJob, Review
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.reports import (
    ReportCompetitorSnapshot,
    ReportIdea,
    ReportOut,
    ReportPainCluster,
    ReportQuote,
    ReportRecommendations,
    ReportScores,
    ReportStats,
)

router = APIRouter(prefix="/projects", tags=["reports"])

CONFIDENCE_PCT = {"high": 83, "medium": 68, "low": 48}
MINUTES_PER_REVIEW_MANUAL = 1.35


async def _get_owned_project(project_id: UUID, user: AuthUser, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _competition_level(risk_score: float, saturation: str) -> str:
    if saturation == "HIGH" or risk_score >= 70:
        return "High"
    if saturation == "MEDIUM" or risk_score >= 45:
        return "Medium"
    return "Low"


def _top_complaints_for_competitor(competitor_name: str, pain_clusters: list[dict]) -> list[str]:
    complaints: list[str] = []
    name_lower = competitor_name.lower()
    for cluster in pain_clusters:
        for quote in cluster.get("quotes") or []:
            comp = (quote.get("competitor") or "").lower()
            if comp and (comp in name_lower or name_lower in comp):
                snippet = (quote.get("text") or "")[:120]
                if snippet and snippet not in complaints:
                    complaints.append(snippet)
            if len(complaints) >= 2:
                break
        if len(complaints) >= 2:
            break
    if not complaints:
        for cluster in pain_clusters[:3]:
            title = cluster.get("title")
            if title:
                complaints.append(str(title))
            if len(complaints) >= 2:
                break
    return complaints[:2]


async def _build_report_stats(
    db: AsyncSession,
    project_id: UUID,
    report: Report,
    pain_clusters: list[dict],
) -> ReportStats:
    reviews_count_result = await db.execute(
        select(func.count(Review.id))
        .join(Competitor, Review.competitor_id == Competitor.id)
        .where(Competitor.project_id == project_id)
    )
    reviews_analyzed = reviews_count_result.scalar_one() or 0
    if reviews_analyzed == 0:
        reviews_analyzed = sum(cluster.get("frequency", 0) for cluster in pain_clusters)

    pain_signals = sum(cluster.get("frequency", 0) for cluster in pain_clusters)
    clusters_found = len(pain_clusters)
    major_problems = sum(
        1
        for cluster in pain_clusters
        if (cluster.get("severity_score") or 0) >= 6 or cluster.get("frequency", 0) >= 10
    )
    major_problems = max(major_problems, min(5, clusters_found))

    job_result = await db.execute(
        select(ResearchJob)
        .where(ResearchJob.project_id == project_id)
        .order_by(ResearchJob.created_at.desc())
        .limit(1)
    )
    job = job_result.scalar_one_or_none()
    analysis_duration_sec = None
    if job and job.started_at and job.completed_at:
        analysis_duration_sec = int((job.completed_at - job.started_at).total_seconds())

    competitors_count_result = await db.execute(
        select(func.count(Competitor.id)).where(Competitor.project_id == project_id)
    )
    products_analyzed = competitors_count_result.scalar_one() or len(report.competitors_snapshot or [])

    return ReportStats(
        reviews_analyzed=reviews_analyzed,
        pain_signals=pain_signals,
        products_analyzed=products_analyzed,
        clusters_found=clusters_found,
        major_problems=major_problems,
        confidence_pct=CONFIDENCE_PCT.get(report.data_confidence, 68),
        analysis_duration_sec=analysis_duration_sec,
        time_saved_hours=round((reviews_analyzed * MINUTES_PER_REVIEW_MANUAL) / 60, 1),
    )


async def _enrich_competitors(
    db: AsyncSession,
    project_id: UUID,
    snapshot: list[dict],
    pain_clusters: list[dict],
) -> list[ReportCompetitorSnapshot]:
    enriched: list[ReportCompetitorSnapshot] = []
    for row in snapshot:
        comp_id = row.get("id")
        negative_count = None
        if comp_id:
            try:
                cid = UUID(str(comp_id))
                neg_result = await db.execute(
                    select(func.count(Review.id)).where(
                        Review.competitor_id == cid,
                        Review.rating.is_not(None),
                        Review.rating <= 3,
                    )
                )
                negative_count = neg_result.scalar_one()
            except ValueError:
                negative_count = None

        enriched.append(
            ReportCompetitorSnapshot(
                id=str(row.get("id", "")),
                name=row.get("name", ""),
                url=row.get("url", ""),
                source=row.get("source", ""),
                rating=row.get("rating"),
                reviews_count=row.get("reviews_count"),
                negative_reviews_count=negative_count,
                top_complaints=_top_complaints_for_competitor(row.get("name", ""), pain_clusters),
            )
        )
    return enriched


async def _report_to_out(project: Project, report: Report, db: AsyncSession) -> ReportOut:
    rec = report.recommendations or {}
    access_level = "preview" if project.research_mode == "preview" else "full"
    pain_snapshot = list(report.pain_clusters_snapshot or [])
    competitor_snapshot = list(report.competitors_snapshot or [])
    preview_stats = None

    if access_level == "preview":
        # Server-side paywall — never rely on the UI alone.
        preview_stats = {
            "competitors_found": len(competitor_snapshot),
            "reviews_analyzed": sum(cluster.get("frequency", 0) for cluster in pain_snapshot),
            "top_pain_titles": [cluster.get("title") for cluster in pain_snapshot[:3] if cluster.get("title")],
        }
        # Teaser only: titles + limited competitors, no quotes / verdict / feature ideas.
        pain_snapshot = [
            {
                "id": cluster.get("id", ""),
                "title": cluster.get("title", "Untitled pain"),
                "description": None,
                "frequency": cluster.get("frequency", 0),
                "severity_score": None,
                "emotional_intensity": None,
                "commercial_opportunity": None,
                "solution_direction": None,
                "quotes": [],
            }
            for cluster in pain_snapshot[:3]
        ]
        competitor_snapshot = competitor_snapshot[:3]
        rec = {
            "verdict": "pivot",
            "reasoning": "",
            "next_steps": [],
            "feature_ideas": [],
        }
        summary = (
            report.summary.split(".")[0].strip() + "."
            if report.summary
            else "Unlock the full report for quotes, opportunity analysis, and a build/pivot recommendation."
        )
        if len(summary) < 40:
            summary = (
                "Preview shows market signals only. Unlock the full report for quotes, "
                "opportunity analysis, and a build/pivot recommendation."
            )
    else:
        summary = report.summary

    pain_clusters = [
        ReportPainCluster(
            id=cluster.get("id", ""),
            title=cluster.get("title", "Untitled pain"),
            description=cluster.get("description"),
            frequency=cluster.get("frequency", 0),
            severity_score=cluster.get("severity_score"),
            emotional_intensity=cluster.get("emotional_intensity"),
            commercial_opportunity=cluster.get("commercial_opportunity"),
            solution_direction=cluster.get("solution_direction"),
            quotes=[ReportQuote(**quote) for quote in cluster.get("quotes", [])],
        )
        for cluster in pain_snapshot
    ]

    competitors = await _enrich_competitors(db, project.id, competitor_snapshot, pain_snapshot)
    if access_level == "preview":
        competitors = [
            ReportCompetitorSnapshot(
                id=c.id,
                name=c.name,
                url=c.url,
                source=c.source,
                rating=c.rating,
                reviews_count=c.reviews_count,
                negative_reviews_count=None,
                top_complaints=[],
            )
            for c in competitors
        ]

    stats = await _build_report_stats(db, project.id, report, pain_snapshot)

    return ReportOut(
        id=report.id,
        project_id=report.project_id,
        access_level=access_level,
        idea=ReportIdea(
            title=project.title,
            description=project.description,
            category=project.category,
            target_audience=project.target_audience,
        ),
        scores=ReportScores(
            market_saturation=report.market_saturation,
            market_score=report.market_score if access_level == "full" else min(report.market_score, 55),
            risk_score=report.risk_score if access_level == "full" else max(report.risk_score, 45),
            data_confidence=report.data_confidence,
        ),
        summary=summary,
        recommendations=ReportRecommendations(
            verdict=rec.get("verdict", "pivot"),
            reasoning=rec.get("reasoning", "") if access_level == "full" else "",
            next_steps=(rec.get("next_steps", []) or []) if access_level == "full" else [],
            feature_ideas=(rec.get("feature_ideas", []) or []) if access_level == "full" else [],
        ),
        pain_clusters=pain_clusters,
        competitors=competitors,
        stats=stats,
        created_at=report.created_at,
        preview_stats=preview_stats,
    )


@router.get("/{project_id}/report", response_model=ReportOut)
async def get_project_report(
    project_id: UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, user, db)

    result = await db.execute(select(Report).where(Report.project_id == project_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not ready yet. Complete a research run first.",
        )

    return await _report_to_out(project, report, db)
