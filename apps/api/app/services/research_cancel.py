from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import Project, ResearchJob

logger = logging.getLogger(__name__)


class ResearchCancelled(Exception):
    """Raised when the user cancels an in-flight research job."""


def is_job_cancelled(db: Session, job_id: UUID) -> bool:
    job = db.get(ResearchJob, job_id)
    return job is not None and job.status == "cancelled"


def revoke_research_task(job_id: UUID) -> None:
    """Ask Celery to stop the worker child for this job (best-effort).

    Task id is the research job UUID (see enqueue_research).
    """
    from app.config import settings

    if not settings.has_real_broker:
        return
    try:
        from app.celery_app import celery_app

        celery_app.control.revoke(str(job_id), terminate=True, signal="SIGTERM")
    except Exception:  # noqa: BLE001 — cancel must still mark DB cancelled
        logger.exception("Failed to revoke Celery task for job %s", job_id)


def cancel_research_job(db: Session, job: ResearchJob, project: Project) -> None:
    job.status = "cancelled"
    job.stage = "cancelled"
    job.completed_at = datetime.now(UTC)
    project.status = "cancelled"
    revoke_research_task(job.id)
