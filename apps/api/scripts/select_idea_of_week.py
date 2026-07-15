"""Select and publish the weekly idea.

Usage (from apps/api):
  py scripts/select_idea_of_week.py
  py scripts/select_idea_of_week.py --week 2026-07-13
  py scripts/select_idea_of_week.py --force
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import AsyncSessionLocal
from app.services.idea_of_week import select_idea_of_week


async def run(target_week: date | None, force: bool) -> None:
    async with AsyncSessionLocal() as db:
        selection = await select_idea_of_week(db, target_week=target_week, force=force)
        print(
            f"Published {selection.week_slug}: {selection.headline} "
            f"(query={selection.trend_query!r}, score={selection.selection_score:.1f})"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish Idea of the Week")
    parser.add_argument("--week", type=date.fromisoformat, default=None, help="Any date in target week")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace an already published selection for the target week",
    )
    args = parser.parse_args()
    asyncio.run(run(args.week, args.force))


if __name__ == "__main__":
    main()
