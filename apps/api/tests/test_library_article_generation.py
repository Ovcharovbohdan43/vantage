from datetime import UTC, datetime
from types import SimpleNamespace

from app.services.library_article_generation import _build_content_payload


class _Dumpable:
    def __init__(self, payload):
        self.payload = payload
        self.cluster_id = payload.get("cluster_id")

    def model_dump(self):
        return dict(self.payload)


def test_public_content_uses_report_snapshots_for_numeric_analytics():
    draft = SimpleNamespace(
        competition_level="high",
        market_saturation_explanation="A concentrated market with repeated switching complaints.",
        pain_points=[
            _Dumpable(
                {
                    "cluster_id": "cluster-1",
                    "title": "Slow reconciliation",
                    "frequency": 4,
                    "severity_score": 5.0,
                    "explanation": "Customers repeatedly report delayed reconciliation.",
                    "why_critical": "Delays block daily finance workflows.",
                    "quotes": [],
                    "supporting_review_ids": ["review-1"],
                }
            )
        ],
        market_opportunities=[_Dumpable({"title": "Faster close", "body": "Reduce close time."})],
        risk_analysis=[
            _Dumpable(
                {
                    "risk": "Competition",
                    "level": "high",
                    "explanation": "Established products have distribution.",
                }
            )
        ],
        final_takeaway="The evidence shows a recurring workflow gap.",
    )
    report = SimpleNamespace(
        market_saturation="HIGH",
        market_score=72.4,
        risk_score=61.2,
        data_confidence="high",
        recommendations={
            "opportunity_size": {
                "negative_signals": 31,
                "underserved_problems": 2,
            }
        },
        pain_clusters_snapshot=[
            {
                "id": "cluster-1",
                "frequency": 24,
                "mention_count": 24,
                "share_pct": 38.7,
                "severity_score": 8.4,
                "emotional_intensity": 7.6,
                "commercial_opportunity": 8.8,
                "trend": "growing",
                "year_counts": [{"year": 2025, "count": 9}, {"year": 2026, "count": 15}],
                "top_terms": [{"term": "delay", "count": 12}],
                "solution_direction": "Private founder-specific recommendation",
            }
        ],
        competitors_snapshot=[
            {
                "id": "competitor-1",
                "name": "Ledger App",
                "url": "https://private.example",
                "source": "g2",
                "rating": 4.1,
                "reviews_count": 320,
            }
        ],
    )

    content = _build_content_payload(
        draft,
        report,
        ["g2"],
        products_analyzed=1,
        reviews_analyzed=64,
        analyzed_at=datetime(2026, 7, 15, tzinfo=UTC),
    )

    pain = content["pain_points"][0]
    assert pain["frequency"] == 24
    assert pain["mention_count"] == 24
    assert pain["severity_score"] == 8.4
    assert pain["commercial_opportunity"] == 8.8
    assert pain["year_counts"][-1] == {"year": 2026, "count": 15}
    assert "solution_direction" not in pain

    assert content["scores"] == {
        "market_score": 72.4,
        "risk_score": 61.2,
        "data_confidence": "high",
        "confidence_pct": 83,
    }
    assert content["stats"]["negative_signals"] == 31
    assert content["competitors"][0]["name"] == "Ledger App"
    assert "url" not in content["competitors"][0]
    assert content["generation"]["numeric_source"] == "report_snapshot"
