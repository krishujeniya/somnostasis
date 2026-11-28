# syntax=docker/dockerfile:1.4
# Stage 1: Build React/Vite Frontend
FROM node:26-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Install Python dependencies
FROM python:3.12-slim AS python-builder
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.6.5 /uv /bin/uv

COPY requirements.txt ./
RUN uv pip install --system --prefix=/install -r requirements.txt streamlit

# Stage 3: Minimal Hardened Runtime
FROM python:3.12-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    STREAMLIT_SERVER_PORT=8501 \
    STREAMLIT_SERVER_ADDRESS=0.0.0.0 \
    STREAMLIT_SERVER_HEADLESS=true

RUN groupadd -r somnostasis -g 1001 && \
    useradd -r -u 1001 -g somnostasis -m -s /bin/bash somnostasis

COPY --from=python-builder /install /usr/local
COPY --from=frontend-builder --chown=somnostasis:somnostasis /app/frontend/dist ./frontend/dist

COPY --chown=somnostasis:somnostasis src/ ./src/
COPY --chown=somnostasis:somnostasis backend/ ./backend/
COPY --chown=somnostasis:somnostasis configs/ ./configs/
COPY --chown=somnostasis:somnostasis app.py ./app.py
COPY --chown=somnostasis:somnostasis pyproject.toml ./pyproject.toml

RUN mkdir -p /app/models /app/reports /app/data && \
    chown -R somnostasis:somnostasis /app/models /app/reports /app/data

USER somnostasis

EXPOSE 8000 8501

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
