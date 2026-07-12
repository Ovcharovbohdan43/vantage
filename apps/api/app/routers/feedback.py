from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AppFeedback, Project
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.feedback import (
    ALLOWED_FEEDBACK_TAGS,
    FeedbackCreate,
    FeedbackOut,
    FeedbackStatusOut,
)
from app.services.credits import get_or_create_profile

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/status", response_model=FeedbackStatusOut)
async def feedback_status(
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AppFeedback.id).where(AppFeedback.user_id == user.id))
    return FeedbackStatusOut(submitted=result.scalar_one_or_none() is not None)


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackCreate,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(AppFeedback.id).where(AppFeedback.user_id == user.id))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Feedback already submitted",
        )

    tags = [t for t in payload.tags if t in ALLOWED_FEEDBACK_TAGS]
    message = (payload.message or "").strip()
    if not tags and not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pick at least one tag or write a short note",
        )

    project_id: UUID | None = None
    if payload.project_id:
        try:
            project_uuid = UUID(payload.project_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid project_id") from exc
        project = await db.scalar(
            select(Project).where(Project.id == project_uuid, Project.user_id == user.id)
        )
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        project_id = project_uuid

    await get_or_create_profile(db, user.id, user.email)

    row = AppFeedback(
        user_id=user.id,
        project_id=project_id,
        tags=tags,
        message=message,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return FeedbackOut(id=str(row.id), submitted=True)
