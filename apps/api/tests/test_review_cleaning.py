from uuid import uuid4

from app.services.review_cleaning import normalize_review_text


def test_normalize_review_text_collapses_whitespace() -> None:
    assert normalize_review_text("  Setup   took   days  ") == "setup took days"


def test_cleaned_review_fields_preserved() -> None:
    review_id = uuid4()
    competitor_id = uuid4()
    from app.services.review_cleaning import CleanedReview

    item = CleanedReview(
        id=review_id,
        competitor_id=competitor_id,
        competitor_name="Asana",
        source="g2",
        text="The onboarding flow is confusing and took our team several days.",
        normalized_text="the onboarding flow is confusing and took our team several days.",
        rating=2,
        title="Hard onboarding",
        author="Reviewer",
    )
    assert item.rating == 2
    assert item.competitor_name == "Asana"
