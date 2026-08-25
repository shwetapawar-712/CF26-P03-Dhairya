"""SQLAlchemy async engine and session factory."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings
import os


# Ensure data directory exists for SQLite
db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")
db_dir = os.path.dirname(db_path)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


async def create_tables():
    """Create all database tables on startup and apply missing schema columns."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # --- Existing migrations (preserved) ---
        for tbl in ["audit_logs", "workflows"]:
            try:
                await conn.exec_driver_sql(f"ALTER TABLE {tbl} ADD COLUMN verification_id VARCHAR(100) DEFAULT ''")
            except Exception:
                pass  # Column already exists

        for col_def in [
            ("workflows", "category", "VARCHAR(100) DEFAULT 'General'"),
            ("workflows", "description", "TEXT DEFAULT ''"),
            ("compliance_rules", "rule_type", "VARCHAR(50) DEFAULT 'threshold'"),
            ("compliance_rules", "threshold", "FLOAT DEFAULT NULL"),
        ]:
            try:
                await conn.exec_driver_sql(f"ALTER TABLE {col_def[0]} ADD COLUMN {col_def[1]} {col_def[2]}")
            except Exception:
                pass  # Column already exists

        # --- New auth migrations ---
        for col_def in [
            ("users", "app_role", "VARCHAR(50) DEFAULT 'employee'"),
            ("users", "password_hash", "VARCHAR(255) DEFAULT ''"),
            ("workflows", "created_by", "INTEGER DEFAULT NULL"),
        ]:
            try:
                await conn.exec_driver_sql(f"ALTER TABLE {col_def[0]} ADD COLUMN {col_def[1]} {col_def[2]}")
            except Exception:
                pass  # Column already exists


async def get_session() -> AsyncSession:
    """Dependency that yields a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
