from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import EvaluationStatus

# Hard caps so a runaway client can't blow up Postgres rows.
MAX_NODES = 100
MAX_EDGES = 200


class Position(BaseModel):
    x: float
    y: float


class DiagramNode(BaseModel):
    """One component on the whiteboard (gateway, cache, queue, etc.)."""

    id: str
    type: str
    label: str
    position: Position
    metadata: dict[str, Any] = Field(default_factory=dict)


class DiagramEdge(BaseModel):
    """A directed arrow between two nodes."""

    id: str
    source: str
    target: str
    label: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class Diagram(BaseModel):
    """Canonical canvas shape — what's stored in submissions.diagram."""

    version: int = 1
    nodes: Annotated[list[DiagramNode], Field(max_length=MAX_NODES)]
    edges: Annotated[list[DiagramEdge], Field(max_length=MAX_EDGES)]


class SubmissionCreate(BaseModel):
    problem_id: str
    diagram: Diagram


class SubmissionUpdate(BaseModel):
    diagram: Diagram


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    problem_id: str
    diagram: dict[str, Any]
    evaluation: dict[str, Any] | None
    evaluation_status: EvaluationStatus
    created_at: datetime
    updated_at: datetime


class SubmissionListResponse(BaseModel):
    items: list[SubmissionRead]
    next_cursor: str | None = None
