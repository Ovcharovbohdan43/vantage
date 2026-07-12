from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Competitor, PainCluster, Project, Report, ResearchJob
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.projects import (
    JobStats,
    ProjectCreate,
    ProjectListOut,
    ProjectOut,
    ProjectStatusOut,
    ResearchJobOut,
)
from app.schemas.billing import UnlockRequest
from app.services.credits import (
    CreditError,
    assert_can_start_full,
    assert_can_start_preview,
    credit_cost_for_depth,
    get_or_create_profile,
    mark_preview_used,
    refund_credits,
)
from app.services.research_cancel import cancel_research_job
from app.tasks.dispatch import enqueue_research
from app.tasks.research import _derive_title

router = APIRouter(prefix="/projects", tags=["projects"])


def _job_to_out(job: ResearchJob | None) -> ResearchJobOut | None:
    if not job:
        return None
    stats = job.stats or {}
    return ResearchJobOut(
        id=job.id,
        status=job.status,
        stage=job.stage,
        progress_pct=job.progress_pct,
        stats=JobStats(
            competitors_found=stats.get("competitors_found", 0),
            reviews_collected=stats.get("reviews_collected", 0),
            pain_clusters_found=stats.get("pain_clusters_found", 0),
            competitors_scraped=stats.get("competitors_scraped", 0),
            warnings=stats.get("warnings", []) or [],
        ),
        error=job.error,
        started_at=job.started_at,
        completed_at=job.completed_at,
        created_at=job.created_at,
    )


def _project_to_out(project: Project) -> ProjectOut:
    latest_job = project.jobs[0] if project.jobs else None
    return ProjectOut(
        id=project.id,
        title=project.title,
        description=project.description,
        target_audience=project.target_audience,
        category=project.category,
        research_depth=project.research_depth,
        research_mode=project.research_mode,
        research_plan=project.research_plan,
        sources=project.sources or ["g2", "capterra"],
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at,
        latest_job=_job_to_out(latest_job),
    )


async def _reset_project_data(db: AsyncSession, project_id: UUID) -> None:
    await db.execute(delete(Report).where(Report.project_id == project_id))
    await db.execute(delete(PainCluster).where(PainCluster.project_id == project_id))
    await db.execute(delete(Competitor).where(Competitor.project_id == project_id))


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    research_mode = payload.research_mode
    research_depth = payload.research_depth
    research_plan = "preview"

    try:
        if research_mode == "preview":
            profile = await assert_can_start_preview(db, user.id, user.email)
            # Reserve the free preview at start so failed/cancelled runs cannot loop forever.
            mark_preview_used(profile)
            research_depth = "shallow"
        else:
            await assert_can_start_full(db, user.id, user.email, research_depth)
            research_plan = research_depth
    except CreditError as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    project = Project(
        user_id=user.id,
        title=_derive_title(payload.description, payload.title),
        description=payload.description.strip(),
        target_audience=payload.target_audience.strip() if payload.target_audience else None,
        category=payload.category,
        research_depth=research_depth,
        research_mode=research_mode,
        research_plan=research_plan,
        sources=payload.sources,
        analysis_language=payload.analysis_language,
        status="queued",
    )
    db.add(project)
    await db.flush()

    job = ResearchJob(
        project_id=project.id,
        status="queued",
        stage="queued",
        progress_pct=0,
        stats={"competitors_found": 0, "reviews_collected": 0, "pain_clusters_found": 0},
    )
    db.add(job)
    await db.commit()
    await db.refresh(project)

    enqueue_research(str(job.id))

    result = await db.execute(
        select(Project).where(Project.id == project.id).options(selectinload(Project.jobs))
    )
    project = result.scalar_one()
    return _project_to_out(project)


@router.get("", response_model=ProjectListOut)
async def list_projects(
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(Project).where(Project.user_id == user.id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(Project)
        .where(Project.user_id == user.id)
        .options(selectinload(Project.jobs))
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().unique().all()
    return ProjectListOut(items=[_project_to_out(p) for p in projects], total=total)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user.id)
        .options(selectinload(Project.jobs))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return _project_to_out(project)


@router.get("/{project_id}/status", response_model=ProjectStatusOut)
async def get_project_status(
    project_id: UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user.id)
        .options(selectinload(Project.jobs))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if not project.jobs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No research job found")

    latest_job = project.jobs[0]
    job_out = _job_to_out(latest_job)
    assert job_out is not None

    return ProjectStatusOut(project_id=project.id, project_status=project.status, job=job_out)


@router.post("/{project_id}/unlock", response_model=ProjectOut)
async def unlock_project(
    project_id: UUID,
    payload: UnlockRequest,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upgrade a completed preview to a full research run (cost depends on depth)."""
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user.id)
        .options(selectinload(Project.jobs))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.research_mode != "preview":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project is not a preview")

    latest = project.jobs[0] if project.jobs else None
    if not latest or latest.status != "completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Preview is not complete yet")

    try:
        await assert_can_start_full(db, user.id, user.email, payload.research_depth)
    except CreditError as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    await _reset_project_data(db, project.id)
    project.research_mode = "full"
    project.research_depth = payload.research_depth
    project.research_plan = payload.research_depth
    project.status = "queued"

    job = ResearchJob(
        project_id=project.id,
        status="queued",
        stage="queued",
        progress_pct=0,
        stats={"competitors_found": 0, "reviews_collected": 0, "pain_clusters_found": 0},
    )
    db.add(job)
    await db.commit()

    enqueue_research(str(job.id))

    result = await db.execute(
        select(Project).where(Project.id == project.id).options(selectinload(Project.jobs))
    )
    project = result.scalar_one()
    return _project_to_out(project)


@router.post("/{project_id}/cancel", response_model=ProjectOut)
async def cancel_project(
    project_id: UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user.id)
        .options(selectinload(Project.jobs))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    latest = project.jobs[0] if project.jobs else None
    if not latest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No research job found")

    if latest.status not in ("queued", "running"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This analysis is not running and cannot be cancelled.",
        )

    # Only refund if the job never started — cancelling a running job still burns worker/API spend.
    should_refund = project.research_mode == "full" and latest.status == "queued"
    cancel_research_job(db, latest, project)

    if should_refund:
        profile = await get_or_create_profile(db, user.id, user.email)
        refund_credits(profile, credit_cost_for_depth(project.research_depth))

    await db.commit()

    result = await db.execute(
        select(Project).where(Project.id == project.id).options(selectinload(Project.jobs))
    )
    project = result.scalar_one()
    return _project_to_out(project)


@router.post("/{project_id}/retry", response_model=ProjectOut)
async def retry_project(
    project_id: UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id, Project.user_id == user.id)
        .options(selectinload(Project.jobs))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    latest = project.jobs[0] if project.jobs else None
    if latest and latest.status == "running":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Research already running")

    # Every re-run costs credits — including preview projects (previously free forever).
    depth = project.research_depth if project.research_depth in ("shallow", "standard", "deep") else "shallow"
    try:
        await assert_can_start_full(db, user.id, user.email, depth)
    except CreditError as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": exc.code, "message": exc.message},
        ) from exc

    # Paid re-run of a preview upgrades to a full research at the charged depth.
    if project.research_mode == "preview":
        await _reset_project_data(db, project.id)
        project.research_mode = "full"
        project.research_depth = depth
        project.research_plan = depth

    job = ResearchJob(
        project_id=project.id,
        status="queued",
        stage="queued",
        progress_pct=0,
        stats={"competitors_found": 0, "reviews_collected": 0, "pain_clusters_found": 0},
    )
    project.status = "queued"
    db.add(job)
    await db.commit()

    enqueue_research(str(job.id))

    result = await db.execute(
        select(Project).where(Project.id == project.id).options(selectinload(Project.jobs))
    )
    project = result.scalar_one()
    return _project_to_out(project)
