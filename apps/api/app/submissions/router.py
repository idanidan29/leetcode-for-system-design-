from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.db.models import EvaluationStatus, Submission, User
from app.db.session import get_session
from app.submissions.schemas import (
    SubmissionCreate,
    SubmissionListResponse,
    SubmissionRead,
    SubmissionUpdate,
)

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=SubmissionRead,
)
async def create_submission(
    body: SubmissionCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SubmissionRead:
    sub = Submission(
        user_id=user.id,
        problem_id=body.problem_id,
        diagram=body.diagram.model_dump(),
        evaluation_status=EvaluationStatus.pending,
    )
    session.add(sub)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"unknown problem '{body.problem_id}'",
        ) from exc
    await session.refresh(sub)
    return SubmissionRead.model_validate(sub)


@router.get("", response_model=SubmissionListResponse)
async def list_submissions(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    problem_id: str | None = None,
    cursor: Annotated[
        str | None,
        Query(description="ISO timestamp of the last seen submission's created_at"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> SubmissionListResponse:
    """Always scoped to the current user (no `mine=true` flag needed)."""
    stmt = (
        select(Submission)
        .where(Submission.user_id == user.id)
        .order_by(desc(Submission.created_at), desc(Submission.id))
    )
    if problem_id:
        stmt = stmt.where(Submission.problem_id == problem_id)
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
        except ValueError as exc:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "invalid cursor format"
            ) from exc
        stmt = stmt.where(Submission.created_at < cursor_dt)

    stmt = stmt.limit(limit + 1)
    result = await session.execute(stmt)
    rows = list(result.scalars().all())

    next_cursor: str | None = None
    if len(rows) > limit:
        rows = rows[:limit]
        next_cursor = rows[-1].created_at.isoformat()

    return SubmissionListResponse(
        items=[SubmissionRead.model_validate(r) for r in rows],
        next_cursor=next_cursor,
    )


@router.get("/{submission_id}", response_model=SubmissionRead)
async def get_submission(
    submission_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SubmissionRead:
    sub = await session.get(Submission, submission_id)
    # Return 404 (not 403) on ownership mismatch so we don't leak existence.
    if not sub or sub.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "submission not found")
    return SubmissionRead.model_validate(sub)


@router.patch("/{submission_id}", response_model=SubmissionRead)
async def update_submission(
    submission_id: UUID,
    body: SubmissionUpdate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SubmissionRead:
    sub = await session.get(Submission, submission_id)
    if not sub or sub.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "submission not found")

    sub.diagram = body.diagram.model_dump()
    sub.updated_at = datetime.utcnow()
    # The previous evaluation is stale now — clear it.
    sub.evaluation = None
    sub.evaluation_status = EvaluationStatus.pending
    await session.commit()
    await session.refresh(sub)
    return SubmissionRead.model_validate(sub)
