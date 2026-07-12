import logging
import threading

from app.config import settings
from app.tasks.research import run_research

logger = logging.getLogger(__name__)


def _run_in_thread(job_id: str) -> None:
    def target() -> None:
        try:
            run_research.run(job_id)
        except Exception:  # noqa: BLE001 — errors are already persisted on the job record
            logger.exception("In-process research task failed for job %s", job_id)

    thread = threading.Thread(target=target, name=f"research-{job_id}", daemon=True)
    thread.start()


def enqueue_research(job_id: str) -> None:
    """Dispatch the research pipeline.

    Uses Celery when a real broker (Redis) is configured; otherwise runs the
    pipeline in a background thread inside the API process (local dev default).
    """
    if settings.has_real_broker:
        # Stable task_id = job UUID so cancel can revoke the running worker.
        run_research.apply_async(args=[job_id], task_id=str(job_id))
    else:
        logger.info("No real broker configured — running research %s in-process", job_id)
        _run_in_thread(job_id)
