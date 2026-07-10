from __future__ import annotations

import logging
from dataclasses import dataclass
from uuid import UUID

import hdbscan
import numpy as np

from app.services.review_cleaning import CleanedReview

logger = logging.getLogger(__name__)

REPRESENTATIVE_COUNT = 5


@dataclass
class BuiltCluster:
    title: str
    frequency: int
    severity_score: float
    examples: list[dict]
    representative_review_ids: list[str]


def _l2_normalize(matrix: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return matrix / norms


def _severity_from_ratings(ratings: list[int | None]) -> float:
    scored = [max(1.0, min(10.0, 6.0 - float(r))) for r in ratings if r is not None]
    if not scored:
        return 5.0
    return round(sum(scored) / len(scored), 2)


def _placeholder_title(review_text: str) -> str:
    snippet = review_text.strip()[:72]
    if len(review_text) > 72:
        snippet += "…"
    return snippet or "Recurring user pain"


def cluster_reviews(
    review_ids: list[UUID],
    embeddings: list[list[float]],
    reviews_by_id: dict[UUID, CleanedReview],
    *,
    min_cluster_size: int,
) -> list[BuiltCluster]:
    if len(review_ids) < min_cluster_size:
        logger.info(
            "Not enough reviews for clustering (%s < %s)",
            len(review_ids),
            min_cluster_size,
        )
        return []

    matrix = _l2_normalize(np.array(embeddings, dtype=np.float32))
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=max(2, min_cluster_size // 2),
        metric="euclidean",
        cluster_selection_method="eom",
    )
    labels = clusterer.fit_predict(matrix)

    grouped: dict[int, list[int]] = {}
    for idx, label in enumerate(labels):
        if label == -1:
            continue
        grouped.setdefault(int(label), []).append(idx)

    built: list[BuiltCluster] = []
    for label in sorted(grouped):
        indices = grouped[label]
        cluster_ids = [review_ids[i] for i in indices]
        cluster_vectors = matrix[indices]
        centroid = cluster_vectors.mean(axis=0)
        distances = np.linalg.norm(cluster_vectors - centroid, axis=1)
        order = np.argsort(distances)

        member_ids = [str(rid) for rid in cluster_ids]
        examples: list[dict] = []
        all_ratings = [reviews_by_id[rid].rating for rid in cluster_ids]

        for pos in order[:REPRESENTATIVE_COUNT]:
            review_id = review_ids[indices[pos]]
            review = reviews_by_id[review_id]
            examples.append(
                {
                    "review_id": str(review_id),
                    "text": review.text,
                    "rating": review.rating,
                    "competitor": review.competitor_name,
                    "source": review.source,
                    "title": review.title,
                }
            )

        title_review = reviews_by_id[review_ids[indices[order[0]]]]
        built.append(
            BuiltCluster(
                title=_placeholder_title(title_review.text),
                frequency=len(cluster_ids),
                severity_score=_severity_from_ratings(all_ratings),
                examples=examples,
                representative_review_ids=member_ids,
            )
        )

    built.sort(key=lambda item: item.frequency, reverse=True)
    logger.info("Built %s pain clusters from %s reviews", len(built), len(review_ids))
    return built
