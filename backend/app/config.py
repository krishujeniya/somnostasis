"""Application configuration and environment settings."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "Somnostasis MLOps SaaS"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "mlops-super-secret-production-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:////tmp/stress_mlops.db" if os.getenv("VERCEL") else f"sqlite:///{BASE_DIR}/stress_mlops.db",
    )
    DATA_PATH: str = os.getenv("DATA_PATH", str(BASE_DIR / "data" / "SaYoPillow.csv"))
    MODELS_DIR: str = os.getenv("MODELS_DIR", str(BASE_DIR / "models"))
    CHAMPION_MODEL_KEY: str = "random_forest"

    DRIFT_KS_ALPHA: float = 0.05
    DRIFT_PSI_THRESHOLD: float = 0.25

    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        case_sensitive = True


settings = Settings()
