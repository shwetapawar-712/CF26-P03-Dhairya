"""Authentication API routes: login, me, logout."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_session
from app.models.database_models import User, AuditLog
from app.auth import verify_password, create_access_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str
    app_role: str


# ─── Endpoints ───────────────────────────────────────────────────────────────

from sqlalchemy import select, func


@router.post("/login", response_model=LoginResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_session),
):
    """Authenticate user credentials and return a JWT access token."""
    clean_username = (data.username or "").strip().lower()
    result = await db.execute(select(User).where(func.lower(User.username) == clean_username))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    if not verify_password(data.password, user.password_hash):
        # Audit: failed login
        audit = AuditLog(
            action="login_failed",
            policy_text=f"Failed login attempt for username: {data.username}",
            verification_status="pending",
            errors=[f"Invalid password for user {data.username}"],
            details={"username": data.username},
        )
        db.add(audit)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    token = create_access_token(data={"sub": str(user.id)})

    # Audit: successful login
    audit = AuditLog(
        user_id=user.id,
        action="login",
        policy_text=f"User '{user.username}' logged in as {user.app_role}",
        verification_status="passed",
        errors=[],
        details={"username": user.username, "app_role": user.app_role},
    )
    db.add(audit)
    await db.commit()

    logger.info(f"User '{user.username}' authenticated successfully (role: {user.app_role})")

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name or user.username,
            "app_role": user.app_role,
        },
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's information."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name or current_user.username,
        app_role=current_user.app_role,
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint — token is invalidated client-side.
    
    For a prototype with stateless JWT, the client simply discards the token.
    A production system would maintain a token blacklist.
    """
    return {"status": "logged_out", "message": "Token discarded on client side."}
