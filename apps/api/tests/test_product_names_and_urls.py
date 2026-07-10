import pytest

from app.services.product_names import names_match, normalize_product_name, product_name_to_slug
from app.services.review_sources import (
    canonicalize_g2_url,
    parse_review_source_url,
    product_name_to_slug as slug_from_sources,
)


@pytest.mark.parametrize(
    ("name", "expected"),
    [
        ("FreshBooks", "freshbooks"),
        ("QuickBooks Online", "quickbooks-online"),
        ("Wave  Accounting", "wave-accounting"),
        ("HubSpot CRM", "hubspot-crm"),
        ("Notion & AI", "notion-and-ai"),
    ],
)
def test_product_name_to_slug(name: str, expected: str) -> None:
    assert product_name_to_slug(name) == expected


def test_normalize_product_name_collapses_whitespace() -> None:
    assert normalize_product_name("  Fresh   Books  ") == "Fresh Books"


def test_names_match_ignores_case_and_punctuation() -> None:
    assert names_match("FreshBooks", "fresh books")
    assert names_match("QuickBooks Online", "QuickBooks-Online")
    assert not names_match("FreshBooks", "QuickBooks")


@pytest.mark.parametrize(
    ("url", "source", "canonical"),
    [
        (
            "https://www.g2.com/products/freshbooks/reviews",
            "g2",
            "https://www.g2.com/products/freshbooks/reviews",
        ),
        (
            "https://g2.com/products/quickbooks-online",
            "g2",
            "https://www.g2.com/products/quickbooks-online/reviews",
        ),
        (
            "https://www.capterra.com/p/144978/FreshBooks/",
            "capterra",
            "https://www.capterra.com/p/144978/FreshBooks/",
        ),
    ],
)
def test_parse_review_source_url(url: str, source: str, canonical: str) -> None:
    parsed = parse_review_source_url(url)
    assert parsed is not None
    assert parsed.source == source
    assert parsed.url == canonical


def test_invalid_urls_return_none() -> None:
    assert parse_review_source_url("https://example.com/product") is None
    assert parse_review_source_url("https://www.g2.com/categories/accounting") is None


def test_canonicalize_g2_url_adds_reviews_suffix() -> None:
    assert (
        canonicalize_g2_url("https://www.g2.com/products/wave-accounting")
        == "https://www.g2.com/products/wave-accounting/reviews"
    )


def test_slug_helper_matches_between_modules() -> None:
    assert slug_from_sources("FreshBooks") == product_name_to_slug("FreshBooks")
