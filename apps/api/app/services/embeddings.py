from __future__ import annotations

import logging
from uuid import UUID

import numpy as np
from openai import OpenAI
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Review
from app.services.research_limits import NEAR_DUPLICATE_COSINE_THRESHOLD

logger = logging.getLogger(__name__)


def _l2_normalize(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = OpenAI(api_key=settings.openai_api_key)
    embeddings: list[list[float]] = []
    batch_size = settings.embedding_batch_size

    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=batch,
            dimensions=settings.embedding_dimensions,
        )
        embeddings.extend(item.embedding for item in response.data)

    return embeddings


def dedupe_near_duplicates(
    review_ids: list[UUID],
    embeddings: list[list[float]],
    *,
    threshold: float = NEAR_DUPLICATE_COSINE_THRESHOLD,
) -> tuple[list[UUID], list[list[float]]]:
    if len(review_ids) <= 1:
        return review_ids, embeddings

    matrix = _l2_normalize(np.array(embeddings, dtype=np.float32))
    kept_ids: list[UUID] = []
    kept_vectors: list[list[float]] = []

    for idx, review_id in enumerate(review_ids):
        vector = matrix[idx]
        if kept_vectors:
            kept_matrix = _l2_normalize(np.array(kept_vectors, dtype=np.float32))
            similarities = kept_matrix @ vector
            if float(np.max(similarities)) >= threshold:
                continue
        kept_ids.append(review_id)
        kept_vectors.append(embeddings[idx])

    removed = len(review_ids) - len(kept_ids)
    if removed:
        logger.info("Removed %s near-duplicate reviews (cosine >= %s)", removed, threshold)

    return kept_ids, kept_vectors


def persist_review_embeddings(db: Session, review_ids: list[UUID], embeddings: list[list[float]]) -> None:
    for review_id, embedding in zip(review_ids, embeddings, strict=True):
        review = db.get(Review, review_id)
        if review:
            review.embedding = embedding
    db.flush()
