from app.services.promo_codes import normalize_promo_code


def test_normalize_promo_code() -> None:
    assert normalize_promo_code("  tryit ") == "TRYIT"
    assert normalize_promo_code("TryIt") == "TRYIT"
