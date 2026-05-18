import re
from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignupRequest(BaseModel):
    email: str
    password: Annotated[str, Field(min_length=8, max_length=200)]
    display_name: Annotated[str, Field(min_length=1, max_length=100)]

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("invalid email format")
        return v

    @field_validator("display_name")
    @classmethod
    def trim_display_name(cls, v: str) -> str:
        return v.strip()


class LoginRequest(BaseModel):
    email: str
    password: Annotated[str, Field(min_length=1, max_length=200)]

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserOut(BaseModel):
    """User shape returned to the frontend. Never includes password_hash."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str
    created_at: datetime
