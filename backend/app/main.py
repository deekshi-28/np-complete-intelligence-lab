
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes.health import router as health_router
from app.api.routes.problems import router as problems_router
from app.api.routes.algorithms import router as algorithms_router
from app.api.routes.benchmarks import router as benchmarks_router


app = FastAPI(
    title=settings.APP_NAME + " API",
    description=(
        "Backend API for algorithm visualization, "
        "backtracking and computational complexity analysis."
    ),
    version=settings.APP_VERSION
)


# Frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
def root():
    return {
        "message": settings.APP_NAME + " API",
        "status": "running",
        "version": settings.APP_VERSION
    }


# Register API routes
app.include_router(
    health_router,
    prefix="/api"
)

app.include_router(
    problems_router,
    prefix="/api"
)

app.include_router(
    algorithms_router,
    prefix="/api"
)

app.include_router(
    benchmarks_router,
    prefix="/api"
)