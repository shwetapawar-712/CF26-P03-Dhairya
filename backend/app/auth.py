"""Authentication helpers: JWT tokens, bcrypt password hashing, dependencies, and user seeding."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_session, async_session
from app.models.database_models import User

logger = logging.getLogger(__name__)

# ─── Password hashing ────────────────────────────────────────────────────────

def get_password_hash(plain: str) -> str:
    plain_bytes = plain.encode("utf-8")
    if len(plain_bytes) > 72:
        plain_bytes = plain_bytes[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        plain_bytes = plain.encode("utf-8")
        if len(plain_bytes) > 72:
            plain_bytes = plain_bytes[:72]
        return bcrypt.checkpw(plain_bytes, hashed.encode("utf-8"))
    except Exception:
        return False


# ─── JWT ─────────────────────────────────────────────────────────────────────

ALGORITHM = "HS256"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode a JWT token. Raises JWTError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


# ─── FastAPI security scheme ──────────────────────────────────────────────────

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_session),
) -> User:
    """FastAPI dependency — returns the authenticated User or raises 401."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please log in.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise credentials_exception

    try:
        payload = decode_token(credentials.credentials)
        user_id: Optional[int] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


async def require_manager(current_user: User = Depends(get_current_user)) -> User:
    """FastAPI dependency — ensures the authenticated user is a Manager."""
    if current_user.app_role != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Manager role required.",
        )
    return current_user


# ─── Default user seeding ─────────────────────────────────────────────────────

DEFAULT_USERS = [
    {
        "username": "employee",
        "display_name": "Alex Employee",
        "app_role": "employee",
        "password": "employee123",
    },
    {
        "username": "manager",
        "display_name": "Morgan Manager",
        "app_role": "manager",
        "password": "manager123",
    },
]


async def seed_default_users():
    """Create default Employee and Manager accounts if they don't already exist."""
    async with async_session() as session:
        for user_data in DEFAULT_USERS:
            result = await session.execute(
                select(User).where(User.username == user_data["username"])
            )
            existing = result.scalar_one_or_none()
            if existing is None:
                new_user = User(
                    username=user_data["username"],
                    display_name=user_data["display_name"],
                    app_role=user_data["app_role"],
                    password_hash=get_password_hash(user_data["password"]),
                    role="user",
                )
                session.add(new_user)
                logger.info(f"Seeded default user: {user_data['username']} ({user_data['app_role']})")
            else:
                # Update existing user with missing fields if needed
                changed = False
                if not existing.password_hash:
                    existing.password_hash = get_password_hash(user_data["password"])
                    changed = True
                if not existing.app_role or existing.app_role == "user":
                    existing.app_role = user_data["app_role"]
                    changed = True
                if not existing.display_name:
                    existing.display_name = user_data["display_name"]
                    changed = True
                if changed:
                    logger.info(f"Updated existing user: {user_data['username']}")
        await session.commit()
    logger.info("Default user seeding complete.")
