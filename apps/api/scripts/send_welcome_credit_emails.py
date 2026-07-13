"""One-off: grant 1 starter credit + welcome email to specific users.

Usage (from apps/api):
  py scripts/send_welcome_credit_emails.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.db.models import Profile
from app.db.session import AsyncSessionLocal
from app.services.resend_email import send_email
from app.services.welcome_email import welcome_email_parts

RECIPIENTS = [
    "binrx53006@minitts.net",
]


async def main() -> None:
    unique = list(dict.fromkeys(e.strip().lower() for e in RECIPIENTS if e.strip()))

    async with AsyncSessionLocal() as db:
        for email in unique:
            result = await db.execute(select(Profile).where(Profile.email == email))
            profile = result.scalar_one_or_none()
            if profile is None:
                result = await db.execute(select(Profile))
                profiles = list(result.scalars().all())
                profile = next((p for p in profiles if (p.email or "").lower() == email), None)

            if profile:
                profile.starter_credits = int(profile.starter_credits or 0) + 1
                await db.flush()
                print(f"credit:+1 email={email} total_starter={profile.starter_credits}")
            else:
                print(f"credit:SKIP no profile for {email}")

            subject, html, text = welcome_email_parts(email=email, credits=1)

            try:
                resend_id, _stored = await send_email(
                    db,
                    to=[email],
                    subject=subject,
                    html=html,
                    text=text,
                    category="transactional",
                    tags=[
                        {"name": "type", "value": "welcome_gift_credit"},
                    ],
                )
                print(f"email:OK email={email} id={resend_id}")
            except Exception as exc:  # noqa: BLE001
                print(f"email:FAIL email={email} error={exc}")

        await db.commit()
    print("done")


if __name__ == "__main__":
    asyncio.run(main())
