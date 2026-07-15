from typing import Literal

from pydantic import BaseModel, Field


class CompetitorSuggestion(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=400)


class CompetitorSuggestionList(BaseModel):
    competitors: list[CompetitorSuggestion] = Field(min_length=3, max_length=15)


class ClusterQuote(BaseModel):
    text: str = Field(min_length=10, max_length=2000)


class NamedSubTheme(BaseModel):
    index: int = Field(ge=0)
    title: str = Field(min_length=8, max_length=140)


class NamedFeatureRequest(BaseModel):
    label: str = Field(min_length=3, max_length=100)
    candidate_indices: list[int] = Field(min_length=1, max_length=20)


class ClusterAnalysisResult(BaseModel):
    """LLM names pains/subthemes; counts come from code."""

    title: str = Field(min_length=12, max_length=140)
    description: str = Field(min_length=20, max_length=600)
    why_opportunity: str = Field(min_length=20, max_length=500)
    severity_score: float = Field(ge=1, le=10)
    emotional_intensity: float = Field(ge=1, le=10)
    commercial_opportunity: float = Field(ge=1, le=10)
    sub_theme_titles: list[NamedSubTheme] = Field(default_factory=list, max_length=8)
    feature_request_groups: list[NamedFeatureRequest] = Field(default_factory=list, max_length=8)


MarketSaturation = Literal["HIGH", "MEDIUM", "LOW"]
Verdict = Literal["build", "pivot", "dont_build"]  # deprecated — kept for schema compat


class ReportFeatureIdea(BaseModel):
    """Deprecated — kept for older payloads."""

    pain_addressed: str = Field(min_length=3, max_length=160)
    feature_name: str = Field(min_length=3, max_length=100)
    how_it_works: str = Field(min_length=40, max_length=600)
    why_it_wins: str = Field(min_length=20, max_length=400)


class ReportRecommendations(BaseModel):
    """Opportunity narrative only — no build/pivot verdict or interview advice."""

    verdict: Verdict = "pivot"  # unused by UI; default for compat
    reasoning: str = Field(min_length=20, max_length=1600)
    next_steps: list[str] = Field(default_factory=list)
    feature_ideas: list[ReportFeatureIdea] = Field(default_factory=list)


class ReportSynthesisResult(BaseModel):
    summary: str = Field(min_length=40, max_length=1800)
    market_saturation: MarketSaturation
    market_score: float = Field(ge=0, le=100)
    risk_score: float = Field(ge=0, le=100)
    opportunity_reasoning: str = Field(min_length=20, max_length=1200)
    recommendations: ReportRecommendations | None = None


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


class LibraryMvpFeature(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    problem_solved: str = Field(min_length=20, max_length=400)
    solution: str = Field(min_length=20, max_length=500)
    evidence_cluster_ids: list[str] = Field(min_length=1, max_length=12)


class LibraryMvpBlueprint(BaseModel):
    concept_name: str = Field(min_length=3, max_length=100)
    product_concept: str = Field(min_length=40, max_length=800)
    target_user: str = Field(min_length=20, max_length=400)
    value_proposition: str = Field(min_length=30, max_length=500)
    core_workflow: list[str] = Field(min_length=3, max_length=8)
    features: list[LibraryMvpFeature] = Field(min_length=1, max_length=24)
    in_scope: list[str] = Field(min_length=1, max_length=24)
    out_of_scope: list[str] = Field(min_length=1, max_length=12)
    success_metric: str = Field(min_length=20, max_length=300)


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
    mvp_blueprint: LibraryMvpBlueprint
    seo: LibrarySeoMeta


class LibrarySanitizationResult(BaseModel):
    is_safe: bool
    issues: list[str] = Field(default_factory=list)
    sanitized_title: str = Field(min_length=10, max_length=120)
    sanitized_executive_summary: str = Field(min_length=80, max_length=2500)
    sanitized_final_takeaway: str = Field(min_length=40, max_length=1200)
