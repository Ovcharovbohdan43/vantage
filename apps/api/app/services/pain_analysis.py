from __future__ import annotations

import logging
from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.models import PainCluster, Project
from app.services.embeddings import dedupe_near_duplicates, embed_texts, persist_review_embeddings
from app.services.pain_clustering import BuiltCluster, cluster_reviews
from app.services.research_limits import get_plan_cluster_min_size
from app.services.review_cleaning import CleanedReview, clean_reviews_for_project

logger = logging.getLogger(__name__)


@dataclass
class PainAnalysisResult:
    reviews_cleaned: int = 0
    reviews_embedded: int = 0
    clusters_found: int = 0
    warnings: list[str] = field(default_factory=list)


def _sub_themes_payload(cluster: BuiltCluster) -> list[dict]:
    return [
        {
            "title": theme.title_placeholder,
            "frequency": theme.frequency,
            "review_ids": theme.review_ids,
            "examples": theme.examples[:5],
        }
        for theme in cluster.sub_themes
    ]


def _save_clusters(db: Session, project_id: UUID, clusters: list[BuiltCluster]) -> None:
    db.execute(delete(PainCluster).where(PainCluster.project_id == project_id))
    for cluster in clusters:
        # Persist nested themes inside examples metadata without a schema migration.
        examples_payload: list | dict
        if cluster.sub_themes:
            examples_payload = {
                "quotes": cluster.examples,
                "sub_themes": _sub_themes_payload(cluster),
            }
        else:
            examples_payload = cluster.examples
        db.add(
            PainCluster(
                project_id=project_id,
                title=cluster.title,
                description=None,
                frequency=cluster.frequency,
                severity_score=cluster.severity_score,
                examples=examples_payload,
                representative_review_ids=cluster.representative_review_ids,
            )
        )
    db.flush()


def run_pain_analysis(
    db: Session,
    project: Project,
    *,
    on_progress=None,
) -> PainAnalysisResult:
    result = PainAnalysisResult()

    cleaned = clean_reviews_for_project(db, project)
    result.reviews_cleaned = len(cleaned)

    if on_progress:
        on_progress(step="cleaned", reviews_cleaned=result.reviews_cleaned, clusters_found=0)

    min_size = get_plan_cluster_min_size(project)
    if len(cleaned) < min_size:
        result.warnings.append("insufficient_reviews_for_clustering")
        _save_clusters(db, project.id, [])
        logger.info(
            "Skipping clustering for project %s: %s cleaned reviews (need %s)",
            project.id,
            len(cleaned),
            min_size,
        )
        return result

    reviews_by_id: dict[UUID, CleanedReview] = {item.id: item for item in cleaned}
    review_ids = [item.id for item in cleaned]
    texts = [item.normalized_text for item in cleaned]

    embeddings = embed_texts(texts)
    review_ids, embeddings = dedupe_near_duplicates(review_ids, embeddings)
    persist_review_embeddings(db, review_ids, embeddings)
    result.reviews_embedded = len(review_ids)

    if on_progress:
        on_progress(
            step="embedded",
            reviews_cleaned=result.reviews_cleaned,
            clusters_found=0,
        )

    if len(review_ids) < min_size:
        result.warnings.append("insufficient_reviews_after_dedup")
        _save_clusters(db, project.id, [])
        return result

    clusters = cluster_reviews(
        review_ids,
        embeddings,
        reviews_by_id,
        min_cluster_size=min_size,
    )
    _save_clusters(db, project.id, clusters)
    result.clusters_found = len(clusters)

    if not clusters:
        result.warnings.append("no_pain_clusters_found")

    if on_progress:
        on_progress(
            step="clustered",
            reviews_cleaned=result.reviews_cleaned,
            clusters_found=result.clusters_found,
        )

    logger.info(
        "Pain analysis for project %s: cleaned=%s embedded=%s clusters=%s",
        project.id,
        result.reviews_cleaned,
        result.reviews_embedded,
        result.clusters_found,
    )
    return result
