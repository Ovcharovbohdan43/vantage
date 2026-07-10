from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps.auth import AuthUser, get_current_user
from app.schemas.billing import CreditsOut
from app.services.credits import get_user_credits

router = APIRouter(prefix="/me", tags=["auth"])


@router.get("")
async def me(
    user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    credits = await get_user_credits(db, user.id, user.email)
    return {
        "id": str(user.id),
        "email": user.email,
        "credits": credits.total_credits,
        "free_preview_available": credits.free_preview_available,
    }
