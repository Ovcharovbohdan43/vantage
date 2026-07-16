"""Apply blog_posts migration SQL to the configured database."""
from __future__ import annotations

import asyncio
import re
from pathlib import Path

from sqlalchemy import text

from app.db.session import AsyncSessionLocal

MIGRATION = Path(__file__).resolve().parents[3] / "infra" / "supabase" / "migrations" / "20260716183000_blog_posts.sql"


def _statements(sql: str) -> list[str]:
    chunks = re.split(r";\s*\n", sql)
    out: list[str] = []
    for chunk in chunks:
        statement = "\n".join(
            line for line in chunk.splitlines() if line.strip() and not line.strip().startswith("--")
        ).strip()
        if statement:
            out.append(f"{statement};")
    return out


async def main() -> None:
    sql = MIGRATION.read_text(encoding="utf-8")
    async with AsyncSessionLocal() as db:
        for statement in _statements(sql):
            await db.execute(text(statement))
        await db.commit()
        result = await db.execute(text("SELECT to_regclass('public.blog_posts')"))
        print("Applied migration. blog_posts table:", result.scalar())


if __name__ == "__main__":
    asyncio.run(main())
