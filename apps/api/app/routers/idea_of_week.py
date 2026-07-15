from __future__ import annotations

import hmac
from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.db.models import IdeaOfWeekSelection, LibraryArticle
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.billing import ShareDraftGenerateRequest
from app.schemas.idea_of_week import (
    IdeaOfWeekArchiveOut,
    IdeaOfWeekOut,
    IdeaOfWeekSummary,
)
from app.services.idea_of_week import select_idea_of_week
from app.services.llm_schemas import SocialShareDraft
from app.services.llm_social_share import build_idea_share_facts, generate_social_share_draft
from app.services.share_draft_billing import (
    ShareDraftBillingError,
    claim_share_draft_entitlement,
    complete_share_draft_entitlement,
    release_share_draft_entitlement,
)

router = APIRouter(prefix="/idea-of-week", tags=["idea-of-week"])


def _detail(selection: IdeaOfWeekSelection, article: LibraryArticle) -> IdeaOfWeekOut:
    return IdeaOfWeekOut(
        id=selection.id,
        week_start=selection.week_start,
        week_slug=selection.week_slug,
        headline=selection.headline,
        dek=selection.dek,
        why_this_week=selection.why_this_week,
        trend_query=selection.trend_query,
        trend_data=selection.trend_data,
        selection_score=selection.selection_score,
        selection_inputs=selection.selection_inputs,
        published_at=selection.published_at,
        article=article,
    )


async def _published_detail(
    db: AsyncSession,
    *where,
) -> IdeaOfWeekOut:
    row = (
        await db.execute(
            select(IdeaOfWeekSelection, LibraryArticle)
            .join(LibraryArticle, LibraryArticle.id == IdeaOfWeekSelection.article_id)
            .where(
                IdeaOfWeekSelection.status == "published",
                LibraryArticle.status == "published",
                *where,
            )
            .order_by(IdeaOfWeekSelection.week_start.desc())
            .limit(1)
        )
    ).one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Weekly idea not found")
    return _detail(*row)


@router.get("/current", response_model=IdeaOfWeekOut)
async def get_current_idea(db: AsyncSession = Depends(get_db)):
    return await _published_detail(db)


@router.get("/archive", response_model=IdeaOfWeekArchiveOut)
async def get_idea_archive(
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(IdeaOfWeekSelection, LibraryArticle)
        .join(LibraryArticle, LibraryArticle.id == IdeaOfWeekSelection.article_id)
        .where(
            IdeaOfWeekSelection.status == "published",
            LibraryArticle.status == "published",
        )
    )
    total = (
        await db.execute(
            select(func.count()).select_from(
                select(IdeaOfWeekSelection.id)
                .where(IdeaOfWeekSelection.status == "published")
                .subquery()
            )
        )
    ).scalar_one()
    rows = (
        await db.execute(
            base.order_by(IdeaOfWeekSelection.week_start.desc()).offset(offset).limit(limit)
        )
    ).all()
    return IdeaOfWeekArchiveOut(
        items=[
            IdeaOfWeekSummary(
                id=selection.id,
                week_start=selection.week_start,
                week_slug=selection.week_slug,
                headline=selection.headline,
                dek=selection.dek,
                trend_query=selection.trend_query,
                selection_score=selection.selection_score,
                published_at=selection.published_at,
                article_slug=article.slug,
                article_category=article.category,
            )
            for selection, article in rows
        ],
        total=total,
    )


@router.get("/{week}", response_model=IdeaOfWeekOut)
async def get_idea_by_week(week: str, db: AsyncSession = Depends(get_db)):
    return await _published_detail(db, IdeaOfWeekSelection.week_slug == week)


@router.post("/{week}/share-draft", response_model=SocialShareDraft)
async def generate_idea_share_draft(
    week: str,
    payload: ShareDraftGenerateRequest,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    idea = await _published_detail(db, IdeaOfWeekSelection.week_slug == week)
    try:
        claim = await claim_share_draft_entitlement(
            db,
            entitlement_id=payload.entitlement_id,
            user_id=user.id,
            source_kind="idea_of_week",
            source_ref=week,
        )
        await db.commit()
    except ShareDraftBillingError as exc:
        code = status.HTTP_402_PAYMENT_REQUIRED if exc.code == "payment_required" else status.HTTP_409_CONFLICT
        raise HTTPException(status_code=code, detail={"code": exc.code, "message": exc.message}) from exc

    if claim.cached_draft:
        return claim.cached_draft

    try:
        draft = await run_in_threadpool(
            generate_social_share_draft,
            build_idea_share_facts(idea),
        )
        if not draft:
            raise RuntimeError("Share draft generation is unavailable")
    except Exception as exc:
        await release_share_draft_entitlement(
            db,
            entitlement_id=payload.entitlement_id,
            error=str(exc),
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "generation_failed", "message": "Generation failed. You can retry without paying again."},
        ) from exc

    await complete_share_draft_entitlement(
        db,
        entitlement_id=payload.entitlement_id,
        draft=draft,
    )
    await db.commit()
    return draft


@router.post("/internal/select", response_model=IdeaOfWeekOut)
async def run_weekly_selection(
    target_week: date | None = None,
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not settings.idea_of_week_cron_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weekly selection cron is not configured",
        )
    supplied = (authorization or "").removeprefix("Bearer ").strip()
    if not supplied or not hmac.compare_digest(supplied, settings.idea_of_week_cron_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron secret")
    selection = await select_idea_of_week(db, target_week=target_week)
    return await _published_detail(db, IdeaOfWeekSelection.id == selection.id)
