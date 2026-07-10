from app.services.library_slug import ensure_unique_slug, slugify


def test_slugify() -> None:
    assert slugify("Customer Pain Analysis of CRM Software") == "customer-pain-analysis-of-crm-software"


def test_ensure_unique_slug() -> None:
    existing = {"crm-analysis", "crm-analysis-2"}
    assert ensure_unique_slug("crm-analysis", existing) == "crm-analysis-3"
