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


class Evaluation(BaseModel):
    scores: dict[str, CategoryScore]
    strengths: list[str]
    issues: list[Issue]
    suggestions: list[str]
