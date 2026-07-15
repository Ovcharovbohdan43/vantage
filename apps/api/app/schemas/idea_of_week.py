from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.library import LibraryArticleOut


class IdeaOfWeekSummary(BaseModel):
    id: UUID
    week_start: date
    week_slug: str
    headline: str
    dek: str
    trend_query: str
    selection_score: float
    published_at: datetime | None
    article_slug: str
    article_category: str


class IdeaOfWeekOut(BaseModel):
    id: UUID
    week_start: date
    week_slug: str
    headline: str
    dek: str
    why_this_week: str
    trend_query: str
    trend_data: dict
    selection_score: float
    selection_inputs: dict
    published_at: datetime | None
    article: LibraryArticleOut


class IdeaOfWeekArchiveOut(BaseModel):
    items: list[IdeaOfWeekSummary]
    total: int
