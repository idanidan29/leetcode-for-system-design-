from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import service
from app.auth.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from app.auth.dependencies import get_current_user
from app.auth.schemas import LoginRequest, SignupRequest, UserOut
from app.core.security import decode_token
from app.db.models import User
from app.db.session import get_session

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=UserOut)
async def signup(
    body: SignupRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserOut:
    user = await service.signup(session, body.email, body.password, body.display_name)
    set_auth_cookies(response, str(user.id))
    return UserOut.model_validate(user)


@router.post("/login", response_model=UserOut)
async def login(
    body: LoginRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserOut:
    user = await service.authenticate(session, body.email, body.password)
    set_auth_cookies(response, str(user.id))
    return UserOut.model_validate(user)


@router.post("/refresh", response_model=UserOut)
async def refresh(
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserOut:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "no refresh token")
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong token type")
        user_id = UUID(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid refresh token") from exc

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user not found")

    set_auth_cookies(response, str(user.id))
    return UserOut.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    clear_auth_cookies(response)


@router.get("/me", response_model=UserOut)
async def me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return UserOut.model_validate(user)
