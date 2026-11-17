# Deployment Guide — somnostasis

> Operational Runbook for Production Deployment, Health Verification, and Rollbacks.
> Standardized across the project suite in conformance with deployment engineering patterns.

---

## 1. Architecture & Production Topology

**Application Type**: Physiological Sleep Stress MLOps & Monitoring Platform

### Declared Service Topology
- **`somnostasis_api`**: FastAPI MLOps inference engine + React SPA (Port: `8000`)
- **`somnostasis_dashboard`**: Streamlit research analytics dashboard (Port: `8501`)

All services are orchestrated via `docker-compose.yml` with isolated internal bridge networking, non-root system users (uid 1001), and layer-cached multi-stage container builds.

---

## 2. Environment Configuration

Supply environment variables via a secure `.env` file (or CI/CD secrets manager). Never commit plaintext credentials to Git.

### Key Environment Variables
- `PORT`
- `PYTHONUNBUFFERED`
- `DATABASE_URL`
- `STREAMLIT_SERVER_PORT`

---

## 3. Deployment Procedures

### Method A: Single-Host / VPS Deployment (Docker Compose)

1. **Clone repository on host**:
   ```bash
   git clone https://github.com/krishujeniya/somnostasis.git
   cd somnostasis
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env # edit with production secrets
   ```

3. **Start stack in detached mode**:
   ```bash
   docker compose up -d --build
   ```

4. **Verify container health and logs**:
   ```bash
   docker compose ps
   docker compose logs -f
   ```

### Method B: Pre-built Container Registry Deployment (GHCR)

Pre-built multi-stage production images are published automatically via GitHub Actions:
```bash
docker pull ghcr.io/krishujeniya/somnostasis:latest
docker run -d --restart unless-stopped -p 8000:8000 ghcr.io/krishujeniya/somnostasis:latest
```

---

## 4. Health Check & Readiness Probes

### Verification Command
Run the designated health check probe to confirm operational readiness:
```bash
curl -f http://localhost:8000/health
```

Expected HTTP Response: `200 OK`

---

## 5. Rollback Procedures

If an anomaly, regression, or service failure is detected:

### Step 1: Immediate Container Rollback
Roll back immediately to the previous immutable release tag or SHA:
```bash
# Pull previous known healthy SHA tag
docker pull ghcr.io/krishujeniya/somnostasis:sha-<previous-commit-sha>

# Or revert compose to previous git revision
git checkout <previous-stable-tag>
docker compose up -d
```

### Step 2: Verification
Re-run the health probe to confirm traffic restoration:
```bash
curl -f http://localhost:8000/health
```

---

## 6. Pre-Flight & Post-Flight Quality Gates

Follow the 4-phase verification protocol before declaring a release complete:

- [ ] **Code Quality**: Static inspection passed; zero lint or AST warnings.
- [ ] **Build Reproducibility**: Container builds cleanly via multi-stage isolation without dev dependencies.
- [ ] **Environment Validation**: All required environment variables present; secrets injected via secrets manager.
- [ ] **Safety & Probes**: Healthcheck endpoints respond with `200 OK`; rollback target verified.
