from uuid import UUID

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/submissions", tags=["evaluation"])


@router.post("/{submission_id}/evaluate", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def evaluate_submission(submission_id: UUID) -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "evaluation not implemented yet")


@router.get("/{submission_id}/evaluation", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def get_evaluation(submission_id: UUID) -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "get evaluation not implemented yet")
