from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

LibraryCategory = Literal[
    "CRM",
    "Marketing",
    "Finance",
    "AI",
    "Productivity",
    "HR",
    "Analytics",
    "Developer Tools",
    "Cybersecurity",
    "Healthcare",
    "Education",
    "Design",
    "Other",
]

SaturationFilter = Literal["HIGH", "MEDIUM", "LOW"]
SortOption = Literal["latest", "popular", "reviews"]


class LibraryArticleSummary(BaseModel):
    id: UUID
    slug: str
    title: str
    category: str
    executive_summary: str
    market_saturation: str
    competition_level: str
    products_count: int
    reviews_count: int
    view_count: int
    published_at: datetime | None

    model_config = {"from_attributes": True}


class LibraryListOut(BaseModel):
    items: list[LibraryArticleSummary]
    total: int
    categories: list[str]


class LibraryPainQuoteOut(BaseModel):
    text: str
    rating: int
    source: str
    product: str


class LibraryPainPointOut(BaseModel):
    cluster_id: str
    title: str
    frequency: int
    severity_score: float
    explanation: str
    why_critical: str
    quotes: list[LibraryPainQuoteOut]
    supporting_review_ids: list[str]


class LibraryArticleOut(BaseModel):
    id: UUID
    slug: str
    title: str
    category: str
    executive_summary: str
    content: dict
    seo: dict
    market_saturation: str
    competition_level: str
    products_count: int
    reviews_count: int
    view_count: int
    published_at: datetime | None

    model_config = {"from_attributes": True}


class LibraryReviewOut(BaseModel):
    id: str
    rating: int | None
    text: str
    source: str
    product: str
    competitor_id: str
    cluster_ids: list[str] = Field(default_factory=list)


class LibraryReviewsOut(BaseModel):
    items: list[LibraryReviewOut]
    total: int


class LibraryEventRequest(BaseModel):
    event_type: Literal["view", "read_time", "cta_signup", "cta_research", "cta_purchase"]
    metadata: dict = Field(default_factory=dict)
