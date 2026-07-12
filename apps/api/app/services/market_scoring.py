from __future__ import annotations

from dataclasses import dataclass

from app.db.models import Competitor, PainCluster


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


def infer_verdict(*, market_score: float, risk_score: float, cluster_count: int) -> str:
    if cluster_count == 0:
        return "pivot"
    if market_score >= 62 and risk_score <= 58:
        return "build"
    if market_score < 38 or risk_score >= 78:
        return "dont_build"
    return "pivot"


@dataclass
class HeuristicReport:
    summary: str
    market_saturation: str
    market_score: float
    risk_score: float
    recommendations: dict


def build_heuristic_report(
    *,
    idea_title: str,
    clusters: list[PainCluster],
    competitors: list[Competitor],
    reviews_collected: int,
    warnings: list[str],
) -> HeuristicReport:
    saturation = compute_market_saturation(competitors)
    market_score = compute_market_score(
        market_saturation=saturation,
        clusters=clusters,
        reviews_collected=reviews_collected,
    )
    risk_score = compute_risk_score(market_saturation=saturation, competitors=competitors)
    verdict = infer_verdict(
        market_score=market_score,
        risk_score=risk_score,
        cluster_count=len(clusters),
    )

    if clusters:
        top = clusters[0]
        summary = (
            f"Analysis of '{idea_title}' found {len(clusters)} recurring pain pattern(s) across "
            f"{reviews_collected} collected reviews and {len(competitors)} competitors. "
            f"The strongest signal is “{top.title}” ({top.frequency} mentions). "
        )
    else:
        summary = (
            f"Analysis of '{idea_title}' mapped {len(competitors)} competitors but could not derive "
            f"reliable pain clusters from {reviews_collected} collected reviews. "
            "Treat conclusions as directional only until more review data is available. "
        )

    if warnings:
        summary += f"Data limitations: {', '.join(warnings)}."

    reasoning = (
        f"Market saturation is {saturation} with {len(competitors)} tracked competitors. "
        f"Opportunity score {market_score}/100 and risk score {risk_score}/100 "
        f"based on competitor density and observed user pain signals."
    )

    next_steps = [
        "Interview 5–10 buyers who mentioned the top pain cluster; ask what they tried instead.",
        "Ship a thin wedge MVP that only solves the #1 complaint better than the incumbent.",
        "Position against a named competitor weakness in your landing page headline.",
    ]
    if reviews_collected < 100:
        next_steps.insert(0, "Collect more negative reviews (target 100+) before locking MVP scope.")

    feature_ideas: list[dict] = []
    for cluster in clusters[:4]:
        title = cluster.title or "Recurring complaint"
        direction = (cluster.solution_direction or "").strip()
        feature_ideas.append(
            {
                "pain_addressed": title,
                "feature_name": f"Fix for: {title[:60]}",
                "how_it_works": (
                    direction
                    if len(direction) >= 40
                    else (
                        f"Build a focused workflow in '{idea_title}' that removes “{title}” from the "
                        f"critical path — auto-detect the failure, offer a one-click recovery, and "
                        f"log the outcome so users do not repeat the competitor friction."
                    )
                ),
                "why_it_wins": (
                    f"Competitors keep generating “{title}” complaints "
                    f"({cluster.frequency} signals). Owning a cleaner path here is a wedge."
                ),
            }
        )

    return HeuristicReport(
        summary=summary.strip(),
        market_saturation=saturation,
        market_score=market_score,
        risk_score=risk_score,
        recommendations={
            "verdict": verdict,
            "reasoning": reasoning,
            "next_steps": next_steps,
            "feature_ideas": feature_ideas,
        },
    )


def derive_data_confidence(*, reviews_collected: int, cluster_count: int, warnings: list[str]) -> str:
    if reviews_collected >= 100 and cluster_count >= 3 and "no_reviews_collected" not in warnings:
        return "high"
    if reviews_collected >= 30 and cluster_count >= 1:
        return "medium"
    return "low"
