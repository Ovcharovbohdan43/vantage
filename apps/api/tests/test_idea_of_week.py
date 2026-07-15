from datetime import date
from types import SimpleNamespace

from app.services.idea_of_week import (
    _candidate,
    _final_score,
    _serpapi_budget_plan,
    _series_by_query,
    _trend_metrics,
    _trend_query,
    monday_for,
    week_slug,
)


def test_week_identity_is_stable_iso_week():
    assert monday_for(date(2026, 7, 15)) == date(2026, 7, 13)
    assert week_slug(date(2026, 7, 13)) == "2026-W29"


def test_trend_query_uses_searchable_title_not_invented_mvp_brand():
    article = SimpleNamespace(
        title="Is It Worth Building Survey Tools in 2026?",
        category="Productivity",
        content={"mvp_blueprint": {"concept_name": "User-Friendly Survey Tool"}},
    )
    assert _trend_query(article) == "Survey Tools"


def test_serpapi_timeline_metrics_and_scoring():
    payload = {
        "interest_over_time": {
            "timeline_data": [
                {
                    "date": f"Week {index}",
                    "timestamp": str(index),
                    "values": [{"query": "Survey Tools", "extracted_value": value}],
                }
                for index, value in enumerate([20, 20, 20, 20, 20, 20, 20, 20, 40, 40, 40, 40])
            ]
        }
    }
    points = _series_by_query(payload)["Survey Tools"]
    metrics = _trend_metrics(points)
    candidate = SimpleNamespace(internal_score=80.0)

    assert metrics["current_interest"] == 40.0
    assert metrics["previous_interest"] == 20.0
    assert metrics["growth_pct"] == 100.0
    assert _final_score(candidate, metrics) == 77.0


def test_zero_trend_series_is_demoted():
    candidate = SimpleNamespace(internal_score=80.0)
    zeroed = _final_score(candidate, {"current_interest": 0, "growth_pct": 0, "peak_interest": 0})
    healthy = _final_score(candidate, {"current_interest": 40, "growth_pct": 10, "peak_interest": 55})
    assert zeroed < healthy
    assert zeroed == 28.57


def test_internal_candidate_score_rewards_confidence_and_growing_pains():
    article = SimpleNamespace(
        title="Is It Worth Building Invoice Software in 2026?",
        category="Finance",
        content={
            "mvp_blueprint": {"concept_name": "Close Flow"},
            "pain_points": [
                {"trend": "growing", "commercial_opportunity": 9},
                {"trend": "flat", "commercial_opportunity": 7},
            ],
        },
    )
    report = SimpleNamespace(market_score=80, data_confidence="high")
    candidate = _candidate(article, report)

    assert candidate.query == "Invoice Software"
    assert candidate.growing_share == 0.5
    assert candidate.commercial_score == 8
    assert candidate.internal_score == 80


def test_serpapi_budget_plan_reserves_two_requests_when_possible():
    assert _serpapi_budget_plan(250) == (True, True, 2)
    assert _serpapi_budget_plan(1) == (True, False, 1)
    assert _serpapi_budget_plan(0) == (False, False, 0)
