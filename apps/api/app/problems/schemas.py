from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.db.models import Difficulty


class ProblemRead(BaseModel):
    """API representation of a problem. Same shape for list + detail."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    difficulty: Difficulty
    statement: str
    functional_requirements: list[str]
    non_functional_requirements: list[str]
    constraints: dict[str, Any]
    tags: list[str]
    created_at: datetime


class ProblemListResponse(BaseModel):
    items: list[ProblemRead]
    next_cursor: str | None = None
