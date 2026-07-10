from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PainCluster, Project
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.pain_clusters import PainClusterListOut, PainClusterOut

router = APIRouter(prefix="/projects", tags=["pain-clusters"])


async def _get_owned_project(project_id: UUID, user: AuthUser, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _cluster_to_out(row: PainCluster) -> PainClusterOut:
    return PainClusterOut(
        id=row.id,
        project_id=row.project_id,
        title=row.title,
        description=row.description,
        frequency=row.frequency,
        severity_score=row.severity_score,
        emotional_intensity=row.emotional_intensity,
        commercial_opportunity=row.commercial_opportunity,
        solution_direction=row.solution_direction,
        examples=row.examples or [],
        representative_review_ids=row.representative_review_ids or [],
        created_at=row.created_at,
    )


@router.get("/{project_id}/pain-clusters", response_model=PainClusterListOut)
async def list_pain_clusters(
    project_id: UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_project(project_id, user, db)

    count_result = await db.execute(
        select(func.count()).select_from(PainCluster).where(PainCluster.project_id == project_id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(PainCluster)
        .where(PainCluster.project_id == project_id)
        .order_by(PainCluster.frequency.desc(), PainCluster.created_at.asc())
    )
    rows = result.scalars().all()
    return PainClusterListOut(items=[_cluster_to_out(row) for row in rows], total=total)
