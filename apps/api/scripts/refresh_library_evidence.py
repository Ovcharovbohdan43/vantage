"""Refresh evidence (reviews_snapshot) for published library articles.

Usage (from apps/api):
  py scripts/refresh_library_evidence.py
  py scripts/refresh_library_evidence.py --slug customer-pain-analysis-of-analytics-software
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from app.db.models import LibraryArticle
from app.db.sync_session import get_sync_db
from app.services.library_article_generation import build_reviews_snapshot


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh library article evidence snapshots")
    parser.add_argument("--slug", type=str, default=None, help="Single article slug")
    args = parser.parse_args()

    with get_sync_db() as db:
        query = select(LibraryArticle).where(LibraryArticle.status == "published")
        if args.slug:
            query = query.where(LibraryArticle.slug == args.slug)
        articles = list(db.scalars(query).all())

    if not articles:
        print("No published articles found.")
        return

    for article in articles:
        with get_sync_db() as db:
            row = db.get(LibraryArticle, article.id)
            if not row:
                continue
            snapshot = build_reviews_snapshot(db, row.project_id, row.content)
            row.reviews_snapshot = snapshot
            row.reviews_count = len(snapshot)
            content = dict(row.content or {})
            dataset = dict(content.get("dataset") or {})
            dataset["reviews_analyzed"] = len(snapshot)
            content["dataset"] = dataset
            row.content = content
            db.commit()
            print(f"{row.slug}: {len(snapshot)} evidence item(s)")

    print("Done.")


if __name__ == "__main__":
    main()
