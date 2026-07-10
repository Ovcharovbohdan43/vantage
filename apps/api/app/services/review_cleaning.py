from __future__ import annotations

import html
import re
from dataclasses import dataclass
from uuid import UUID

from langdetect import DetectorFactory, LangDetectException, detect_langs
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Competitor, Project, Review
from app.services.research_limits import MIN_REVIEW_LENGTH

DetectorFactory.seed = 0

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


@dataclass
class CleanedReview:
    id: UUID
    competitor_id: UUID
    competitor_name: str
    source: str
    text: str
    normalized_text: str
    rating: int | None
    title: str | None
    author: str | None


def normalize_review_text(text: str) -> str:
    unescaped = html.unescape(text)
    stripped = _TAG_RE.sub(" ", unescaped)
    collapsed = _WS_RE.sub(" ", stripped).strip()
    return collapsed.lower()


def _matches_language(text: str, language: str) -> bool:
    if not language or language == "any":
        return True
    try:
        langs = detect_langs(text)
    except LangDetectException:
        return True
    if not langs:
        return True
    return langs[0].lang == language or langs[0].prob < 0.85


def clean_reviews_for_project(db: Session, project: Project) -> list[CleanedReview]:
    rows = db.execute(
        select(Review, Competitor)
        .join(Competitor, Review.competitor_id == Competitor.id)
        .where(Competitor.project_id == project.id)
        .order_by(Review.created_at.asc())
    ).all()

    cleaned: list[CleanedReview] = []
    seen_hashes: set[str] = set()

    for review, competitor in rows:
        text = review.text.strip()
        if len(text) < MIN_REVIEW_LENGTH:
            continue

        if review.rating is not None and review.rating > settings.max_negative_review_rating:
            continue

        if not _matches_language(text, project.analysis_language):
            continue

        normalized = normalize_review_text(text)
        if not normalized or len(normalized) < MIN_REVIEW_LENGTH:
            continue

        dedup_key = normalized[:500]
        if dedup_key in seen_hashes:
            continue
        seen_hashes.add(dedup_key)

        cleaned.append(
            CleanedReview(
                id=review.id,
                competitor_id=competitor.id,
                competitor_name=competitor.name,
                source=review.source,
                text=text,
                normalized_text=normalized,
                rating=review.rating,
                title=review.title,
                author=review.author,
            )
        )

    return cleaned
