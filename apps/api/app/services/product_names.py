import re
import unicodedata


def normalize_product_name(name: str) -> str:
    """Collapse whitespace and strip decorative punctuation for matching."""
    cleaned = unicodedata.normalize("NFKC", name.strip())
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def product_name_to_slug(name: str) -> str:
    """Convert a product name to a G2-style URL slug."""
    slug = normalize_product_name(name).lower()
    slug = slug.replace("&", " and ")
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def names_match(a: str, b: str) -> bool:
    """Loose equality for product names (case and punctuation insensitive)."""
    def key(value: str) -> str:
        normalized = normalize_product_name(value).lower()
        return re.sub(r"[^a-z0-9]", "", normalized)

    return key(a) == key(b)
