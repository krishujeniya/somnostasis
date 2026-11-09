# AI Engineering Handoff

## Project: Somnostasis
- **Repository**: `https://github.com/krishujeniya/somnostasis`
- **Branch**: `main` (commit `74a9e8c`)
- **Backend (Vercel Serverless)**: `https://somnostasis.vercel.app`
- **Frontend (GitHub Pages SPA)**: `https://krishujeniya.github.io/somnostasis/`
- **API Documentation**: `https://somnostasis.vercel.app/docs`

## Status & Verified Gates
1. **Legacy Decommissioning**:
   - `stress-level-prediction` Vercel project permanently removed via Vercel CLI.
   - All references to old project names purged across code, manifests, and documentation.
2. **Vercel Serverless Hardening**:
   - Function allocated `memory: 1024` and `maxDuration: 60`.
   - Security headers enforced at the Vercel edge: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, and `Permissions-Policy`.
   - Production champion: `random_forest` (accuracy 0.9841, F1 0.984).
3. **Automated Verification**:
   - End-to-End Audit Suite: 22/22 checks passed against `https://somnostasis.vercel.app`.
   - Local Pytest: 18/18 unit and integration tests passing.
   - GitHub Actions CI (`ci.yml`): Passed in 1m1s (Run 42557366531).
   - GitHub Pages Deploy (`deploy-pages.yml`): Passed in 28s (Run 42557366551).
