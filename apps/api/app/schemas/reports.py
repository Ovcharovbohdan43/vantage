from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ReportQuote(BaseModel):
    text: str
    rating: int | None = None
    competitor: str | None = None
    source: str | None = None


class ReportPainCluster(BaseModel):
    id: str
    title: str
    description: str | None = None
    frequency: int
    severity_score: float | None = None
    emotional_intensity: float | None = None
    commercial_opportunity: float | None = None
    solution_direction: str | None = None
    quotes: list[ReportQuote] = Field(default_factory=list)


class ReportCompetitorSnapshot(BaseModel):
    id: str
    name: str
    url: str
    source: str
    rating: float | None = None
    reviews_count: int | None = None
    negative_reviews_count: int | None = None
    top_complaints: list[str] = Field(default_factory=list)


class ReportStats(BaseModel):
    reviews_analyzed: int
    pain_signals: int
    products_analyzed: int
    clusters_found: int
    major_problems: int
    confidence_pct: int
    analysis_duration_sec: int | None = None
    time_saved_hours: float


class ReportFeatureIdea(BaseModel):
    pain_addressed: str
    feature_name: str
    how_it_works: str
    why_it_wins: str


class ReportRecommendations(BaseModel):
    verdict: Literal["build", "pivot", "dont_build"] = "pivot"
    reasoning: str = ""
    next_steps: list[str] = Field(default_factory=list)
    feature_ideas: list[ReportFeatureIdea] = Field(default_factory=list)


class ReportIdea(BaseModel):
    title: str
    description: str
    category: str
    target_audience: str | None = None


class ReportScores(BaseModel):
    market_saturation: Literal["HIGH", "MEDIUM", "LOW"]
    market_score: float
    risk_score: float
    data_confidence: Literal["high", "medium", "low"]


class ReportOut(BaseModel):
    id: UUID
    project_id: UUID
    access_level: Literal["preview", "full"]
    idea: ReportIdea
    scores: ReportScores
    summary: str
    recommendations: ReportRecommendations
    pain_clusters: list[ReportPainCluster]
    competitors: list[ReportCompetitorSnapshot]
    stats: ReportStats
    created_at: datetime
    preview_stats: dict | None = None
