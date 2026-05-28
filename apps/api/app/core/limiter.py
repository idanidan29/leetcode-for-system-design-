"""SlowAPI rate-limiter. Keyed by user-id when authenticated, IP otherwise.

Rate-limited endpoints must declare `request: Request` in their signature —
slowapi's `@limiter.limit(...)` decorator inspects the function for it.
"""

from __future__ import annotations

from fastapi import Request
from jose import JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.cookies import ACCESS_COOKIE
from app.core.security import decode_token


def _user_id_or_ip(request: Request) -> str:
    """Prefer the authenticated user-id; fall back to IP for guests.

    We deliberately don't share the auth dependency here: slowapi keys are
    computed before route deps run, and we want the limiter to keep working
    even when the cookie is missing or malformed.
    """
    token = request.cookies.get(ACCESS_COOKIE)
    if token:
        try:
            payload = decode_token(token)
            sub = payload.get("sub")
            if isinstance(sub, str):
                return f"user:{sub}"
        except (JWTError, ValueError):
            pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=_user_id_or_ip)
