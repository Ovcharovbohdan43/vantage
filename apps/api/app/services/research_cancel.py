from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import Project, ResearchJob


def is_job_cancelled(db: Session, job_id: UUID) -> bool:
    job = db.get(ResearchJob, job_id)
    return job is not None and job.status == "cancelled"


def cancel_research_job(db: Session, job: ResearchJob, project: Project) -> None:
    job.status = "cancelled"
    job.stage = "cancelled"
    job.completed_at = datetime.now(UTC)
    project.status = "cancelled"
