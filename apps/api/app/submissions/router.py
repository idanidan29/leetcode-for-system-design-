from uuid import UUID

from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.post("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def create_submission() -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "create submission not implemented yet")


@router.get("/{submission_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def get_submission(submission_id: UUID) -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "get submission not implemented yet")


@router.patch("/{submission_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def update_submission(submission_id: UUID) -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "update submission not implemented yet")
