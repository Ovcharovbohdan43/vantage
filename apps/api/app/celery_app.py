from datetime import UTC, datetime
from uuid import UUID

from celery import Celery

from app.config import settings

celery_app = Celery("reserchmarket", broker=settings.broker, backend=settings.result_backend)
celery_app.conf.update(
    task_track_started=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=("app.tasks.research", "app.tasks.library"),
)
