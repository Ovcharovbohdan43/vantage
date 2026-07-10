from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_service_security = HTTPBearer(auto_error=False)


async def require_service_role(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_service_security)],
) -> None:
    secret = settings.supabase_service_role_key.strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service role auth is not configured",
        )
    if credentials is None or credentials.credentials != secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
