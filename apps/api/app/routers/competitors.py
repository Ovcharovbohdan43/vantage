from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Competitor, Project, ResearchJob
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.competitors import CompetitorCreate, CompetitorListOut, CompetitorOut
from app.services.competitor_discovery import MIN_COMPETITORS
from app.services.page_fetcher import PageFetcher
from app.services.source_validator import DEFAULT_HEADERS, validate_manual_competitor_url

router = APIRouter(prefix="/projects", tags=["competitors"])


async def _get_owned_project(project_id: UUID, user: AuthUser, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _competitor_to_out(row: Competitor) -> CompetitorOut:
    return CompetitorOut(
        id=row.id,
        project_id=row.project_id,
        name=row.name,
        description=row.description,
        url=row.url,
        category=row.category,
        rating=row.rating,
        reviews_count=row.reviews_count,
        source=row.source,
        created_at=row.created_at,
    )


@router.get("/{project_id}/competitors", response_model=CompetitorListOut)
async def list_competitors(
    project_id: UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_project(project_id, user, db)

    count_result = await db.execute(
        select(func.count()).select_from(Competitor).where(Competitor.project_id == project_id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Competitor)
        .where(Competitor.project_id == project_id)
        .order_by(Competitor.created_at.asc())
    )
    rows = result.scalars().all()
    return CompetitorListOut(items=[_competitor_to_out(row) for row in rows], total=total)


@router.post("/{project_id}/competitors", response_model=CompetitorOut, status_code=status.HTTP_201_CREATED)
async def add_competitor(
    project_id: UUID,
    payload: CompetitorCreate,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, user, db)

    latest_job_result = await db.execute(
        select(ResearchJob)
        .where(ResearchJob.project_id == project_id)
        .order_by(ResearchJob.created_at.desc())
        .limit(1)
    )
    latest_job = latest_job_result.scalar_one_or_none()
    if not latest_job or latest_job.stage != "failed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Manual competitors can only be added after a failed discovery run",
        )

    timeout = httpx.Timeout(settings.competitor_http_timeout_seconds)
    with httpx.Client(timeout=timeout, follow_redirects=True, headers=DEFAULT_HEADERS) as client, PageFetcher(client) as fetcher:
        try:
            validated = validate_manual_competitor_url(
                fetcher,
                name=payload.name,
                url=payload.url,
                category=project.category,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    existing = await db.execute(
        select(Competitor).where(Competitor.project_id == project_id, Competitor.url == validated.url)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Competitor already added")

    competitor = Competitor(
        project_id=project_id,
        name=validated.name,
        description=validated.description,
        url=validated.url,
        category=validated.category or project.category,
        rating=validated.rating,
        reviews_count=validated.reviews_count,
        source=validated.source,
    )
    db.add(competitor)
    await db.commit()
    await db.refresh(competitor)

    count_result = await db.execute(
        select(func.count()).select_from(Competitor).where(Competitor.project_id == project_id)
    )
    total = count_result.scalar_one()
    if total >= MIN_COMPETITORS and latest_job.error and latest_job.error.get("code") == "insufficient_competitors":
        latest_job.error = {
            **latest_job.error,
            "details": {
                **(latest_job.error.get("details") or {}),
                "found": total,
                "required": MIN_COMPETITORS,
                "ready_to_retry": True,
            },
        }
        await db.commit()

    return _competitor_to_out(competitor)
