import json
import logging
import re
from dataclasses import dataclass

from app.services.page_fetcher import PageFetcher
from app.services.review_sources import (
    CAPTERRA_HOST,
    G2_HOST,
    ReviewSourceRef,
    build_capterra_search_url,
    build_g2_candidate_urls,
    build_g2_search_url,
    canonicalize_capterra_url,
    canonicalize_g2_url,
    extract_capterra_product_links,
    extract_g2_product_links,
    parse_review_source_url,
)

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

NOT_FOUND_MARKERS = (
    "page not found",
    "404 error",
    "we couldn't find",
    "no results found",
)


@dataclass
class ValidatedCompetitorPage:
    name: str
    url: str
    source: str
    description: str | None = None
    category: str | None = None
    rating: float | None = None
    reviews_count: int | None = None


def _looks_like_not_found(html: str) -> bool:
    lowered = html.lower()
    return any(marker in lowered for marker in NOT_FOUND_MARKERS) and len(html) < 120_000


def _parse_number(value: str | int | float | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = re.sub(r"[^\d.]", "", str(value))
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_int(value: str | int | float | None) -> int | None:
    parsed = _parse_number(value)
    if parsed is None:
        return None
    return int(parsed)


def _extract_json_ld(html: str) -> list[dict]:
    blocks: list[dict] = []
    for match in re.finditer(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        re.DOTALL | re.IGNORECASE,
    ):
        raw = match.group(1).strip()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(payload, list):
            blocks.extend(item for item in payload if isinstance(item, dict))
        elif isinstance(payload, dict):
            blocks.append(payload)
    return blocks


def _metadata_from_json_ld(blocks: list[dict]) -> tuple[float | None, int | None, str | None]:
    rating: float | None = None
    reviews_count: int | None = None
    name: str | None = None

    for block in blocks:
        if not name and isinstance(block.get("name"), str):
            name = block["name"]

        aggregate = block.get("aggregateRating")
        if isinstance(aggregate, dict):
            rating = rating or _parse_number(aggregate.get("ratingValue"))
            reviews_count = reviews_count or _parse_int(aggregate.get("reviewCount"))

        if block.get("@type") == "Product":
            if not name and isinstance(block.get("name"), str):
                name = block["name"]

    return rating, reviews_count, name


def _metadata_from_html(html: str, source: str) -> tuple[float | None, int | None, str | None]:
    rating: float | None = None
    reviews_count: int | None = None
    name: str | None = None

    json_ld_rating, json_ld_reviews, json_ld_name = _metadata_from_json_ld(_extract_json_ld(html))
    rating = json_ld_rating
    reviews_count = json_ld_reviews
    name = json_ld_name

    if source == "g2":
        if rating is None:
            rating_match = re.search(r'"ratingValue"\s*:\s*([0-9.]+)', html)
            rating = _parse_number(rating_match.group(1) if rating_match else None)
        if reviews_count is None:
            reviews_match = re.search(r"([\d,]+)\s+reviews", html, re.IGNORECASE)
            reviews_count = _parse_int(reviews_match.group(1) if reviews_match else None)
        if name is None:
            title_match = re.search(r"<title>([^<|]+)", html, re.IGNORECASE)
            if title_match:
                name = title_match.group(1).strip().split(" Reviews")[0].strip()

    if source == "capterra":
        if rating is None:
            rating_match = re.search(r'"ratingValue"\s*:\s*([0-9.]+)', html)
            rating = _parse_number(rating_match.group(1) if rating_match else None)
        if reviews_count is None:
            reviews_match = re.search(r"([\d,]+)\s+reviews", html, re.IGNORECASE)
            reviews_count = _parse_int(reviews_match.group(1) if reviews_match else None)
        if name is None:
            title_match = re.search(r"<title>([^<|]+)", html, re.IGNORECASE)
            if title_match:
                name = title_match.group(1).strip().split(" Software")[0].strip()

    return rating, reviews_count, name


def _host_allowed(url: str) -> bool:
    return G2_HOST in url or CAPTERRA_HOST in url


def fetch_and_validate_page(
    fetcher: PageFetcher,
    *,
    name: str,
    url: str,
    description: str | None = None,
    category: str | None = None,
) -> ValidatedCompetitorPage | None:
    parsed = parse_review_source_url(url)
    if not parsed or not _host_allowed(parsed.url):
        return None

    html = fetcher.fetch_html(parsed.url)
    if not html:
        return None

    if _looks_like_not_found(html):
        return None

    rating, reviews_count, page_name = _metadata_from_html(html, parsed.source)
    resolved_name = name.strip() or (page_name or "").strip()
    if not resolved_name:
        return None

    canonical_url = (
        canonicalize_g2_url(parsed.url) if parsed.source == "g2" else canonicalize_capterra_url(parsed.url)
    )

    return ValidatedCompetitorPage(
        name=resolved_name,
        url=canonical_url,
        source=parsed.source,
        description=description,
        category=category,
        rating=rating,
        reviews_count=reviews_count,
    )


def soft_accept_competitor_page(
    *,
    name: str,
    sources: list[str],
    description: str | None = None,
    category: str | None = None,
    explicit_urls: list[str] | None = None,
) -> ValidatedCompetitorPage | None:
    """Accept a best-effort product URL without live HTML.

    Railway/datacenter IPs are routinely 403'd by G2/Capterra during discovery.
    Review collection uses Camoufox + residential proxies and can resolve/scrape later.
    """
    resolved_name = name.strip()
    if not resolved_name:
        return None

    for raw_url in explicit_urls or []:
        parsed = parse_review_source_url(raw_url)
        if parsed and _host_allowed(parsed.url):
            return ValidatedCompetitorPage(
                name=resolved_name,
                url=parsed.url,
                source=parsed.source,
                description=description,
                category=category,
            )

    if "g2" in sources:
        for candidate in build_g2_candidate_urls(resolved_name):
            parsed = parse_review_source_url(candidate)
            if parsed:
                return ValidatedCompetitorPage(
                    name=resolved_name,
                    url=parsed.url,
                    source="g2",
                    description=description,
                    category=category,
                )

    return None


def resolve_competitor_page(
    fetcher: PageFetcher,
    *,
    name: str,
    sources: list[str],
    description: str | None = None,
    category: str | None = None,
    explicit_urls: list[str] | None = None,
) -> ValidatedCompetitorPage | None:
    candidates: list[str] = []

    for raw_url in explicit_urls or []:
        parsed = parse_review_source_url(raw_url)
        if parsed:
            candidates.append(parsed.url)

    if "g2" in sources:
        candidates.extend(build_g2_candidate_urls(name))
    if "capterra" in sources:
        # Capterra slugs include numeric IDs; search is more reliable than slug guessing.
        pass

    seen: set[str] = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        validated = fetch_and_validate_page(
            fetcher,
            name=name,
            url=candidate,
            description=description,
            category=category,
        )
        if validated:
            return validated

    if "g2" in sources:
        search_html = fetcher.fetch_html(build_g2_search_url(name))
        if search_html:
            for link in extract_g2_product_links(search_html):
                if link in seen:
                    continue
                seen.add(link)
                validated = fetch_and_validate_page(
                    fetcher,
                    name=name,
                    url=link,
                    description=description,
                    category=category,
                )
                if validated:
                    return validated

    if "capterra" in sources:
        search_html = fetcher.fetch_html(build_capterra_search_url(name))
        if search_html:
            for link in extract_capterra_product_links(search_html):
                if link in seen:
                    continue
                seen.add(link)
                validated = fetch_and_validate_page(
                    fetcher,
                    name=name,
                    url=link,
                    description=description,
                    category=category,
                )
                if validated:
                    return validated

    # Live validation blocked (typical on Railway) — still enqueue for review-collector.
    return soft_accept_competitor_page(
        name=name,
        sources=sources,
        description=description,
        category=category,
        explicit_urls=explicit_urls,
    )


def validate_manual_competitor_url(
    fetcher: PageFetcher,
    *,
    name: str,
    url: str,
    category: str | None = None,
) -> ValidatedCompetitorPage:
    parsed = parse_review_source_url(url)
    if not parsed:
        raise ValueError("URL must be a G2 or Capterra product page")

    validated = fetch_and_validate_page(fetcher, name=name, url=parsed.url, category=category)
    if validated:
        return validated

    # Accept well-formed product URLs even when G2/Capterra block the worker IP.
    return ValidatedCompetitorPage(
        name=name.strip() or parsed.slug or "Competitor",
        url=parsed.url,
        source=parsed.source,
        category=category,
    )