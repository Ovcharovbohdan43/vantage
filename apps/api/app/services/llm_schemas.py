from typing import Literal

from pydantic import BaseModel, Field


class CompetitorSuggestion(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=400)


class CompetitorSuggestionList(BaseModel):
    competitors: list[CompetitorSuggestion] = Field(min_length=3, max_length=15)


class ClusterQuote(BaseModel):
    text: str = Field(min_length=10, max_length=2000)


class ClusterAnalysisResult(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=20, max_length=800)
    severity_score: float = Field(ge=1, le=10)
    emotional_intensity: float = Field(ge=1, le=10)
    commercial_opportunity: float = Field(ge=1, le=10)
    solution_direction: str = Field(min_length=10, max_length=400)
    user_quotes: list[ClusterQuote] = Field(min_length=1, max_length=3)


MarketSaturation = Literal["HIGH", "MEDIUM", "LOW"]
Verdict = Literal["build", "pivot", "dont_build"]


class ReportFeatureIdea(BaseModel):
    """Concrete product/service idea that exploits a competitor weakness."""

    pain_addressed: str = Field(min_length=3, max_length=160)
    feature_name: str = Field(min_length=3, max_length=100)
    how_it_works: str = Field(min_length=40, max_length=600)
    why_it_wins: str = Field(min_length=20, max_length=400)


class ReportRecommendations(BaseModel):
    verdict: Verdict
    reasoning: str = Field(min_length=20, max_length=1600)
    next_steps: list[str] = Field(min_length=1, max_length=6)
    feature_ideas: list[ReportFeatureIdea] = Field(min_length=3, max_length=8)


class ReportSynthesisResult(BaseModel):
    summary: str = Field(min_length=40, max_length=2500)
    market_saturation: MarketSaturation
    market_score: float = Field(ge=0, le=100)
    risk_score: float = Field(ge=0, le=100)
    recommendations: ReportRecommendations


# --- Research Library (public articles) ---


class LibraryPainQuote(BaseModel):
    text: str = Field(min_length=10, max_length=2000)
    rating: int = Field(ge=1, le=5)
    source: str = Field(min_length=2, max_length=16)
    product: str = Field(min_length=1, max_length=120)


class LibraryPainPoint(BaseModel):
    cluster_id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=3, max_length=120)
    frequency: int = Field(ge=1)
    severity_score: float = Field(ge=1, le=10)
    explanation: str = Field(min_length=20, max_length=800)
    why_critical: str = Field(min_length=20, max_length=600)
    quotes: list[LibraryPainQuote] = Field(min_length=3, max_length=6)
    supporting_review_ids: list[str] = Field(min_length=1, max_length=50)


class LibraryOpportunity(BaseModel):
    title: str = Field(min_length=5, max_length=120)
    body: str = Field(min_length=20, max_length=600)


RiskLevel = Literal["low", "medium", "high"]


class LibraryRiskItem(BaseModel):
    risk: str = Field(min_length=3, max_length=80)
    level: RiskLevel
    explanation: str = Field(min_length=20, max_length=400)


class LibrarySeoMeta(BaseModel):
    title: str = Field(min_length=10, max_length=70)
    description: str = Field(min_length=40, max_length=160)
    slug: str = Field(min_length=5, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class LibraryArticleDraft(BaseModel):
    """Market-facing article — must NOT reference any user idea or company."""

    title: str = Field(min_length=10, max_length=120)
    executive_summary: str = Field(min_length=80, max_length=2500)
    market_saturation_explanation: str = Field(min_length=40, max_length=800)
    competition_level: RiskLevel
    pain_points: list[LibraryPainPoint] = Field(min_length=1, max_length=12)
    market_opportunities: list[LibraryOpportunity] = Field(min_length=1, max_length=5)
    risk_analysis: list[LibraryRiskItem] = Field(min_length=4, max_length=6)
    final_takeaway: str = Field(min_length=40, max_length=1200)
    seo: LibrarySeoMeta


class LibrarySanitizationResult(BaseModel):
    is_safe: bool
    issues: list[str] = Field(default_factory=list)
    sanitized_title: str = Field(min_length=10, max_length=120)
    sanitized_executive_summary: str = Field(min_length=80, max_length=2500)
    sanitized_final_takeaway: str = Field(min_length=40, max_length=1200)
