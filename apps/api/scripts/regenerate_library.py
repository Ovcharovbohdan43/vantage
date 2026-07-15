"""Stage or activate rich revisions for already-published Library articles.

Usage (from apps/api):
  py scripts/regenerate_library.py --dry-run
  py scripts/regenerate_library.py --stage --limit 5
  py scripts/regenerate_library.py --activate --revision-id <uuid>
  py scripts/regenerate_library.py --activate

Staging never changes a live article. Activation updates the existing row in
place, preserving its slug, first-published timestamp, counters, and events.
"""

from __future__ import annotations

import argparse
import os
import sys
from uuid import UUID

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from app.db.models import LibraryArticle, LibraryArticleRevision, Project, Report
from app.db.sync_session import get_sync_db
from app.services.library_article_generation import (
    activate_library_article_revision,
    generate_library_article_for_project,
)


def _published_project_ids(
    db,
    project_id: UUID | None,
    limit: int | None,
) -> list[UUID]:
    query = (
        select(Project.id)
        .join(Report, Report.project_id == Project.id)
        .join(LibraryArticle, LibraryArticle.project_id == Project.id)
        .where(LibraryArticle.status == "published")
        .order_by(LibraryArticle.published_at.asc())
    )
    if project_id:
        query = query.where(Project.id == project_id)
    if limit:
        query = query.limit(limit)
    return list(db.scalars(query).all())


def _staged_revision_ids(
    db,
    revision_id: UUID | None,
    project_id: UUID | None,
    limit: int | None,
) -> list[UUID]:
    query = (
        select(LibraryArticleRevision.id)
        .join(LibraryArticle, LibraryArticle.id == LibraryArticleRevision.article_id)
        .where(LibraryArticleRevision.status == "staged")
        .order_by(LibraryArticleRevision.created_at.asc())
    )
    if revision_id:
        query = query.where(LibraryArticleRevision.id == revision_id)
    if project_id:
        query = query.where(LibraryArticle.project_id == project_id)
    if limit:
        query = query.limit(limit)
    return list(db.scalars(query).all())


def main() -> None:
    parser = argparse.ArgumentParser(description="Safely regenerate public Library articles")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--dry-run", action="store_true", help="List published articles only")
    action.add_argument("--stage", action="store_true", help="Generate internal staged revisions")
    action.add_argument("--activate", action="store_true", help="Activate existing staged revisions")
    parser.add_argument("--project-id", type=str, default=None)
    parser.add_argument("--revision-id", type=str, default=None)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    project_id = UUID(args.project_id) if args.project_id else None
    revision_id = UUID(args.revision_id) if args.revision_id else None

    with get_sync_db() as db:
        if args.activate:
            ids = _staged_revision_ids(db, revision_id, project_id, args.limit)
        else:
            ids = _published_project_ids(db, project_id, args.limit)

    if not ids:
        print("No eligible records found.")
        return

    if args.dry_run:
        print(f"Found {len(ids)} published article(s) eligible for staged regeneration.")
        for item_id in ids:
            print(f"  - project {item_id}")
        return

    succeeded = 0
    failed = 0
    for item_id in ids:
        with get_sync_db() as db:
            if args.stage:
                # Already-public legacy preview articles are eligible too. They receive
                # every verified metric available in their stored report snapshot.
                result = generate_library_article_for_project(
                    db,
                    item_id,
                    allow_preview=True,
                    stage_only=True,
                )
                label = "staged"
            else:
                result = activate_library_article_revision(db, item_id)
                label = "active"

        successful_statuses = {label}
        if args.stage:
            successful_statuses.add("active")
        if result.status in successful_statuses:
            succeeded += 1
            print(
                f"OK {label}: revision={result.revision_id} "
                f"article={result.article_id} /library/{result.slug}"
            )
        else:
            failed += 1
            print(f"FAIL {item_id}: {result.error or result.status}")

    print(f"Done. Succeeded: {succeeded}, failed: {failed}.")


if __name__ == "__main__":
    main()
