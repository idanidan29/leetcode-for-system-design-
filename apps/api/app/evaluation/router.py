"""Evaluation endpoints.

POST /submissions/:id/evaluate   — runs the LLM, persists the result
GET  /submissions/:id/evaluation — returns the stored evaluation (if any)

Auth + ownership-scoped: a submission belongs to exactly one user, and the
evaluation lives on that submission row.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.limiter import limiter
from app.db.models import EvaluationStatus, Problem, Submission, User
from app.db.session import get_session
from app.submissions.schemas import Diagram, SubmissionRead

from .dependencies import get_provider
from .provider import LLMProvider
from .schemas import HintsResponse, SolutionResponse
from .service import EvaluationError, evaluate, generate_hints, generate_solution

router = APIRouter(prefix="/submissions", tags=["evaluation"])
hints_router = APIRouter(prefix="/problems", tags=["evaluation"])
logger = logging.getLogger(__name__)

EVAL_TIMEOUT_S = 30.0
HINTS_TIMEOUT_S = 20.0
SOLUTION_TIMEOUT_S = 45.0

# Cap notes so a runaway client can't blow up the prompt or the row.
MAX_NOTES_CHARS = 4000


class EvaluateRequest(BaseModel):
    """Optional inputs for evaluation. Notes act as the candidate's
    verbal explanation alongside the diagram."""

    notes: str = Field(default="", max_length=MAX_NOTES_CHARS)


@router.post("/{submission_id}/evaluate", response_model=SubmissionRead)
@limiter.limit(f"{settings.evaluation_rate_limit_per_hour}/hour")
async def evaluate_submission(
    request: Request,  # noqa: ARG001 — required by slowapi's decorator
    submission_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[LLMProvider, Depends(get_provider)],
    body: Annotated[EvaluateRequest | None, Body()] = None,
) -> SubmissionRead:
    notes = body.notes if body is not None else ""
    sub = await session.get(Submission, submission_id)
    # 404 on either missing OR wrong owner — don't leak existence.
    if not sub or sub.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "submission not found")

    problem = await session.get(Problem, sub.problem_id)
    if not problem:
        # Shouldn't happen given the FK, but guard anyway.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "problem not found")

    # Mark running so the client can poll while we wait.
    sub.evaluation_status = EvaluationStatus.running
    sub.updated_at = datetime.utcnow()
    await session.commit()

    # Re-parse the stored JSONB back into Pydantic — paranoia, but cheap.
    diagram = Diagram.model_validate(sub.diagram)

    try:
        ev = await asyncio.wait_for(
            evaluate(provider, problem, diagram, notes),
            timeout=EVAL_TIMEOUT_S,
        )
    except (EvaluationError, asyncio.TimeoutError) as exc:
        logger.exception(
            "evaluation failed",
            extra={"submission_id": str(submission_id), "user_id": str(user.id)},
        )
        sub.evaluation_status = EvaluationStatus.failed
        sub.evaluation = None
        sub.updated_at = datetime.utcnow()
        await session.commit()
        # 503 = upstream provider failed; client can show "try again".
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "evaluation failed — please try again in a moment",
        ) from exc

    # JSONB column wants a plain dict; round-trip through model_dump.
    sub.evaluation = ev.model_dump(mode="json")
    sub.evaluation_status = EvaluationStatus.done
    sub.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(sub)
    return SubmissionRead.model_validate(sub)


class HintsRequest(BaseModel):
    diagram: Diagram


@hints_router.post("/{problem_id}/hints", response_model=HintsResponse)
@limiter.limit(f"{settings.evaluation_rate_limit_per_hour}/hour")
async def get_hints(
    request: Request,  # noqa: ARG001 — required by slowapi's decorator
    problem_id: str,
    body: HintsRequest,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[LLMProvider, Depends(get_provider)],
) -> HintsResponse:
    """Get three progressive hints tailored to the current diagram.

    Diagram is NOT persisted — it's passed transiently so the user can ask
    for hints mid-design without committing to a submission.
    """
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "problem not found")

    try:
        hints = await asyncio.wait_for(
            generate_hints(provider, problem, body.diagram),
            timeout=HINTS_TIMEOUT_S,
        )
    except (EvaluationError, asyncio.TimeoutError) as exc:
        logger.exception(
            "hints generation failed",
            extra={"problem_id": problem_id, "user_id": str(user.id)},
        )
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "hint generation failed — please try again",
        ) from exc

    return hints


@hints_router.post("/{problem_id}/solution", response_model=SolutionResponse)
@limiter.limit(f"{settings.evaluation_rate_limit_per_hour}/hour")
async def get_reference_solution(
    request: Request,  # noqa: ARG001 — required by slowapi's decorator
    problem_id: str,
    user: Annotated[User, Depends(get_current_user)],  # noqa: ARG001 — auth gate
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[LLMProvider, Depends(get_provider)],
) -> SolutionResponse:
    """Get a reference solution for this problem.

    Cached server-side per problem_id — repeated calls hit the cache.
    """
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "problem not found")

    try:
        sol = await asyncio.wait_for(
            generate_solution(provider, problem),
            timeout=SOLUTION_TIMEOUT_S,
        )
    except (EvaluationError, asyncio.TimeoutError) as exc:
        logger.exception("solution generation failed", extra={"problem_id": problem_id})
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "reference solution failed — please try again",
        ) from exc

    return sol


@router.get(
    "/{submission_id}/evaluation",
    responses={404: {"description": "submission not found"}},
)
async def get_evaluation(
    submission_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, Any] | None:
    """Fetch just the evaluation payload (null if not yet run)."""
    sub = await session.get(Submission, submission_id)
    if not sub or sub.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "submission not found")
    return sub.evaluation
