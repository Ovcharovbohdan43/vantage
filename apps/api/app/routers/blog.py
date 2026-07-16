from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BlogPost, BlogPostVote
from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user, get_optional_user
from app.schemas.blog import (
    BlogCanPublishOut,
    BlogListOut,
    BlogPostCreate,
    BlogPostOut,
    BlogPostSummary,
    BlogPostUpdate,
    BlogVoteRequest,
)
from app.services.blog_owner import is_blog_owner, require_blog_owner
from app.services.blog_seo import build_blog_seo, slugify

router = APIRouter(prefix="/blog", tags=["blog"])


def _summary(post: BlogPost, *, include_status: bool = False) -> BlogPostSummary:
    return BlogPostSummary(
        id=post.id,
        slug=post.slug,
        title=post.title,
        excerpt=post.excerpt,
        tags=list(post.tags or []),
        view_count=post.view_count,
        upvote_count=post.upvote_count,
        downvote_count=post.downvote_count,
        published_at=post.published_at,
        status=post.status if include_status else None,
    )


def _out(post: BlogPost, *, user_vote: int | None = None) -> BlogPostOut:
    return BlogPostOut(
        id=post.id,
        slug=post.slug,
        title=post.title,
        excerpt=post.excerpt,
        body_md=post.body_md,
        tags=list(post.tags or []),
        seo=post.seo or {},
        view_count=post.view_count,
        upvote_count=post.upvote_count,
        downvote_count=post.downvote_count,
        published_at=post.published_at,
        status=post.status,
        created_at=post.created_at,
        updated_at=post.updated_at,
        user_vote=user_vote,
    )


def _voter_key(user: AuthUser | None, visitor_id: str | None) -> str:
    if user:
        return f"user:{user.id}"
    if visitor_id:
        return f"visitor:{visitor_id.strip()}"
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="visitor_id required")


async def _unique_slug(db: AsyncSession, base: str, *, exclude_id: UUID | None = None) -> str:
    candidate = slugify(base)
    suffix = 1
    while True:
        query = select(BlogPost.id).where(BlogPost.slug == candidate)
        if exclude_id:
            query = query.where(BlogPost.id != exclude_id)
        exists = (await db.execute(query)).scalar_one_or_none()
        if not exists:
            return candidate
        suffix += 1
        candidate = f"{slugify(base)}-{suffix}"


@router.get("/can-publish", response_model=BlogCanPublishOut)
async def blog_can_publish(user: AuthUser = Depends(get_current_user)):
    return BlogCanPublishOut(can_publish=is_blog_owner(user))


@router.get("/posts", response_model=BlogListOut)
async def list_blog_posts(
    q: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    include_drafts: bool = False,
    db: AsyncSession = Depends(get_db),
    user: AuthUser | None = Depends(get_optional_user),
):
    owner = user is not None and is_blog_owner(user)
    if include_drafts and not owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Drafts are owner-only")

    base = select(BlogPost)
    if include_drafts and owner:
        base = base.where(BlogPost.author_id == user.id)  # type: ignore[union-attr]
    else:
        base = base.where(BlogPost.status == "published")

    if q:
        term = q.strip()
        pattern = f"%{term}%"
        base = base.where(
            or_(
                BlogPost.title.ilike(pattern),
                BlogPost.excerpt.ilike(pattern),
                BlogPost.body_md.ilike(pattern),
            )
        )

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(BlogPost.published_at.desc().nullslast(), BlogPost.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    posts = result.scalars().all()

    return BlogListOut(
        items=[_summary(p, include_status=include_drafts and owner) for p in posts],
        total=total,
        can_publish=owner,
    )


@router.get("/posts/{slug}", response_model=BlogPostOut)
async def get_blog_post(
    slug: str,
    visitor_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: AuthUser | None = Depends(get_optional_user),
):
    owner = user is not None and is_blog_owner(user)
    query = select(BlogPost).where(BlogPost.slug == slug)
    if not owner:
        query = query.where(BlogPost.status == "published")

    post = (await db.execute(query)).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    user_vote = None
    if visitor_id or user:
        key = _voter_key(user, visitor_id)
        vote_row = (
            await db.execute(
                select(BlogPostVote).where(
                    BlogPostVote.post_id == post.id,
                    BlogPostVote.voter_key == key,
                )
            )
        ).scalar_one_or_none()
        if vote_row:
            user_vote = vote_row.vote

    return _out(post, user_vote=user_vote)


@router.post("/posts", response_model=BlogPostOut, status_code=status.HTTP_201_CREATED)
async def create_blog_post(
    payload: BlogPostCreate,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_blog_owner(user)
    slug = await _unique_slug(db, payload.slug or payload.title)
    now = datetime.now(UTC)
    published_at = now if payload.status == "published" else None
    seo = build_blog_seo(slug=slug, title=payload.title, excerpt=payload.excerpt)

    post = BlogPost(
        author_id=user.id,
        slug=slug,
        title=payload.title.strip(),
        excerpt=payload.excerpt.strip(),
        body_md=payload.body_md,
        tags=[t.strip() for t in payload.tags if t.strip()][:8],
        status=payload.status,
        seo=seo,
        published_at=published_at,
    )
    db.add(post)
    await db.flush()
    return _out(post)


@router.patch("/posts/{slug}", response_model=BlogPostOut)
async def update_blog_post(
    slug: str,
    payload: BlogPostUpdate,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_blog_owner(user)
    post = (
        await db.execute(select(BlogPost).where(BlogPost.slug == slug, BlogPost.author_id == user.id))
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    if payload.title is not None:
        post.title = payload.title.strip()
    if payload.excerpt is not None:
        post.excerpt = payload.excerpt.strip()
    if payload.body_md is not None:
        post.body_md = payload.body_md
    if payload.tags is not None:
        post.tags = [t.strip() for t in payload.tags if t.strip()][:8]
    if payload.slug is not None and payload.slug.strip():
        post.slug = await _unique_slug(db, payload.slug, exclude_id=post.id)
    if payload.status is not None:
        was_published = post.status == "published"
        post.status = payload.status
        if payload.status == "published" and not was_published:
            post.published_at = datetime.now(UTC)
        if payload.status == "draft":
            post.published_at = None

    post.seo = build_blog_seo(slug=post.slug, title=post.title, excerpt=post.excerpt)
    post.updated_at = datetime.now(UTC)
    await db.flush()
    return _out(post)


@router.delete("/posts/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog_post(
    slug: str,
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    require_blog_owner(user)
    post = (
        await db.execute(select(BlogPost).where(BlogPost.slug == slug, BlogPost.author_id == user.id))
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    await db.execute(delete(BlogPostVote).where(BlogPostVote.post_id == post.id))
    await db.delete(post)
    await db.flush()


@router.post("/posts/{slug}/view", response_model=BlogPostOut)
async def record_blog_view(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    post = (
        await db.execute(
            select(BlogPost).where(BlogPost.slug == slug, BlogPost.status == "published")
        )
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post.view_count += 1
    post.updated_at = datetime.now(UTC)
    await db.flush()
    return _out(post)


@router.post("/posts/{slug}/vote", response_model=BlogPostOut)
async def vote_blog_post(
    slug: str,
    payload: BlogVoteRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthUser | None = Depends(get_optional_user),
):
    post = (
        await db.execute(
            select(BlogPost).where(BlogPost.slug == slug, BlogPost.status == "published")
        )
    ).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    key = _voter_key(user, payload.visitor_id)
    existing = (
        await db.execute(
            select(BlogPostVote).where(BlogPostVote.post_id == post.id, BlogPostVote.voter_key == key)
        )
    ).scalar_one_or_none()

    if payload.vote == 0:
        if existing:
            if existing.vote == 1:
                post.upvote_count = max(0, post.upvote_count - 1)
            elif existing.vote == -1:
                post.downvote_count = max(0, post.downvote_count - 1)
            await db.delete(existing)
    elif existing:
        if existing.vote != payload.vote:
            if existing.vote == 1:
                post.upvote_count = max(0, post.upvote_count - 1)
            else:
                post.downvote_count = max(0, post.downvote_count - 1)
            if payload.vote == 1:
                post.upvote_count += 1
            else:
                post.downvote_count += 1
            existing.vote = payload.vote
    else:
        db.add(BlogPostVote(post_id=post.id, voter_key=key, vote=payload.vote))
        if payload.vote == 1:
            post.upvote_count += 1
        else:
            post.downvote_count += 1

    post.updated_at = datetime.now(UTC)
    await db.flush()

    user_vote = None
    if payload.vote != 0:
        user_vote = payload.vote
    elif existing:
        refreshed = (
            await db.execute(
                select(BlogPostVote).where(BlogPostVote.post_id == post.id, BlogPostVote.voter_key == key)
            )
        ).scalar_one_or_none()
        user_vote = refreshed.vote if refreshed else None

    return _out(post, user_vote=user_vote)
