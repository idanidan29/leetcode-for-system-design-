from typing import Literal

from pydantic import BaseModel, Field


class CategoryScore(BaseModel):
    value: int = Field(ge=0, le=5)
    max: int = 5
    rationale: str


class Issue(BaseModel):
    severity: Literal["low", "medium", "high"]
    category: str
    text: str
    # Optional anchors back to the candidate's diagram so the frontend can
    # render badges on the affected components.
    node_ids: list[str] = Field(default_factory=list)


class Evaluation(BaseModel):
    scores: dict[str, CategoryScore]
    strengths: list[str]
    issues: list[Issue]
    suggestions: list[str]


class Hint(BaseModel):
    level: int = Field(ge=1, le=3, description="1=vague nudge, 2=specific, 3=structural")
    text: str


class HintsResponse(BaseModel):
    hints: list[Hint]


# ─── Reference solution ─────────────────────────────────────────────────────
# LLM-generated reference diagram. Positions are deliberately absent — the
# frontend computes a layout. Keeping the LLM out of pixel coordinates avoids
# wasted tokens and bad placement.


class SolutionNode(BaseModel):
    id: str
    type: str
    label: str


class SolutionEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str | None = None


class SolutionResponse(BaseModel):
    nodes: list[SolutionNode]
    edges: list[SolutionEdge]
    # node_id -> one-sentence rationale
    rationale: dict[str, str]
    # Couple-paragraph overall design narrative.
    narrative: str
