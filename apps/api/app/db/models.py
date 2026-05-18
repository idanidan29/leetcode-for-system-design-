"""SQLModel table models. Imported by Alembic for autogenerate."""

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class EvaluationStatus(str, Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    display_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Problem(SQLModel, table=True):
    __tablename__ = "problems"

    id: str = Field(primary_key=True)
    title: str
    difficulty: Difficulty
    statement: str
    functional_requirements: list[str] = Field(default_factory=list, sa_column=Column(JSONB))
    non_functional_requirements: list[str] = Field(default_factory=list, sa_column=Column(JSONB))
    constraints: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    tags: list[str] = Field(default_factory=list, sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Submission(SQLModel, table=True):
    __tablename__ = "submissions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    problem_id: str = Field(foreign_key="problems.id", index=True)
    diagram: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    evaluation: dict[str, Any] | None = Field(default=None, sa_column=Column(JSONB, nullable=True))
    evaluation_status: EvaluationStatus = Field(default=EvaluationStatus.pending)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
