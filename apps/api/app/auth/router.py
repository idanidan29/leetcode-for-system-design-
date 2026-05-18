from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def signup() -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "signup not implemented yet")


@router.post("/login", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def login() -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "login not implemented yet")


@router.post("/refresh", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def refresh() -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "refresh not implemented yet")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> None:
    return None


@router.get("/me", status_code=status.HTTP_501_NOT_IMPLEMENTED)
async def me() -> dict[str, str]:
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "me not implemented yet")
