"""Test fixtures and database configuration for pytest."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.config import settings
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.core.registry import model_registry
from backend.app.core.drift import drift_detector

# In-memory SQLite database for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import backend.app.database as db_mod
import backend.app.main as main_mod

db_mod.engine = engine
db_mod.SessionLocal = TestingSessionLocal
main_mod.engine = engine
main_mod.SessionLocal = TestingSessionLocal


@pytest.fixture(scope="session", autouse=True)
def setup_models():
    """Ensure in-memory models and drift baseline are loaded once for test session."""
    model_registry.initialize()
    base_data = model_registry.get_baseline_data()
    if base_data:
        drift_detector.fit_baseline(base_data["df"])


@pytest.fixture(scope="function")
def db_session():
    """Create fresh tables for every test function."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_biosignals():
    """Standard representative biosignal payload."""
    return {
        "sr": 65.0,
        "rr": 20.0,
        "t": 98.0,
        "lm": 8.0,
        "bo": 96.0,
        "rem": 80.0,
        "sh": 7.0,
        "hr": 70.0,
    }


@pytest.fixture
def auth_headers(client):
    """Register and authenticate a test user, returning Bearer auth headers."""
    register_payload = {
        "email": "tester@example.com",
        "password": "SecurePassword123!",
        "full_name": "Test Engineer",
    }
    resp = client.post("/api/v1/auth/register", json=register_payload)
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
