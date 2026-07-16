from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BlogPostSummary(BaseModel):
    id: UUID
    slug: str
    title: str
    excerpt: str
    tags: list[str]
    view_count: int
    upvote_count: int
    downvote_count: int
    published_at: datetime | None
    status: str | None = None


class BlogPostOut(BaseModel):
    id: UUID
    slug: str
    title: str
    excerpt: str
    body_md: str
    tags: list[str]
    seo: dict
    view_count: int
    upvote_count: int
    downvote_count: int
    published_at: datetime | None
    status: str
    created_at: datetime
    updated_at: datetime
    user_vote: int | None = None


class BlogListOut(BaseModel):
    items: list[BlogPostSummary]
    total: int
    can_publish: bool = False


class BlogPostCreate(BaseModel):
    title: str = Field(min_length=3, max_length=240)
    excerpt: str = Field(default="", max_length=500)
    body_md: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list, max_length=8)
    slug: str | None = Field(default=None, max_length=120)
    status: str = Field(default="draft", pattern="^(draft|published)$")


class BlogPostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=240)
    excerpt: str | None = Field(default=None, max_length=500)
    body_md: str | None = None
    tags: list[str] | None = Field(default=None, max_length=8)
    slug: str | None = Field(default=None, max_length=120)
    status: str | None = Field(default=None, pattern="^(draft|published)$")


class BlogVoteRequest(BaseModel):
    vote: int = Field(ge=-1, le=1)
    visitor_id: str = Field(min_length=8, max_length=64)


class BlogCanPublishOut(BaseModel):
    can_publish: bool
