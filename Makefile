.PHONY: help setup test train api frontend build clean

PYTHON := .venv/bin/python
UVICORN := .venv/bin/uvicorn
PYTEST := .venv/bin/pytest

help:
	@echo "Somnostasis MLOps Platform — Automation Tasks"
	@echo "  make setup     - Install Python dependencies and build frontend packages"
	@echo "  make test      - Run automated pytest suite with coverage analysis"
	@echo "  make train     - Retrain all machine learning and deep learning models"
	@echo "  make api       - Start FastAPI production backend on port 8000"
	@echo "  make frontend  - Launch Vite frontend development server on port 3000"
	@echo "  make build     - Compile React frontend bundle for static production serving"
	@echo "  make clean     - Remove caches, temporary run artifacts, and test logs"

setup:
	uv pip install -r requirements.txt fastapi "uvicorn[standard]" pydantic pydantic-settings sqlalchemy python-multipart "python-jose[cryptography]" bcrypt scipy pytest httpx pytest-asyncio pytest-cov
	cd frontend && npm install

test:
	PYTHONPATH=. $(PYTEST) tests/ -v --cov=backend/app --cov-report=term-missing

train:
	$(PYTHON) -m src.models.train_model

api:
	$(UVICORN) backend.app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev

build:
	cd frontend && npm run build

clean:
	rm -rf .pytest_cache .coverage __pycache__ src/**/__pycache__ backend/**/__pycache__
