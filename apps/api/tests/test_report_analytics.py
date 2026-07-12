from datetime import UTC, datetime
from uuid import uuid4

from app.services.report_analytics import (
    ReviewSignal,
    analyze_cluster_reviews,
    extract_request_candidates,
    public_warnings_filter,
    top_terms,
)


def test_top_terms_filters_stopwords() -> None:
    terms = top_terms(
        [
            "The onboarding is confusing and slow",
            "Confusing onboarding takes forever",
            "Slow sync and confusing pricing",
        ]
    )
    names = [t["term"] for t in terms]
    assert "the" not in names
    assert "onboarding" in names or "confusing" in names


def test_request_candidates_detect_wishes() -> None:
    texts = [
        "I wish they had bank auto-import for invoices.",
        "Great product overall with decent pricing.",
        "We need offline mode for fieldwork.",
    ]
    candidates = extract_request_candidates(texts)
    assert len(candidates) >= 2


def test_analyze_cluster_reviews_share_and_competitors() -> None:
    reviews = [
        ReviewSignal(uuid4(), "slow sync", "QuickBooks", "g2", 2, datetime(2024, 1, 1, tzinfo=UTC)),
        ReviewSignal(uuid4(), "slow sync again", "QuickBooks", "g2", 1, datetime(2024, 2, 1, tzinfo=UTC)),
        ReviewSignal(uuid4(), "pricing confusing", "Xero", "g2", 2, datetime(2023, 1, 1, tzinfo=UTC)),
    ]
    analytics = analyze_cluster_reviews(reviews, reviews_analyzed=10, negative_signals=3)
    assert analytics.mention_count == 3
    assert analytics.share_pct == 30.0
    assert analytics.competitors[0]["name"] == "QuickBooks"
    assert analytics.competitors[0]["complaints"] == 2


def test_public_warnings_filter_strips_apify() -> None:
    filtered = public_warnings_filter(
        ["apify_fallback:Xero", "insufficient_reviews_for_clustering", "preview_mode"]
    )
    assert "apify_fallback:Xero" not in filtered
    assert "preview_mode" not in filtered
    assert "insufficient_reviews_for_clustering" in filtered
