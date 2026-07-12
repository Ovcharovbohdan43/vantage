from uuid import uuid4

from app.db.models import Competitor, PainCluster
from app.services.market_scoring import (
    build_heuristic_report,
    compute_market_saturation,
    derive_data_confidence,
)


def _competitor(name: str, rating: float) -> Competitor:
    return Competitor(
        id=uuid4(),
        project_id=uuid4(),
        name=name,
        description=None,
        url=f"https://g2.com/products/{name.lower()}/reviews",
        category="Productivity",
        rating=rating,
        reviews_count=500,
        source="g2",
    )


def _cluster(title: str, frequency: int, severity: float) -> PainCluster:
    return PainCluster(
        id=uuid4(),
        project_id=uuid4(),
        title=title,
        description=f"Users complain about {title.lower()}",
        frequency=frequency,
        severity_score=severity,
        examples=[{"text": "Sample quote about the issue.", "rating": 2, "competitor": "Asana"}],
        representative_review_ids=[],
    )


def test_market_saturation_high_for_crowded_market() -> None:
    competitors = [_competitor(f"P{i}", 4.5) for i in range(10)]
    assert compute_market_saturation(competitors) == "HIGH"


def test_market_saturation_low_for_few_competitors() -> None:
    competitors = [_competitor("Solo", 4.0)]
    assert compute_market_saturation(competitors) == "LOW"


def test_heuristic_report_handles_zero_clusters() -> None:
    report = build_heuristic_report(
        idea_title="Test idea",
        clusters=[],
        competitors=[_competitor("A", 4.2)],
        reviews_collected=0,
        warnings=["no_reviews_collected", "apify_fallback:Acme"],
    )
    assert "apify_fallback" not in report.summary
    assert "Data limitations" not in report.summary
    assert report.recommendations["next_steps"] == []
    assert report.recommendations["feature_ideas"] == []
    assert report.opportunity_reasoning


def test_heuristic_report_uses_customer_voice_summary() -> None:
    report = build_heuristic_report(
        idea_title="Better editor",
        clusters=[_cluster("Export fails silently", 12, 8.0)],
        competitors=[_competitor("A", 4.2)],
        reviews_collected=80,
        warnings=[],
    )
    assert "unhappy customers" in report.summary.lower() or "Export fails" in report.summary
    assert report.recommendations["feature_ideas"] == []
    assert "Interview" not in report.recommendations["reasoning"]


def test_data_confidence_low_without_reviews() -> None:
    assert derive_data_confidence(reviews_collected=0, cluster_count=0, warnings=["no_reviews_collected"]) == "low"
