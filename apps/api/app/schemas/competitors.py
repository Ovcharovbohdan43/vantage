from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.services.review_sources import parse_review_source_url


class CompetitorOut(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    description: str | None
    url: str
    category: str | None
    rating: float | None
    reviews_count: int | None
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CompetitorListOut(BaseModel):
    items: list[CompetitorOut]
    total: int


class CompetitorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=10)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        parsed = parse_review_source_url(value.strip())
        if not parsed:
            raise ValueError("URL must be a G2 or Capterra product page")
        return parsed.url
