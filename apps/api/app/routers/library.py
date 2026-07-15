from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.db.models import LibraryArticle, LibraryArticleEvent
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.billing import ShareDraftGenerateRequest
from app.schemas.library import (
    LibraryArticleOut,
    LibraryArticleSummary,
    LibraryEventRequest,
    LibraryListOut,
    LibraryReviewOut,
    LibraryReviewsOut,
)
from app.services.llm_schemas import SocialShareDraft
from app.services.llm_social_share import build_library_share_facts, generate_social_share_draft
from app.services.share_draft_billing import (
    ShareDraftBillingError,
    claim_share_draft_entitlement,
    complete_share_draft_entitlement,
    release_share_draft_entitlement,
)
from app.services.library_categories import LIBRARY_CATEGORIES

router = APIRouter(prefix="/library", tags=["library"])


def _summary(article: LibraryArticle) -> LibraryArticleSummary:
    return LibraryArticleSummary(
        id=article.id,
        slug=article.slug,
        title=article.title,
        category=article.category,
        executive_summary=article.executive_summary,
        market_saturation=article.market_saturation,
        competition_level=article.competition_level,
        products_count=article.products_count,
        reviews_count=article.reviews_count,
        view_count=article.view_count,
        published_at=article.published_at,
    )


@router.get("", response_model=LibraryListOut)
async def list_library_articles(
    q: str | None = None,
    category: str | None = None,
    saturation: str | None = None,
    min_reviews: int | None = Query(default=None, ge=1),
    min_products: int | None = Query(default=None, ge=1),
    sort: str = Query(default="latest"),
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    base = select(LibraryArticle).where(LibraryArticle.status == "published")

    if category:
        base = base.where(LibraryArticle.category == category)
    if saturation:
        base = base.where(LibraryArticle.market_saturation == saturation.upper())
    if min_reviews:
        base = base.where(LibraryArticle.reviews_count >= min_reviews)
    if min_products:
        base = base.where(LibraryArticle.products_count >= min_products)
    if q:
        term = q.strip()
        pattern = f"%{term}%"
        base = base.where(
            or_(
                LibraryArticle.title.ilike(pattern),
                LibraryArticle.executive_summary.ilike(pattern),
                LibraryArticle.category.ilike(pattern),
                LibraryArticle.slug.ilike(pattern),
            )
        )

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    if sort == "popular":
        base = base.order_by(LibraryArticle.view_count.desc(), LibraryArticle.published_at.desc())
    elif sort == "reviews":
        base = base.order_by(LibraryArticle.reviews_count.desc(), LibraryArticle.published_at.desc())
    else:
        base = base.order_by(LibraryArticle.published_at.desc())

    result = await db.execute(base.offset(offset).limit(limit))
    articles = result.scalars().all()

    return LibraryListOut(
        items=[_summary(a) for a in articles],
        total=total,
        categories=LIBRARY_CATEGORIES,
    )


@router.get("/{slug}", response_model=LibraryArticleOut)
async def get_library_article(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(LibraryArticle).where(
            LibraryArticle.slug == slug,
            LibraryArticle.status == "published",
        )
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return article


@router.post("/{slug}/share-draft", response_model=SocialShareDraft)
async def generate_library_share_draft(
    slug: str,
    payload: ShareDraftGenerateRequest,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LibraryArticle).where(
            LibraryArticle.slug == slug,
            LibraryArticle.status == "published",
        )
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    try:
        claim = await claim_share_draft_entitlement(
            db,
            entitlement_id=payload.entitlement_id,
            user_id=user.id,
            source_kind="library",
            source_ref=slug,
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
            build_library_share_facts(article),
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


@router.get("/{slug}/reviews", response_model=LibraryReviewsOut)
async def get_library_reviews(
    slug: str,
    rating: int | None = Query(default=None, ge=1, le=5),
    cluster_id: str | None = None,
    competitor_id: str | None = None,
    q: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LibraryArticle.reviews_snapshot).where(
            LibraryArticle.slug == slug,
            LibraryArticle.status == "published",
        )
    )
    reviews_snapshot = result.scalar_one_or_none()
    if reviews_snapshot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    reviews = list(reviews_snapshot or [])
    if rating is not None:
        reviews = [r for r in reviews if r.get("rating") == rating]
    if cluster_id:
        reviews = [r for r in reviews if cluster_id in (r.get("cluster_ids") or [])]
    if competitor_id:
        reviews = [r for r in reviews if r.get("competitor_id") == competitor_id]
    if q:
        needle = q.strip().lower()
        reviews = [r for r in reviews if needle in (r.get("text") or "").lower()]

    total = len(reviews)
    page = reviews[offset : offset + limit]

    return LibraryReviewsOut(
        items=[
            LibraryReviewOut(
                id=str(r.get("id", "")),
                rating=r.get("rating"),
                text=r.get("text", ""),
                source=r.get("source", "g2"),
                product=r.get("product", "Product"),
                competitor_id=str(r.get("competitor_id", "")),
                cluster_ids=list(r.get("cluster_ids") or []),
            )
            for r in page
        ],
        total=total,
    )


@router.post("/{slug}/events", status_code=status.HTTP_204_NO_CONTENT)
async def track_library_event(
    slug: str,
    payload: LibraryEventRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LibraryArticle).where(
            LibraryArticle.slug == slug,
            LibraryArticle.status == "published",
        )
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    event = LibraryArticleEvent(
        article_id=article.id,
        event_type=payload.event_type,
        event_metadata=payload.metadata,
    )
    db.add(event)

    if payload.event_type == "view":
        article.view_count += 1
    elif payload.event_type == "read_time":
        seconds = int(payload.metadata.get("seconds", 0))
        article.total_read_seconds += max(0, seconds)
    elif payload.event_type == "cta_signup":
        article.cta_signup_clicks += 1
    elif payload.event_type == "cta_research":
        article.cta_research_clicks += 1
    elif payload.event_type == "cta_purchase":
        article.cta_purchase_clicks += 1

    await db.commit()
    return None
