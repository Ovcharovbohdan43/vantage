from dataclasses import dataclass

from app.config import settings
from app.db.models import Project


@dataclass(frozen=True)
class ResearchDepthLimits:
    max_competitors: int
    max_reviews_per_competitor: int


DEPTH_LIMITS: dict[str, ResearchDepthLimits] = {
    "shallow": ResearchDepthLimits(max_competitors=5, max_reviews_per_competitor=50),
    "standard": ResearchDepthLimits(max_competitors=10, max_reviews_per_competitor=100),
    "deep": ResearchDepthLimits(max_competitors=15, max_reviews_per_competitor=200),
}

# Credit-based research plans
PLAN_LIMITS: dict[str, ResearchDepthLimits] = {
    "preview": ResearchDepthLimits(max_competitors=3, max_reviews_per_competitor=5),
    "starter": ResearchDepthLimits(max_competitors=5, max_reviews_per_competitor=100),
    "founder": ResearchDepthLimits(max_competitors=10, max_reviews_per_competitor=300),
    "indie": ResearchDepthLimits(max_competitors=10, max_reviews_per_competitor=300),
}

MIN_REVIEW_LENGTH = 50
MIN_TOTAL_REVIEWS = 100
PREVIEW_MIN_TOTAL_REVIEWS = 5
MIN_COMPETITOR_SUCCESS_RATIO = 0.5
MAX_NEGATIVE_REVIEW_RATING = 3
NEAR_DUPLICATE_COSINE_THRESHOLD = 0.95

CLUSTER_MIN_SIZE: dict[str, int] = {
    "shallow": 8,
    "standard": 5,
    "deep": 3,
}


PLAN_CLUSTER_MIN_SIZE: dict[str, int] = {
    "preview": 2,
    "starter": 5,
    "founder": 3,
    "indie": 3,
}


def get_cluster_min_size(research_depth: str) -> int:
    return CLUSTER_MIN_SIZE.get(research_depth, CLUSTER_MIN_SIZE["standard"])


def get_plan_cluster_min_size(project: Project) -> int:
    if project.research_mode == "preview":
        base = PLAN_LIMITS["preview"]
        limits = get_plan_limits(project)
        if limits.max_reviews_per_competitor >= 50:
            return 6
        return PLAN_CLUSTER_MIN_SIZE["preview"]
    return get_cluster_min_size(project.research_depth or "standard")


def get_depth_limits(research_depth: str) -> ResearchDepthLimits:
    return DEPTH_LIMITS.get(research_depth, DEPTH_LIMITS["standard"])


def get_plan_limits(project: Project) -> ResearchDepthLimits:
    if project.research_mode == "preview":
        base = PLAN_LIMITS["preview"]
        return ResearchDepthLimits(
            max_competitors=base.max_competitors,
            max_reviews_per_competitor=settings.effective_preview_max_reviews(),
        )
    depth = project.research_depth or "shallow"
    return DEPTH_LIMITS.get(depth, DEPTH_LIMITS["shallow"])


def get_min_total_reviews(project: Project) -> int:
    if project.research_mode == "preview":
        limits = get_plan_limits(project)
        if limits.max_reviews_per_competitor >= 50:
            return min(MIN_TOTAL_REVIEWS, limits.max_competitors * limits.max_reviews_per_competitor)
        return PREVIEW_MIN_TOTAL_REVIEWS
    return MIN_TOTAL_REVIEWS
