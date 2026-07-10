"""Backfill Research Library articles for existing completed full research.

Usage (from apps/api):
  py scripts/backfill_library.py
  py scripts/backfill_library.py --dry-run
  py scripts/backfill_library.py --project-id <uuid>

Imports all completed full-mode projects that have a report but no published library article.
"""

from __future__ import annotations

import argparse
import os
import sys
from uuid import UUID

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from app.db.models import LibraryArticle, Project, Report, ResearchJob
from app.db.sync_session import get_sync_db
from app.services.library_article_generation import generate_library_article_for_project


def _eligible_project_ids(db, project_id: UUID | None, *, include_preview: bool) -> list[UUID]:
    modes = ["full"]
    if include_preview:
        modes.append("preview")

    query = (
        select(Project.id)
        .join(Report, Report.project_id == Project.id)
        .where(Project.research_mode.in_(modes), Project.status == "completed")
    )
    if project_id:
        query = query.where(Project.id == project_id)

    ids = list(db.scalars(query).all())

    eligible: list[UUID] = []
    for pid in ids:
        job = db.scalar(
            select(ResearchJob)
            .where(ResearchJob.project_id == pid)
            .order_by(ResearchJob.created_at.desc())
        )
        if not job or job.status != "completed":
            continue

        article = db.scalar(select(LibraryArticle).where(LibraryArticle.project_id == pid))
        if article and article.status == "published":
            continue

        eligible.append(pid)

    return eligible


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill library articles from existing research")
    parser.add_argument("--dry-run", action="store_true", help="List projects only, do not generate")
    parser.add_argument("--include-preview", action="store_true", help="Also backfill completed preview research")
    parser.add_argument("--project-id", type=str, default=None, help="Process a single project UUID")
    args = parser.parse_args()

    project_id = UUID(args.project_id) if args.project_id else None

    with get_sync_db() as db:
        ids = _eligible_project_ids(db, project_id, include_preview=args.include_preview)

    if not ids:
        print("No eligible projects found (need: full mode, completed, with report, no published article).")
        return

    print(f"Found {len(ids)} project(s) to backfill.")

    if args.dry_run:
        for pid in ids:
            print(f"  - {pid}")
        return

    published = 0
    failed = 0
    for pid in ids:
        print(f"Generating library article for {pid}…", flush=True)
        with get_sync_db() as db:
            result = generate_library_article_for_project(
                db, pid, allow_preview=args.include_preview
            )
        if result.status == "published":
            published += 1
            print(f"  OK published: /library/{result.slug}")
        else:
            failed += 1
            print(f"  FAIL {result.status}: {result.error or 'unknown error'}")

    print(f"\nDone. Published: {published}, failed/skipped: {failed}.")


if __name__ == "__main__":
    main()
