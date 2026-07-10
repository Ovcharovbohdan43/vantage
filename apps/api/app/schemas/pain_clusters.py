from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PainClusterExample(BaseModel):
    review_id: str
    text: str
    rating: int | None = None
    competitor: str
    source: str
    title: str | None = None


class PainClusterOut(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: str | None = None
    frequency: int
    severity_score: float | None = None
    emotional_intensity: float | None = None
    commercial_opportunity: float | None = None
    solution_direction: str | None = None
    examples: list[PainClusterExample] = Field(default_factory=list)
    representative_review_ids: list[str] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class PainClusterListOut(BaseModel):
    items: list[PainClusterOut]
    total: int
