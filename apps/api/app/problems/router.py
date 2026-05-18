from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/problems", tags=["problems"])


@router.get("", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def list_problems() -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "list problems not implemented yet")


@router.get("/{problem_id}", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def get_problem(problem_id: str) -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "get problem not implemented yet")
