from datetime import UTC, datetime

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "reserchmarket-api",
        "timestamp": datetime.now(UTC).isoformat(),
    }
