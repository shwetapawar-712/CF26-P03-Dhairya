"""FastAPI application entrypoint for NLC Backend."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.api.routes import router as api_router
from app.api.auth_routes import router as auth_router
from app.api.approval_routes import router as approval_router
from app.auth import seed_default_users

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nlc_backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    logger.info("Initializing NLC Backend...")
    # Create database tables
    try:
        await create_tables()
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # Seed default Employee and Manager accounts
    try:
        await seed_default_users()
    except Exception as e:
        logger.error(f"Error seeding default users: {e}")

    yield
    logger.info("Shutting down NLC Backend...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Natural Language Policy to Safe Executable Workflow Compiler API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(approval_router, prefix="/api", tags=["Approval"])


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "status": "online",
        "docs": "/docs",
        "api_prefix": "/api"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
