from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReviewOut(BaseModel):
    id: UUID
    competitor_id: UUID
    product: str
    source: str
    rating: int | None
    title: str | None
    text: str
    language: str | None
    review_date: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewListOut(BaseModel):
    items: list[ReviewOut]
    total: int
    limit: int
    offset: int
