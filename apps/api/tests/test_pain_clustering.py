from uuid import uuid4

import numpy as np

from app.services.embeddings import dedupe_near_duplicates
from app.services.pain_clustering import cluster_reviews
from app.services.review_cleaning import CleanedReview, normalize_review_text


def test_normalize_review_text_strips_html() -> None:
    assert normalize_review_text("<p>Too <b>expensive</b> for small teams</p>") == "too expensive for small teams"


def test_dedupe_near_duplicates_removes_similar() -> None:
    ids = [uuid4(), uuid4(), uuid4()]
    base = np.random.default_rng(0).normal(size=1536).astype(np.float32)
    near = base + np.random.default_rng(1).normal(scale=0.001, size=1536).astype(np.float32)
    far = np.random.default_rng(2).normal(size=1536).astype(np.float32)
    embeddings = [base.tolist(), near.tolist(), far.tolist()]

    kept_ids, kept_vectors = dedupe_near_duplicates(ids, embeddings, threshold=0.95)

    assert len(kept_ids) == 2
    assert len(kept_vectors) == 2
    assert ids[2] in kept_ids


def test_cluster_reviews_groups_similar_embeddings() -> None:
    rng = np.random.default_rng(42)
    review_ids = [uuid4() for _ in range(12)]
    reviews_by_id: dict = {}

    embeddings: list[list[float]] = []
    for idx, review_id in enumerate(review_ids):
        cluster_center = 0 if idx < 6 else 1
        vector = rng.normal(loc=cluster_center, scale=0.05, size=32).astype(np.float32)
        embeddings.append(vector.tolist())
        reviews_by_id[review_id] = CleanedReview(
            id=review_id,
            competitor_id=uuid4(),
            competitor_name=f"Product-{cluster_center}",
            source="g2",
            text=f"Complaint about issue {cluster_center} number {idx}",
            normalized_text=f"complaint about issue {cluster_center} number {idx}",
            rating=2,
            title=None,
            author=None,
        )

    clusters = cluster_reviews(review_ids, embeddings, reviews_by_id, min_cluster_size=3)

    assert len(clusters) >= 1
    assert clusters[0].frequency >= 3
    assert clusters[0].severity_score >= 1.0
    assert len(clusters[0].examples) >= 1
