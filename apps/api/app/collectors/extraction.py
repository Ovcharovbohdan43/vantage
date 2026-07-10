from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any


TEXT_KEYS = ("review_text", "reviewText", "comment", "body", "text", "content", "description")
TITLE_KEYS = ("title", "review_title", "reviewTitle", "headline", "subject")
RATING_KEYS = ("rating", "star_rating", "stars", "score", "starRating")
AUTHOR_KEYS = ("author", "author_name", "authorName", "reviewer", "user_name", "userName")
DATE_KEYS = ("review_date", "reviewDate", "date", "published_at", "publishedAt", "created_at", "createdAt")


@dataclass
class ScrapedReview:
    source: str
    text: str
    rating: int | None = None
    title: str | None = None
    author: str | None = None
    review_date: datetime | None = None
    language: str | None = None


def compute_content_hash(competitor_id: str, source: str, text: str) -> str:
    payload = f"{competitor_id}:{source}:{text.strip().lower()}".encode()
    return hashlib.sha256(payload).hexdigest()


def _first_str(data: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _parse_rating(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        rating = int(round(float(value)))
        return rating if 1 <= rating <= 5 else None
    if isinstance(value, str):
        match = re.search(r"([1-5])", value)
        if match:
            return int(match.group(1))
    return None


def _parse_date(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value, tz=UTC)
        except (OverflowError, OSError, ValueError):
            return None
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            return None
        try:
            if cleaned.endswith("Z"):
                cleaned = cleaned.replace("Z", "+00:00")
            return datetime.fromisoformat(cleaned)
        except ValueError:
            return None
    return None


def normalize_review_dict(data: dict[str, Any], source: str) -> ScrapedReview | None:
    text = _first_str(data, TEXT_KEYS)
    if not text:
        return None

    rating = None
    for key in RATING_KEYS:
        if key in data:
            rating = _parse_rating(data[key])
            if rating is not None:
                break

    review_date = None
    for key in DATE_KEYS:
        if key in data:
            review_date = _parse_date(data[key])
            if review_date is not None:
                break

    return ScrapedReview(
        source=source,
        text=text,
        rating=rating,
        title=_first_str(data, TITLE_KEYS),
        author=_first_str(data, AUTHOR_KEYS),
        review_date=review_date,
    )


def looks_like_review_dict(data: dict[str, Any]) -> bool:
    text = _first_str(data, TEXT_KEYS)
    if not text or len(text) < 20:
        return False
    has_rating = any(key in data for key in RATING_KEYS)
    has_date = any(key in data for key in DATE_KEYS)
    has_title = any(key in data for key in TITLE_KEYS)
    return has_rating or has_date or has_title


# Apify actor outputs vary by actor; try a broad set of field names.
APIFY_TEXT_KEYS = (
    "text", "reviewText", "review_text", "reviewBody", "body", "content", "comment", "description",
)
APIFY_TITLE_KEYS = ("title", "reviewTitle", "headline", "subject", "name")
APIFY_RATING_KEYS = ("starRating", "overallRating", "rating", "stars", "score", "ratingValue")
APIFY_AUTHOR_KEYS = ("reviewerName", "authorName", "author", "reviewer", "userName", "user_name")
APIFY_DATE_KEYS = ("date", "reviewDate", "datePublished", "publishedAt", "created_at", "createdAt")


def normalize_apify_review(item: dict[str, Any], source: str) -> ScrapedReview | None:
    if not isinstance(item, dict):
        return None
    if str(item.get("type", "")).strip().lower() == "video":
        return None

    base_text = _first_str(item, APIFY_TEXT_KEYS) or ""
    parts = [base_text]
    pros = item.get("pros")
    cons = item.get("cons")
    if isinstance(pros, str) and pros.strip():
        parts.append(f"Pros: {pros.strip()}")
    if isinstance(cons, str) and cons.strip():
        parts.append(f"Cons: {cons.strip()}")
    text = " ".join(part for part in parts if part).strip()
    if not text:
        return None

    rating = None
    for key in APIFY_RATING_KEYS:
        if key in item:
            rating = _parse_rating(item[key])
            if rating is not None:
                break

    review_date = None
    for key in APIFY_DATE_KEYS:
        if key in item:
            review_date = _parse_date(item[key])
            if review_date is not None:
                break

    author = _first_str(item, APIFY_AUTHOR_KEYS)
    if not author:
        reviewer = item.get("reviewer")
        if isinstance(reviewer, dict):
            author = _schema_author(reviewer)

    return ScrapedReview(
        source=source,
        text=text,
        rating=rating,
        title=_first_str(item, APIFY_TITLE_KEYS),
        author=author,
        review_date=review_date,
    )


def reviews_from_apify_items(items: list[Any], source: str) -> list[ScrapedReview]:
    reviews: list[ScrapedReview] = []
    seen: set[str] = set()
    for item in items:
        review = normalize_apify_review(item, source) if isinstance(item, dict) else None
        if review and review.text not in seen:
            seen.add(review.text)
            reviews.append(review)
    return reviews


def find_reviews_in_json(payload: Any, source: str) -> list[ScrapedReview]:
    found: list[ScrapedReview] = []
    seen_text: set[str] = set()

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            if looks_like_review_dict(node):
                review = normalize_review_dict(node, source)
                if review and review.text not in seen_text:
                    seen_text.add(review.text)
                    found.append(review)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(payload)
    return found


def extract_json_script(html: str, script_id: str) -> Any | None:
    pattern = re.compile(
        rf'<script[^>]+id="{re.escape(script_id)}"[^>]*>(.*?)</script>',
        re.DOTALL | re.IGNORECASE,
    )
    match = pattern.search(html)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return None


_LD_JSON_PATTERN = re.compile(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)


def extract_ld_json_blocks(html: str) -> list[Any]:
    blocks: list[Any] = []
    for match in _LD_JSON_PATTERN.finditer(html):
        raw = match.group(1).strip()
        if not raw:
            continue
        try:
            blocks.append(json.loads(raw))
        except json.JSONDecodeError:
            continue
    return blocks


def _schema_author(value: Any) -> str | None:
    if isinstance(value, dict):
        name = value.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()
    elif isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _schema_rating(value: Any) -> int | None:
    # schema.org reviewRating is usually {"ratingValue": 4.5, ...}
    if isinstance(value, dict):
        return _parse_rating(value.get("ratingValue"))
    return _parse_rating(value)


def normalize_schema_review(node: dict[str, Any], source: str) -> ScrapedReview | None:
    body = node.get("reviewBody")
    if not isinstance(body, str) or not body.strip():
        return None
    text = body.strip()

    rating = _schema_rating(node.get("reviewRating"))
    review_date = _parse_date(node.get("datePublished") or node.get("dateModified"))

    title = node.get("name")
    title = title.strip() if isinstance(title, str) and title.strip() else None

    return ScrapedReview(
        source=source,
        text=text,
        rating=rating,
        title=title,
        author=_schema_author(node.get("author")),
        review_date=review_date,
    )


def find_schema_reviews(payload: Any, source: str) -> list[ScrapedReview]:
    """Walk a JSON-LD payload collecting schema.org Review objects with a reviewBody."""
    found: list[ScrapedReview] = []
    seen: set[str] = set()

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            node_type = node.get("@type")
            is_review = node_type == "Review" or (
                isinstance(node_type, list) and "Review" in node_type
            )
            if is_review and "reviewBody" in node:
                review = normalize_schema_review(node, source)
                if review and review.text not in seen:
                    seen.add(review.text)
                    found.append(review)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(payload)
    return found


def extract_reviews_from_html(html: str, source: str) -> list[ScrapedReview]:
    reviews: list[ScrapedReview] = []
    seen: set[str] = set()

    def _add(review: ScrapedReview) -> None:
        if review.text and review.text not in seen:
            seen.add(review.text)
            reviews.append(review)

    # 1. schema.org JSON-LD (G2 & Capterra render reviews here).
    for block in extract_ld_json_blocks(html):
        for review in find_schema_reviews(block, source):
            _add(review)

    # 2. Framework hydration payloads.
    for script_id in ("__NEXT_DATA__", "__NUXT__"):
        payload = extract_json_script(html, script_id)
        if payload:
            for review in find_reviews_in_json(payload, source):
                _add(review)

    if reviews:
        return reviews

    # Fallback: review cards in DOM-like snippets
    card_pattern = re.compile(
        r'class="[^"]*review[^"]*"[^>]*>(.*?)</(?:div|article|section)>',
        re.DOTALL | re.IGNORECASE,
    )
    for match in card_pattern.finditer(html):
        chunk = match.group(1)
        text_match = re.search(r'>([^<]{50,})<', chunk)
        if not text_match:
            continue
        text = re.sub(r"\s+", " ", text_match.group(1)).strip()
        if text in seen:
            continue
        seen.add(text)
        rating_match = re.search(r'([1-5])\s*(?:/5|stars?)', chunk, re.IGNORECASE)
        reviews.append(
            ScrapedReview(
                source=source,
                text=text,
                rating=_parse_rating(rating_match.group(1) if rating_match else None),
            )
        )

    return reviews
