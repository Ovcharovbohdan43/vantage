from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Competitor, PainCluster, Project, Review
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.reviews import ReviewListOut, ReviewOut

router = APIRouter(prefix="/projects", tags=["reviews"])


@router.get("/{project_id}/reviews", response_model=ReviewListOut)
async def list_reviews(
    project_id: UUID,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    competitor_id: UUID | None = Query(default=None),
    cluster_id: UUID | None = Query(default=None),
    rating: int | None = Query(default=None, ge=1, le=5),
    q: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    project_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user.id)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.research_mode == "preview":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Full review evidence is available after unlocking the report.",
        )

    if competitor_id:
        competitor_result = await db.execute(
            select(Competitor.id).where(
                Competitor.id == competitor_id,
                Competitor.project_id == project_id,
            )
        )
        if not competitor_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competitor not found")

    cluster_review_ids: list[UUID] | None = None
    if cluster_id:
        cluster_result = await db.execute(
            select(PainCluster).where(
                PainCluster.id == cluster_id,
                PainCluster.project_id == project_id,
            )
        )
        cluster = cluster_result.scalar_one_or_none()
        if not cluster:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pain cluster not found")
        cluster_review_ids = []
        for raw_id in cluster.representative_review_ids or []:
            try:
                cluster_review_ids.append(UUID(str(raw_id)))
            except ValueError:
                continue

    base = (
        select(Review, Competitor.name.label("product_name"))
        .join(Competitor, Review.competitor_id == Competitor.id)
        .where(Competitor.project_id == project_id)
    )
    if competitor_id:
        base = base.where(Review.competitor_id == competitor_id)
    if cluster_review_ids is not None:
        if not cluster_review_ids:
            return ReviewListOut(items=[], total=0, limit=limit, offset=offset)
        base = base.where(Review.id.in_(cluster_review_ids))
    if rating is not None:
        base = base.where(Review.rating == rating)
    if q:
        needle = f"%{q.strip()}%"
        base = base.where(Review.text.ilike(needle))

    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    result = await db.execute(
        base.order_by(Review.created_at.desc()).offset(offset).limit(limit)
    )
    rows = result.all()

    items = [
        ReviewOut(
            id=review.id,
            competitor_id=review.competitor_id,
            product=product_name,
            source=review.source,
            rating=review.rating,
            title=review.title,
            text=review.text,
            language=review.language,
            review_date=review.review_date,
            created_at=review.created_at,
        )
        for review, product_name in rows
    ]

    return ReviewListOut(items=items, total=total, limit=limit, offset=offset)
