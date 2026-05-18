"""Cookie helpers for storing auth tokens. Spec: docs/MVP.md + memory."""

from fastapi import Response

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"

# Refresh cookie is scoped so it's only sent on the refresh endpoint —
# minimises exposure of the long-lived token.
REFRESH_COOKIE_PATH = "/api/v1/auth/refresh"


def set_auth_cookies(response: Response, user_id: str) -> None:
    """Issue a new access + refresh pair and attach them as httpOnly cookies."""
    access = create_access_token(user_id)
    refresh = create_refresh_token(user_id)

    response.set_cookie(
        ACCESS_COOKIE,
        access,
        max_age=settings.access_token_ttl_minutes * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,  # type: ignore[arg-type]
        domain=settings.cookie_domain,
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=settings.refresh_token_ttl_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,  # type: ignore[arg-type]
        domain=settings.cookie_domain,
        path=REFRESH_COOKIE_PATH,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/", domain=settings.cookie_domain)
    response.delete_cookie(
        REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, domain=settings.cookie_domain
    )
