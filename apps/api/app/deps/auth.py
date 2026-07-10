import time
from typing import Annotated
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

security = HTTPBearer(auto_error=False)

_JWKS_CACHE: dict[str, dict] = {}
_JWKS_FETCHED_AT: float = 0.0
_JWKS_TTL_SECONDS = 3600.0


class AuthUser(BaseModel):
    id: UUID
    email: str | None = None


def _jwks_url() -> str | None:
    base = settings.supabase_url.rstrip("/")
    if not base.startswith("http"):
        return None
    return f"{base}/auth/v1/.well-known/jwks.json"


async def _get_jwk(kid: str, *, force_refresh: bool = False) -> dict | None:
    global _JWKS_FETCHED_AT

    fresh = (time.time() - _JWKS_FETCHED_AT) < _JWKS_TTL_SECONDS
    if not force_refresh and fresh and kid in _JWKS_CACHE:
        return _JWKS_CACHE[kid]

    url = _jwks_url()
    if not url:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            keys = response.json().get("keys", [])
    except (httpx.HTTPError, ValueError):
        return _JWKS_CACHE.get(kid)

    _JWKS_CACHE.clear()
    for key in keys:
        if isinstance(key, dict) and key.get("kid"):
            _JWKS_CACHE[key["kid"]] = key
    _JWKS_FETCHED_AT = time.time()
    return _JWKS_CACHE.get(kid)


async def _decode_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    alg = header.get("alg", "")
    kid = header.get("kid")

    if alg == "HS256":
        if not settings.supabase_jwt_secret:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Auth not configured",
            )
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except JWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    # Asymmetric signing (ES256 / RS256) via Supabase JWKS
    if not kid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    jwk = await _get_jwk(kid)
    if jwk is None:
        jwk = await _get_jwk(kid, force_refresh=True)
    if jwk is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signing key not found")

    try:
        return jwt.decode(
            token,
            jwk,
            algorithms=[alg],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> AuthUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = await _decode_token(credentials.credentials)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    try:
        user_id = UUID(sub)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    return AuthUser(id=user_id, email=payload.get("email"))


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> AuthUser | None:
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
