from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

ResearchDepth = Literal["shallow", "standard", "deep"]
ResearchMode = Literal["preview", "full"]
ResearchPlan = Literal["preview", "starter", "founder", "indie"]
ResearchStage = Literal[
    "queued",
    "finding_competitors",
    "collecting_reviews",
    "analyzing",
    "generating_report",
    "completed",
    "failed",
    "cancelled",
]


class JobStats(BaseModel):
    competitors_found: int = 0
    reviews_collected: int = 0
    pain_clusters_found: int = 0
    competitors_scraped: int = 0
    warnings: list[str] = Field(default_factory=list)


class ResearchJobOut(BaseModel):
    id: UUID
    status: str
    stage: ResearchStage
    progress_pct: int
    stats: JobStats
    error: dict | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    title: str = Field(default="", max_length=200)
    description: str = Field(min_length=21)
    target_audience: str | None = None
    category: str = Field(min_length=1)
    research_mode: ResearchMode = "preview"
    research_depth: ResearchDepth = "shallow"
    sources: list[str] = Field(default_factory=lambda: ["g2", "capterra"])
    analysis_language: str = "en"

    @field_validator("sources")
    @classmethod
    def validate_sources(cls, value: list[str]) -> list[str]:
        allowed = {"g2", "capterra"}
        filtered = [s for s in value if s in allowed]
        if not filtered:
            raise ValueError("At least one source (g2 or capterra) is required")
        return filtered

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        return value.strip()


class ProjectOut(BaseModel):
    id: UUID
    title: str
    description: str
    target_audience: str | None
    category: str
    research_depth: str
    research_mode: str
    research_plan: str
    sources: list[str]
    status: str
    created_at: datetime
    updated_at: datetime
    latest_job: ResearchJobOut | None = None

    model_config = {"from_attributes": True}


class ProjectListOut(BaseModel):
    items: list[ProjectOut]
    total: int


class ProjectStatusOut(BaseModel):
    project_id: UUID
    project_status: str
    job: ResearchJobOut
