import re
import unicodedata


def slugify(text: str, *, max_length: int = 80) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text.lower()).strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    return slug[:max_length].rstrip("-") or "market-research"


def ensure_unique_slug(base_slug: str, existing: set[str]) -> str:
    if base_slug not in existing:
        return base_slug
    counter = 2
    while f"{base_slug}-{counter}" in existing:
        counter += 1
    return f"{base_slug}-{counter}"
