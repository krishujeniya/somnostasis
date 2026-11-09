"""FastAPI application entrypoint for Somnostasis MLOps Platform."""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.app.api.v1 import auth, explain, feedback, models, monitoring, pipelines, predict
from backend.app.config import settings
from backend.app.core.drift import drift_detector
from backend.app.core.registry import model_registry
from backend.app.core.security import get_password_hash
from backend.app.database import Base, SessionLocal, engine
from backend.app.models.db_models import User
from backend.app.api.v1.models import _seed_initial_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure database schema created
    Base.metadata.create_all(bind=engine)

    # 2. Seed default tenant admin if none exists
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@somnostasis.ai").first()
        if not admin:
            admin = User(
                email="admin@somnostasis.ai",
                hashed_password=get_password_hash("mlops2026!"),
                full_name="Lead MLOps Engineer",
                role="admin",
            )
            db.add(admin)
            db.commit()

        # 3. Seed registered model records
        _seed_initial_models(db)
    finally:
        db.close()

    # 4. Initialize in-memory model registry and drift detector baseline
    model_registry.initialize()
    baseline = model_registry.get_baseline_data()
    if baseline:
        drift_detector.fit_baseline(baseline["df"])

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Enterprise MLOps platform for sleep biosignal stress prediction, drift monitoring, and model governance.",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API V1 routers
api_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_prefix)
app.include_router(predict.router, prefix=api_prefix)
app.include_router(explain.router, prefix=api_prefix)
app.include_router(models.router, prefix=api_prefix)
app.include_router(monitoring.router, prefix=api_prefix)
app.include_router(pipelines.router, prefix=api_prefix)
app.include_router(feedback.router, prefix=api_prefix)


@app.get("/health", tags=["Health & Readiness"])
def health_check():
    """Liveness probe."""
    return {"status": "healthy", "service": settings.PROJECT_NAME, "version": "1.0.0"}


@app.get("/ready", tags=["Health & Readiness"])
def readiness_check():
    """Readiness probe checking model registry and baseline readiness."""
    is_ready = model_registry._initialized and len(model_registry.list_available_keys()) > 0
    return {
        "status": "ready" if is_ready else "initializing",
        "models_loaded": model_registry.list_available_keys(),
        "champion": model_registry.champion_key,
    }


# Mount frontend build if it exists
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
