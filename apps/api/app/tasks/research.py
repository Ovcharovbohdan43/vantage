from datetime import UTC, datetime
from math import ceil
from uuid import UUID

from app.celery_app import celery_app
from app.db.models import Profile, Project, ResearchJob
from app.db.sync_session import get_sync_db
from app.services.competitor_discovery import (
    MIN_COMPETITORS,
    discover_competitors_for_project,
    insufficient_competitors_error,
    list_project_competitors,
)
from app.services.pain_analysis import run_pain_analysis
from app.services.report_generation import generate_report_for_project
from app.services.credits import mark_preview_used
from app.tasks.library import enqueue_library_article
from app.services.research_cancel import ResearchCancelled, is_job_cancelled
from app.services.research_limits import MIN_COMPETITOR_SUCCESS_RATIO
from app.services.review_collection import collect_reviews_for_project


def _derive_title(description: str, title: str) -> str:
    if title.strip():
        return title.strip()
    first_line = description.strip().split("\n")[0]
    return first_line[:120] if len(first_line) > 120 else first_line


def _fail_job(db, job: ResearchJob, project: Project, error: dict) -> None:
    if job.status == "cancelled":
        return
    job.status = "failed"
    job.stage = "failed"
    job.error = error
    job.completed_at = datetime.now(UTC)
    project.status = "failed"


def _update_progress(db, job: ResearchJob, project: Project, *, stage: str, progress_pct: int, stats: dict) -> None:
    if job.status == "cancelled":
        return
    job.stage = stage
    job.progress_pct = progress_pct
    job.stats = stats
    job.status = "running" if stage != "completed" else "completed"
    project.status = "running" if stage != "completed" else "completed"
    if stage == "completed":
        job.completed_at = datetime.now(UTC)
    db.flush()


def _analysis_progress_pct(step: str) -> int:
    return {"cleaned": 72, "embedded": 80, "clustered": 88}.get(step, 70)


def _exit_if_cancelled(uid: UUID) -> bool:
    with get_sync_db() as db:
        return is_job_cancelled(db, uid)


def _abort_if_cancelled(db, job_id: UUID) -> bool:
    return is_job_cancelled(db, job_id)


@celery_app.task(name="app.tasks.research.run_research", bind=True, max_retries=0)
def run_research(self, job_id: str) -> None:
    uid = UUID(job_id)

    with get_sync_db() as db:
        job = db.get(ResearchJob, uid)
        if not job:
            return

        project = db.get(Project, job.project_id)
        if not project:
            return

        if _abort_if_cancelled(db, uid):
            return

        now = datetime.now(UTC)
        job.status = "running"
        job.stage = "finding_competitors"
        job.started_at = now
        job.progress_pct = 5
        job.error = None
        project.status = "running"
        db.flush()

    competitors_found = 0

    def on_competitor_found(count: int) -> None:
        nonlocal competitors_found
        competitors_found = count
        progress = min(25, 8 + count * 2)
        stats = {
            "competitors_found": count,
            "reviews_collected": 0,
            "pain_clusters_found": 0,
        }
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if not job or not project:
                return
            if _abort_if_cancelled(db, uid):
                return
            _update_progress(
                db,
                job,
                project,
                stage="finding_competitors",
                progress_pct=progress,
                stats=stats,
            )

    try:
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if not job or not project:
                return

            if _abort_if_cancelled(db, uid):
                return

            result = discover_competitors_for_project(db, project, on_found=on_competitor_found)
            competitors_found = len(result.competitors)

            if competitors_found < MIN_COMPETITORS:
                _fail_job(
                    db,
                    job,
                    project,
                    insufficient_competitors_error(competitors_found, llm_error=result.llm_error),
                )
                return

            if _abort_if_cancelled(db, uid):
                return

            stats = {
                "competitors_found": competitors_found,
                "reviews_collected": 0,
                "pain_clusters_found": 0,
            }
            _update_progress(
                db,
                job,
                project,
                stage="finding_competitors",
                progress_pct=28,
                stats=stats,
            )
    except Exception as exc:  # noqa: BLE001 — surface pipeline errors on the job record
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if job and project:
                _fail_job(
                    db,
                    job,
                    project,
                    {
                        "code": "competitor_discovery_failed",
                        "message": "Competitor discovery failed. Check API logs and try again.",
                        "details": {"reason": str(exc)},
                    },
                )
        return

    if _exit_if_cancelled(uid):
        return

    base_stats = {
        "competitors_found": competitors_found,
        "reviews_collected": 0,
        "pain_clusters_found": 0,
        "competitors_scraped": 0,
        "warnings": [],
    }

    def on_collection_progress(*, competitors_done: int, competitors_total: int, reviews_collected: int) -> None:
        span = max(competitors_total, 1)
        progress = 28 + int((competitors_done / span) * 40)
        stats = {
            **base_stats,
            "reviews_collected": reviews_collected,
            "competitors_scraped": competitors_done,
        }
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if not job or not project:
                return
            if _abort_if_cancelled(db, uid):
                return
            _update_progress(
                db,
                job,
                project,
                stage="collecting_reviews",
                progress_pct=min(68, progress),
                stats=stats,
            )

    if _exit_if_cancelled(uid):
        return

    try:
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if not job or not project:
                return
            if _abort_if_cancelled(db, uid):
                return

            competitors = list_project_competitors(db, project.id)
            collection_result = collect_reviews_for_project(
                db,
                project,
                competitors,
                on_progress=on_collection_progress,
                should_cancel=lambda: _exit_if_cancelled(uid),
            )

            # Best-effort scraping: G2/Capterra sit behind Cloudflare and may block us.
            # Rather than hard-fail, we proceed with whatever was collected and surface
            # a warning so the report can note limited data confidence.
            warnings = list(collection_result.warnings)
            min_successful = max(1, ceil(len(competitors) * MIN_COMPETITOR_SUCCESS_RATIO))
            if collection_result.total_reviews == 0:
                warnings.append("no_reviews_collected")
            elif collection_result.competitors_with_reviews < min_successful:
                warnings.append("partial_reviews")

            base_stats = {
                "competitors_found": competitors_found,
                "reviews_collected": collection_result.total_reviews,
                "pain_clusters_found": 0,
                "competitors_scraped": collection_result.competitors_with_reviews,
                "warnings": warnings,
            }
            _update_progress(
                db,
                job,
                project,
                stage="collecting_reviews",
                progress_pct=68,
                stats=base_stats,
            )
    except ResearchCancelled:
        return
    except Exception as exc:  # noqa: BLE001
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if job and project:
                _fail_job(
                    db,
                    job,
                    project,
                    {
                        "code": "review_collection_failed",
                        "message": "Review collection failed. Ensure Playwright is installed and try again.",
                        "details": {"reason": str(exc)},
                    },
                )
        return

    if _exit_if_cancelled(uid):
        return

    def on_analysis_progress(*, step: str, reviews_cleaned: int, clusters_found: int) -> None:
        stats = {
            **base_stats,
            "reviews_analyzed": reviews_cleaned,
            "pain_clusters_found": clusters_found,
        }
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if not job or not project:
                return
            if _abort_if_cancelled(db, uid):
                return
            _update_progress(
                db,
                job,
                project,
                stage="analyzing",
                progress_pct=_analysis_progress_pct(step),
                stats=stats,
            )

    if _exit_if_cancelled(uid):
        return

    try:
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if not job or not project:
                return
            if _abort_if_cancelled(db, uid):
                return

            analysis_result = run_pain_analysis(db, project, on_progress=on_analysis_progress)

            warnings = list(base_stats.get("warnings", []))
            warnings.extend(analysis_result.warnings)

            base_stats = {
                **base_stats,
                "pain_clusters_found": analysis_result.clusters_found,
                "reviews_analyzed": analysis_result.reviews_embedded or analysis_result.reviews_cleaned,
                "warnings": warnings,
            }
            _update_progress(
                db,
                job,
                project,
                stage="analyzing",
                progress_pct=88,
                stats=base_stats,
            )
    except Exception as exc:  # noqa: BLE001
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if job and project:
                _fail_job(
                    db,
                    job,
                    project,
                    {
                        "code": "analysis_failed",
                        "message": "Pain analysis failed. Check API logs and OpenAI quota.",
                        "details": {"reason": str(exc)},
                    },
                )
        return

    if _exit_if_cancelled(uid):
        return

    def on_report_progress(*, clusters_done: int, clusters_total: int) -> None:
        span = max(clusters_total, 1)
        progress = 88 + int((clusters_done / span) * 7)
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if not job or not project:
                return
            if _abort_if_cancelled(db, uid):
                return
            _update_progress(
                db,
                job,
                project,
                stage="generating_report",
                progress_pct=min(95, progress),
                stats=base_stats,
            )

    if _exit_if_cancelled(uid):
        return

    try:
        # Short, committed transaction for the initial progress update — we must NOT
        # hold a lock on research_jobs while the slow LLM report work runs, otherwise
        # the concurrent progress writes deadlock into a statement timeout.
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if not job or not project:
                return
            _update_progress(db, job, project, stage="generating_report", progress_pct=90, stats=base_stats)

        # Report generation runs in its own session and releases its transaction
        # before the LLM calls, so nothing holds a DB lock during the slow work.
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if not project:
                return
            report_result = generate_report_for_project(
                db,
                project,
                reviews_collected=base_stats.get("reviews_collected", 0),
                warnings=list(base_stats.get("warnings", [])),
                on_progress=on_report_progress,
            )

        warnings = list(base_stats.get("warnings", []))
        warnings.extend(report_result.warnings)
        base_stats = {**base_stats, "warnings": warnings}

        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if job and project:
                _update_progress(db, job, project, stage="generating_report", progress_pct=98, stats=base_stats)
    except Exception as exc:  # noqa: BLE001
        with get_sync_db() as db:
            job = db.get(ResearchJob, uid)
            project = db.get(Project, job.project_id) if job else None
            if job and project:
                _fail_job(
                    db,
                    job,
                    project,
                    {
                        "code": "report_generation_failed",
                        "message": "We could not finish building your report. You can retry from this page.",
                        "details": {"reason": str(exc)},
                    },
                )
        return

    if _exit_if_cancelled(uid):
        return

    with get_sync_db() as db:
        job = db.get(ResearchJob, uid)
        project = db.get(Project, job.project_id) if job else None
        if not job or not project:
            return
        if _abort_if_cancelled(db, uid):
            return
        if project.research_mode == "preview":
            profile = db.get(Profile, project.user_id)
            if profile:
                mark_preview_used(profile)
        elif project.research_mode == "full":
            enqueue_library_article(str(project.id))
        _update_progress(db, job, project, stage="completed", progress_pct=100, stats=base_stats)
