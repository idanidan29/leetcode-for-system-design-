from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.types import String

from app.db.models import Difficulty, Problem
from app.db.session import get_session
from app.problems.schemas import ProblemListResponse, ProblemRead

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("", response_model=ProblemListResponse)
async def list_problems(
    session: Annotated[AsyncSession, Depends(get_session)],
    difficulty: Difficulty | None = None,
    tags: Annotated[list[str] | None, Query()] = None,
    cursor: Annotated[str | None, Query(description="Last seen problem id from previous page")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> ProblemListResponse:
    """List problems with optional filters and cursor pagination."""
    stmt = select(Problem).order_by(Problem.id)

    if difficulty is not None:
        stmt = stmt.where(Problem.difficulty == difficulty)

    if tags:
        # Postgres JSONB ?| → array contains any of these tag values
        stmt = stmt.where(Problem.tags.op("?|")(cast(tags, ARRAY(String))))

    if cursor:
        stmt = stmt.where(Problem.id > cursor)

    # Fetch limit+1 to detect whether there's a next page
    stmt = stmt.limit(limit + 1)
    result = await session.execute(stmt)
    rows = list(result.scalars().all())

    next_cursor: str | None = None
    if len(rows) > limit:
        rows = rows[:limit]
        next_cursor = rows[-1].id

    return ProblemListResponse(
        items=[ProblemRead.model_validate(r) for r in rows],
        next_cursor=next_cursor,
    )


@router.get("/{problem_id}", response_model=ProblemRead)
async def get_problem(
    problem_id: str,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProblemRead:
    problem = await session.get(Problem, problem_id)
    if not problem:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"problem '{problem_id}' not found")
    return ProblemRead.model_validate(problem)
