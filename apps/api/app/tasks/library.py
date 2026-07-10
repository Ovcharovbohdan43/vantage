import logging
import threading

from app.celery_app import celery_app
from app.config import settings
from app.db.sync_session import get_sync_db
from app.services.library_article_generation import generate_library_article_for_project

logger = logging.getLogger(__name__)


@celery_app.task(name="library.generate_article", bind=True, max_retries=2)
def run_library_article(self, project_id: str) -> dict:
    from uuid import UUID

    uid = UUID(project_id)
    try:
        with get_sync_db() as db:
            result = generate_library_article_for_project(db, uid)
        return {
            "status": result.status,
            "slug": result.slug,
            "article_id": str(result.article_id) if result.article_id else None,
            "error": result.error,
        }
    except Exception as exc:
        logger.exception("Library article generation failed for project %s", project_id)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30) from exc
        return {"status": "failed", "error": str(exc)}


def _run_in_thread(project_id: str) -> None:
    def target() -> None:
        try:
            run_library_article.run(project_id)
        except Exception:
            logger.exception("In-process library task failed for project %s", project_id)

    thread = threading.Thread(target=target, name=f"library-{project_id}", daemon=True)
    thread.start()


def enqueue_library_article(project_id: str) -> None:
    if settings.has_real_broker:
        run_library_article.delay(project_id)
    else:
        logger.info("No real broker — running library generation for %s in-process", project_id)
        _run_in_thread(project_id)
