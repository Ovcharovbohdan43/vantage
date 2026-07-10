import re
from dataclasses import dataclass
from urllib.parse import quote, urlparse

from app.services.product_names import product_name_to_slug

G2_HOST = "www.g2.com"
CAPTERRA_HOST = "www.capterra.com"

G2_PRODUCT_RE = re.compile(
    r"^https?://(?:www\.)?g2\.com/products/([a-z0-9-]+)(?:/reviews?)?/?$",
    re.IGNORECASE,
)
CAPTERRA_PRODUCT_RE = re.compile(
    r"^https?://(?:www\.)?capterra\.com/p/\d+/([a-z0-9-]+)/?$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ReviewSourceRef:
    source: str
    url: str
    slug: str | None = None


def canonicalize_g2_url(url: str) -> str:
    match = G2_PRODUCT_RE.match(url.strip())
    if not match:
        raise ValueError("Invalid G2 product URL")
    slug = match.group(1).lower()
    return f"https://www.g2.com/products/{slug}/reviews"


def canonicalize_capterra_url(url: str) -> str:
    match = CAPTERRA_PRODUCT_RE.match(url.strip())
    if not match:
        raise ValueError("Invalid Capterra product URL")
    parsed = urlparse(url.strip())
    path = parsed.path.rstrip("/")
    return f"https://{CAPTERRA_HOST}{path}/"


def parse_review_source_url(url: str) -> ReviewSourceRef | None:
    normalized = url.strip()
    g2_match = G2_PRODUCT_RE.match(normalized)
    if g2_match:
        slug = g2_match.group(1).lower()
        return ReviewSourceRef(source="g2", url=canonicalize_g2_url(normalized), slug=slug)

    capterra_match = CAPTERRA_PRODUCT_RE.match(normalized)
    if capterra_match:
        slug = capterra_match.group(1).lower()
        return ReviewSourceRef(source="capterra", url=canonicalize_capterra_url(normalized), slug=slug)

    return None


def build_g2_candidate_urls(name: str) -> list[str]:
    slug = product_name_to_slug(name)
    if not slug:
        return []
    return [f"https://www.g2.com/products/{slug}/reviews"]


def build_g2_search_url(name: str) -> str:
    return f"https://www.g2.com/search?query={quote(normalize_query(name))}"


def build_capterra_search_url(name: str) -> str:
    return f"https://www.capterra.com/search/?search={quote(normalize_query(name))}"


def normalize_query(name: str) -> str:
    return name.strip()


def extract_g2_product_links(html: str, limit: int = 5) -> list[str]:
    pattern = re.compile(r'href="(/products/[a-z0-9-]+(?:/reviews)?)"', re.IGNORECASE)
    seen: set[str] = set()
    urls: list[str] = []
    for match in pattern.finditer(html):
        path = match.group(1).split("?")[0].rstrip("/")
        if not path.endswith("/reviews"):
            path = f"{path}/reviews"
        full = f"https://{G2_HOST}{path}"
        if full in seen:
            continue
        seen.add(full)
        urls.append(full)
        if len(urls) >= limit:
            break
    return urls


def extract_capterra_product_links(html: str, limit: int = 5) -> list[str]:
    pattern = re.compile(r'href="(https://www\.capterra\.com/p/\d+/[a-z0-9-]+/)"', re.IGNORECASE)
    seen: set[str] = set()
    urls: list[str] = []
    for match in pattern.finditer(html):
        full = match.group(1)
        if full in seen:
            continue
        seen.add(full)
        urls.append(full)
        if len(urls) >= limit:
            break
    return urls
