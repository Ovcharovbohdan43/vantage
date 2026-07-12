from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal
from uuid import UUID

TrendDirection = Literal["growing", "flat", "declining"]

DATE_COVERAGE_THRESHOLD = 0.4
TOP_TERMS_COUNT = 12
REQUEST_CANDIDATE_LIMIT = 40

_WORD_RE = re.compile(r"[a-z][a-z0-9'-]{2,}")
_REQUEST_RE = re.compile(
    r"(?:\b(?:i|we|users?|customers?)\b.{0,40})?"
    r"(?:\bwish(?:ed)?\b|\bneed(?:s|ed)?\b|\bshould\b|\bplease\s+add\b|\bmissing\b|"
    r"\bwant(?:s|ed)?\b|\bwould\s+love\b|\bif\s+only\b|\bhope\s+they\b|"
    r"\badd\s+(?:a|an|the)\b|\bno\s+way\s+to\b|\bcan'?t\b|\bcannot\b)",
    re.IGNORECASE,
)

_STOPWORDS = frozenset(
    {
        "the", "and", "for", "that", "this", "with", "from", "have", "has", "had",
        "are", "was", "were", "been", "being", "their", "there", "they", "them",
        "then", "than", "when", "what", "which", "while", "where", "who", "whom",
        "will", "would", "could", "should", "about", "into", "over", "under",
        "after", "before", "because", "just", "only", "also", "very", "much",
        "more", "most", "some", "any", "all", "each", "every", "other", "such",
        "not", "don", "does", "did", "doing", "can", "cannot", "but", "out",
        "our", "you", "your", "yours", "its", "it's", "his", "her", "hers",
        "she", "him", "how", "why", "too", "own", "same", "so", "if", "or",
        "as", "at", "by", "on", "in", "to", "of", "a", "an", "is", "it", "be",
        "my", "me", "we", "us", "i", "im", "ive", "id", "amp", "http", "https",
        "www", "com", "app", "software", "product", "tool", "tools", "using",
        "use", "used", "user", "users", "customer", "customers", "company",
        "really", "like", "get", "got", "one", "two", "time", "times", "make",
        "made", "even", "still", "back", "way", "lot", "lots", "thing", "things",
        "good", "bad", "great", "nice", "well", "work", "works", "working",
        "review", "reviews", "g2", "capterra",
    }
)


@dataclass
class ReviewSignal:
    id: UUID
    text: str
    competitor_name: str
    source: str
    rating: int | None
    review_date: datetime | None
    embedding: list[float] | None = None


@dataclass
class SubThemeBuilt:
    title_placeholder: str
    frequency: int
    review_ids: list[str]
    examples: list[dict] = field(default_factory=list)


@dataclass
class ClusterAnalytics:
    mention_count: int
    share_pct: float
    negative_share_pct: float
    competitors: list[dict]
    year_counts: list[dict]
    date_coverage: float
    trend: TrendDirection | None
    top_terms: list[dict]
    request_candidates: list[dict]
    quotes: list[dict]
    sub_themes: list[dict] = field(default_factory=list)


@dataclass
class OpportunitySize:
    reviews_analyzed: int
    negative_signals: int
    clusters_found: int
    underserved_problems: int


def share_pct(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return round(100.0 * part / whole, 1)


def top_terms(texts: list[str], *, limit: int = TOP_TERMS_COUNT) -> list[dict]:
    counts: Counter[str] = Counter()
    for text in texts:
        for match in _WORD_RE.findall(text.lower()):
            if match in _STOPWORDS or len(match) < 3:
                continue
            counts[match] += 1
    return [{"term": term, "count": count} for term, count in counts.most_common(limit)]


def extract_request_candidates(texts: list[str], *, limit: int = REQUEST_CANDIDATE_LIMIT) -> list[dict]:
    """Heuristic sentences that look like feature asks — LLM only labels groups later."""
    candidates: list[dict] = []
    seen: set[str] = set()
    for text in texts:
        for sentence in re.split(r"(?<=[.!?])\s+", text):
            cleaned = " ".join(sentence.strip().split())
            if len(cleaned) < 20 or len(cleaned) > 280:
                continue
            if not _REQUEST_RE.search(cleaned):
                continue
            key = cleaned.lower()[:160]
            if key in seen:
                continue
            seen.add(key)
            candidates.append({"text": cleaned})
            if len(candidates) >= limit:
                return candidates
    return candidates


def competitor_breakdown(reviews: list[ReviewSignal]) -> list[dict]:
    counts: Counter[str] = Counter()
    for review in reviews:
        name = (review.competitor_name or "Unknown").strip() or "Unknown"
        counts[name] += 1
    return [
        {"name": name, "complaints": count}
        for name, count in counts.most_common()
    ]


def year_trend(reviews: list[ReviewSignal]) -> tuple[list[dict], float, TrendDirection | None]:
    dated = [r for r in reviews if r.review_date is not None]
    coverage = (len(dated) / len(reviews)) if reviews else 0.0
    if coverage < DATE_COVERAGE_THRESHOLD or len(dated) < 8:
        return [], round(coverage, 3), None

    by_year: Counter[int] = Counter()
    for review in dated:
        assert review.review_date is not None
        by_year[review.review_date.year] += 1

    years_sorted = sorted(by_year)
    year_counts = [{"year": year, "count": by_year[year]} for year in years_sorted]

    # Compare last 2 calendar years with enough signal; else first vs last half of span.
    trend: TrendDirection | None = None
    if len(years_sorted) >= 2:
        recent = years_sorted[-1]
        prior = years_sorted[-2]
        recent_n = by_year[recent]
        prior_n = by_year[prior]
        if prior_n == 0:
            trend = "growing"
        else:
            change = (recent_n - prior_n) / prior_n
            if change >= 0.15:
                trend = "growing"
            elif change <= -0.15:
                trend = "declining"
            else:
                trend = "flat"
    return year_counts, round(coverage, 3), trend


def build_quotes(reviews: list[ReviewSignal], *, limit: int = 20) -> list[dict]:
    # Prefer lower ratings first, then longer text for evidence density.
    ordered = sorted(
        reviews,
        key=lambda r: (
            r.rating if r.rating is not None else 3,
            -len(r.text or ""),
        ),
    )
    quotes: list[dict] = []
    for review in ordered[:limit]:
        text = (review.text or "").strip()
        if not text:
            continue
        quotes.append(
            {
                "text": text if len(text) <= 1200 else f"{text[:1197]}...",
                "rating": review.rating,
                "competitor": review.competitor_name,
                "source": review.source,
                "review_date": review.review_date.isoformat() if review.review_date else None,
            }
        )
    return quotes


def analyze_cluster_reviews(
    reviews: list[ReviewSignal],
    *,
    reviews_analyzed: int,
    negative_signals: int,
    sub_themes: list[SubThemeBuilt] | None = None,
    quote_limit: int = 20,
) -> ClusterAnalytics:
    mention_count = len(reviews)
    year_counts, date_coverage, trend = year_trend(reviews)
    texts = [r.text for r in reviews if r.text]
    return ClusterAnalytics(
        mention_count=mention_count,
        share_pct=share_pct(mention_count, reviews_analyzed),
        negative_share_pct=share_pct(mention_count, negative_signals),
        competitors=competitor_breakdown(reviews),
        year_counts=year_counts,
        date_coverage=date_coverage,
        trend=trend,
        top_terms=top_terms(texts),
        request_candidates=extract_request_candidates(texts),
        quotes=build_quotes(reviews, limit=quote_limit),
        sub_themes=[
            {
                "title": theme.title_placeholder,
                "frequency": theme.frequency,
                "share_pct": share_pct(theme.frequency, mention_count),
                "examples": theme.examples[:3],
            }
            for theme in (sub_themes or [])
        ],
    )


def build_opportunity_size(
    *,
    reviews_analyzed: int,
    negative_signals: int,
    clusters_found: int,
    major_problem_count: int,
) -> OpportunitySize:
    return OpportunitySize(
        reviews_analyzed=reviews_analyzed,
        negative_signals=negative_signals,
        clusters_found=clusters_found,
        underserved_problems=max(0, major_problem_count),
    )


def opportunity_reasoning_from_analytics(
    *,
    market_score: float,
    reviews_analyzed: int,
    negative_signals: int,
    top_cluster_title: str | None,
    top_cluster_count: int,
    top_competitor: str | None,
    top_competitor_count: int,
    trend: TrendDirection | None,
) -> str:
    parts = [
        f"Opportunity score {market_score:.0f}/100 from {reviews_analyzed} collected reviews "
        f"and {negative_signals} clustered pain signals."
    ]
    if top_cluster_title and top_cluster_count:
        parts.append(
            f"Largest unresolved complaint pattern: “{top_cluster_title}” "
            f"({top_cluster_count} mentions)."
        )
    if top_competitor and top_competitor_count:
        parts.append(
            f"Most complaints concentrate on {top_competitor} ({top_competitor_count} in the top pain)."
        )
    if trend == "growing":
        parts.append("Dated reviews show this complaint volume is growing year over year.")
    elif trend == "declining":
        parts.append("Dated reviews show this complaint volume is easing slightly.")
    return " ".join(parts)


def public_warnings_filter(warnings: list[str]) -> list[str]:
    """Internal scraper tags must never reach user-facing copy."""
    blocked_prefixes = (
        "apify_fallback:",
        "crawlee_",
        "scraper_",
        "preview_mode",
        "llm_unavailable",
        "partial_reviews",
    )
    out: list[str] = []
    for warning in warnings:
        if any(warning.startswith(prefix) or warning == prefix.rstrip(":") for prefix in blocked_prefixes):
            continue
        if ":" in warning and warning.split(":", 1)[0] in {
            "apify_fallback",
            "crawlee_unreachable",
            "scraper_blocked",
        }:
            continue
        out.append(warning)
    return out
