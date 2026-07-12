from __future__ import annotations

from dataclasses import dataclass

from app.db.models import Competitor, PainCluster
from app.services.report_analytics import opportunity_reasoning_from_analytics


def clamp_score(value: float) -> float:
    return max(0.0, min(100.0, round(value, 1)))


def compute_market_saturation(competitors: list[Competitor]) -> str:
    count = len(competitors)
    ratings = [row.rating for row in competitors if row.rating is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else 0.0

    if count >= 10 and avg_rating >= 4.0:
        return "HIGH"
    if count <= 4:
        return "LOW"
    return "MEDIUM"


def compute_market_score(
    *,
    market_saturation: str,
    clusters: list[PainCluster],
    reviews_collected: int,
) -> float:
    score = 50.0
    if market_saturation == "LOW":
        score += 18
    elif market_saturation == "HIGH":
        score -= 15

    severities = [cluster.severity_score for cluster in clusters if cluster.severity_score is not None]
    if severities:
        score += (sum(severities) / len(severities)) * 2.5

    if reviews_collected >= 100:
        score += 8
    elif reviews_collected == 0:
        score -= 20
    elif reviews_collected < 30:
        score -= 10

    return clamp_score(score)


def compute_risk_score(*, market_saturation: str, competitors: list[Competitor]) -> float:
    score = 40.0
    if market_saturation == "HIGH":
        score += 25
    elif market_saturation == "LOW":
        score -= 10

    if len(competitors) >= 10:
        score += 12
    elif len(competitors) <= 3:
        score -= 8

    ratings = [row.rating for row in competitors if row.rating is not None]
    if ratings and sum(ratings) / len(ratings) >= 4.3:
        score += 8

    return clamp_score(score)


@dataclass
class HeuristicReport:
    summary: str
    market_saturation: str
    market_score: float
    risk_score: float
    recommendations: dict
    opportunity_reasoning: str


def build_heuristic_report(
    *,
    idea_title: str,
    clusters: list[PainCluster],
    competitors: list[Competitor],
    reviews_collected: int,
    warnings: list[str] | None = None,  # kept for call-site compat; never shown to users
) -> HeuristicReport:
    del warnings  # internal only — never append to user-facing summary
    saturation = compute_market_saturation(competitors)
    market_score = compute_market_score(
        market_saturation=saturation,
        clusters=clusters,
        reviews_collected=reviews_collected,
    )
    risk_score = compute_risk_score(market_saturation=saturation, competitors=competitors)

    negative_signals = sum(c.frequency for c in clusters)
    top = clusters[0] if clusters else None
    top_title = top.title if top else None
    top_count = top.frequency if top else 0

    if top:
        summary = (
            f"Here’s what {reviews_collected} unhappy customers said about products near "
            f"“{idea_title}”: {len(clusters)} recurring pain pattern(s) across "
            f"{len(competitors)} competitors. The largest signal is “{top.title}” "
            f"({top.frequency} mentions"
            f"{f', {round(100 * top.frequency / negative_signals, 1)}% of clustered complaints' if negative_signals else ''}"
            f")."
        )
    else:
        summary = (
            f"Mapped {len(competitors)} competitors for “{idea_title}” but could not derive "
            f"reliable pain clusters from {reviews_collected} collected reviews. "
            "Treat conclusions as directional only until more review data is available."
        )

    reasoning = opportunity_reasoning_from_analytics(
        market_score=market_score,
        reviews_analyzed=reviews_collected,
        negative_signals=negative_signals,
        top_cluster_title=top_title,
        top_cluster_count=top_count,
        top_competitor=None,
        top_competitor_count=0,
        trend=None,
    )

    return HeuristicReport(
        summary=summary.strip(),
        market_saturation=saturation,
        market_score=market_score,
        risk_score=risk_score,
        opportunity_reasoning=reasoning,
        recommendations={
            "verdict": "pivot",
            "reasoning": reasoning,
            "next_steps": [],
            "feature_ideas": [],
            "opportunity_reasoning": reasoning,
        },
    )


def derive_data_confidence(*, reviews_collected: int, cluster_count: int, warnings: list[str]) -> str:
    if reviews_collected >= 100 and cluster_count >= 3 and "no_reviews_collected" not in warnings:
        return "high"
    if reviews_collected >= 30 and cluster_count >= 1:
        return "medium"
    return "low"
