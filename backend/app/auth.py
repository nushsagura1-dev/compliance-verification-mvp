from fastapi import Header, HTTPException, status
from app.config import get_settings

settings = get_settings()


async def require_admin(x_admin_key: str = Header(..., alias="X-Admin-Key")) -> None:
    """
    FastAPI dependency: validates the X-Admin-Key header.
    A single admin key is sufficient for this MVP.
    Returns nothing on success; raises 401 on failure.
    """
    if x_admin_key != settings.secret_admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing Admin API key.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
