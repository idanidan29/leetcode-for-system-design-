"""Auth business logic — signup, login, password verification."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password
from app.db.models import User


async def signup(
    session: AsyncSession,
    email: str,
    password: str,
    display_name: str,
) -> User:
    existing = await session.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "email already registered")

    user = User(
        email=email,
        password_hash=hash_password(password),
        display_name=display_name,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate(session: AsyncSession, email: str, password: str) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    # Run verify_password unconditionally with a dummy hash on miss to keep
    # response time roughly constant — defends against user-enumeration timing.
    dummy = "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    ok = verify_password(password, user.password_hash if user else dummy)
    if not user or not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid email or password")
    return user
