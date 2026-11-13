
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.database.connection import engine
from app.core.config import settings

router = APIRouter(tags=["System Health"])


@router.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "application": settings.APP_NAME,
            "backend": "running",
            "database": "connected",
            "database_type": "PostgreSQL"
        }

    except Exception:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "application": settings.APP_NAME,
                "backend": "running",
                "database": "disconnected"
            }
        )
