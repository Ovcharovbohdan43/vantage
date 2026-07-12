from __future__ import annotations

import logging
from dataclasses import dataclass, field
from uuid import UUID

import hdbscan
import numpy as np

from app.services.report_analytics import SubThemeBuilt
from app.services.review_cleaning import CleanedReview

logger = logging.getLogger(__name__)

REPRESENTATIVE_COUNT = 20
NESTED_TOP_N = 8
NESTED_MIN_FREQUENCY = 20


@dataclass
class BuiltCluster:
    title: str
    frequency: int
    severity_score: float
    examples: list[dict]
    representative_review_ids: list[str]
    sub_themes: list[SubThemeBuilt] = field(default_factory=list)
    # Indices into the parent embedding matrix for nested reuse (optional).
    member_indices: list[int] = field(default_factory=list)


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


def _build_examples(
    review_ids: list[UUID],
    indices: list[int],
    order: np.ndarray,
    reviews_by_id: dict[UUID, CleanedReview],
    *,
    limit: int = REPRESENTATIVE_COUNT,
) -> list[dict]:
    examples: list[dict] = []
    for pos in order[:limit]:
        review_id = review_ids[indices[int(pos)]]
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
    return examples


def nest_subthemes_for_cluster(
    review_ids: list[UUID],
    matrix: np.ndarray,
    member_indices: list[int],
    reviews_by_id: dict[UUID, CleanedReview],
) -> list[SubThemeBuilt]:
    """Run HDBSCAN on already-normalized parent member vectors — no re-embed."""
    n = len(member_indices)
    if n < NESTED_MIN_FREQUENCY:
        return []

    min_cluster_size = max(5, n // 12)
    if n < min_cluster_size * 2:
        return []

    sub_matrix = matrix[member_indices]
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=max(2, min_cluster_size // 2),
        metric="euclidean",
        cluster_selection_method="eom",
    )
    labels = clusterer.fit_predict(sub_matrix)

    grouped: dict[int, list[int]] = {}
    for local_idx, label in enumerate(labels):
        if label == -1:
            continue
        grouped.setdefault(int(label), []).append(local_idx)

    themes: list[SubThemeBuilt] = []
    for label in sorted(grouped, key=lambda lab: len(grouped[lab]), reverse=True):
        local_indices = grouped[label]
        global_indices = [member_indices[i] for i in local_indices]
        cluster_ids = [review_ids[i] for i in global_indices]
        vectors = matrix[global_indices]
        centroid = vectors.mean(axis=0)
        distances = np.linalg.norm(vectors - centroid, axis=1)
        order = np.argsort(distances)

        examples = _build_examples(
            review_ids,
            global_indices,
            order,
            reviews_by_id,
            limit=min(5, REPRESENTATIVE_COUNT),
        )
        title_review = reviews_by_id[review_ids[global_indices[int(order[0])]]]
        themes.append(
            SubThemeBuilt(
                title_placeholder=_placeholder_title(title_review.text),
                frequency=len(cluster_ids),
                review_ids=[str(rid) for rid in cluster_ids],
                examples=examples,
            )
        )

    return themes[:6]


def attach_nested_subthemes(
    clusters: list[BuiltCluster],
    review_ids: list[UUID],
    matrix: np.ndarray,
    reviews_by_id: dict[UUID, CleanedReview],
    *,
    top_n: int = NESTED_TOP_N,
) -> None:
    eligible = [c for c in clusters if c.frequency >= NESTED_MIN_FREQUENCY][:top_n]
    for cluster in eligible:
        if not cluster.member_indices:
            continue
        cluster.sub_themes = nest_subthemes_for_cluster(
            review_ids,
            matrix,
            cluster.member_indices,
            reviews_by_id,
        )
        logger.info(
            "Nested subthemes for '%s': %s themes from %s reviews",
            cluster.title[:40],
            len(cluster.sub_themes),
            cluster.frequency,
        )


def nest_subthemes_from_signals(
    member_ids: list[UUID],
    embeddings: list[list[float]],
    reviews_by_id: dict[UUID, CleanedReview],
) -> list[SubThemeBuilt]:
    """Nested clustering when only member embeddings are available (report path)."""
    if len(member_ids) < NESTED_MIN_FREQUENCY or len(member_ids) != len(embeddings):
        return []
    matrix = _l2_normalize(np.array(embeddings, dtype=np.float32))
    member_indices = list(range(len(member_ids)))
    return nest_subthemes_for_cluster(member_ids, matrix, member_indices, reviews_by_id)


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
        examples = _build_examples(review_ids, indices, order, reviews_by_id)
        all_ratings = [reviews_by_id[rid].rating for rid in cluster_ids]

        title_review = reviews_by_id[review_ids[indices[int(order[0])]]]
        built.append(
            BuiltCluster(
                title=_placeholder_title(title_review.text),
                frequency=len(cluster_ids),
                severity_score=_severity_from_ratings(all_ratings),
                examples=examples,
                representative_review_ids=member_ids,
                member_indices=list(indices),
            )
        )

    built.sort(key=lambda item: item.frequency, reverse=True)
    attach_nested_subthemes(built, review_ids, matrix, reviews_by_id)
    logger.info("Built %s pain clusters from %s reviews", len(built), len(review_ids))
    return built
