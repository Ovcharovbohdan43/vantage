import json
from pathlib import Path

import pytest

from app.collectors.extraction import (
    compute_content_hash,
    extract_reviews_from_html,
    find_reviews_in_json,
    normalize_review_dict,
)
from app.services.research_limits import MIN_REVIEW_LENGTH, get_depth_limits, get_plan_limits


class FakeProject:
    def __init__(self, *, research_mode: str = "full", research_plan: str = "starter") -> None:
        self.research_mode = research_mode
        self.research_plan = research_plan


FIXTURES = Path(__file__).parent / "fixtures"


def test_compute_content_hash_is_stable() -> None:
    first = compute_content_hash("comp-1", "g2", "Same review text")
    second = compute_content_hash("comp-1", "g2", "Same review text")
    different = compute_content_hash("comp-1", "g2", "Different review text")
    assert first == second
    assert first != different


def test_normalize_review_dict_maps_fields() -> None:
    review = normalize_review_dict(
        {
            "title": "Hard onboarding",
            "review_text": "Setup took days and support was slow to respond to basic questions.",
            "rating": 2,
            "author_name": "Taylor",
            "review_date": "2025-01-15T00:00:00Z",
        },
        "g2",
    )
    assert review is not None
    assert review.title == "Hard onboarding"
    assert review.rating == 2
    assert review.author == "Taylor"
    assert review.review_date is not None


def test_find_reviews_in_fixture_json() -> None:
    payload = json.loads((FIXTURES / "g2_next_data_sample.json").read_text(encoding="utf-8"))
    reviews = find_reviews_in_json(payload, "g2")
    assert len(reviews) == 2
    assert all(len(review.text) >= MIN_REVIEW_LENGTH for review in reviews)


def test_extract_reviews_from_html_script_tag() -> None:
    payload = json.loads((FIXTURES / "g2_next_data_sample.json").read_text(encoding="utf-8"))
    html = f'<html><head></head><body><script id="__NEXT_DATA__" type="application/json">{json.dumps(payload)}</script></body></html>'
    reviews = extract_reviews_from_html(html, "g2")
    assert len(reviews) == 2


@pytest.mark.parametrize(
    ("depth", "competitors", "reviews_per_competitor"),
    [
        ("shallow", 5, 50),
        ("standard", 10, 100),
        ("deep", 15, 200),
    ],
)
def test_depth_limits(depth: str, competitors: int, reviews_per_competitor: int) -> None:
    limits = get_depth_limits(depth)
    assert limits.max_competitors == competitors
    assert limits.max_reviews_per_competitor == reviews_per_competitor


def test_preview_plan_limits(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.research_limits.settings.debug", False)
    monkeypatch.setattr(
        "app.services.research_limits.settings.preview_max_reviews_per_competitor",
        None,
    )
    limits = get_plan_limits(FakeProject(research_mode="preview"))
    assert limits.max_competitors == 3
    assert limits.max_reviews_per_competitor == 5


def test_preview_plan_limits_debug_uses_apify_minimum(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.research_limits.settings.debug", True)
    monkeypatch.setattr(
        "app.services.research_limits.settings.preview_max_reviews_per_competitor",
        None,
    )
    limits = get_plan_limits(FakeProject(research_mode="preview"))
    assert limits.max_reviews_per_competitor == 100
