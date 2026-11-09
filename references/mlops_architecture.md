# StressGuard MLOps Architecture

```
                  ┌───────────────────────────────────────────┐
                  │          Client Applications              │
                  │   (Web Dashboard, Wearables, Edge SDK)    │
                  └─────────────────────┬─────────────────────┘
                                        │ HTTPS / JSON / CSV
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │           FastAPI Gateway API             │
                  │    - Rate Limiting & Auth (JWT/API Keys)  │
                  │    - Input Validation (Pydantic schemas)  │
                  └─────┬──────────────────┬────────────────┬─┘
                        │                  │                │
                        ▼                  ▼                ▼
     ┌───────────────────────┐  ┌─────────────────┐  ┌──────────────────┐
     │   Inference Engine    │  │ Explainability  │  │   Observability  │
     │  - Scaler Transform   │  │  - TreeExplainer│  │  - Latency p95   │
     │  - Active Champion    │  │  - SHAP Waterfall│ │  - Volume Trends │
     │  - Multi-class Probs  │  │  - Feature Rank │  │  - Audit Logs    │
     └──────────┬────────────┘  └─────────────────┘  └────────┬─────────┘
                │                                             │
                ▼                                             ▼
     ┌───────────────────────┐                       ┌──────────────────┐
     │ Continuous Drift Mon. │                       │   Database Store │
     │  - Kolmogorov-Smirnov │                       │  - SQLite / PG   │
     │  - Population Stab.   │                       │  - Users / Keys  │
     │  - Covariate Alert    │                       │  - PredictionLog │
     └──────────┬────────────┘                       │  - PipelineRuns  │
                │                                    └──────────────────┘
                ▼
     ┌───────────────────────┐
     │ Automated Retraining  │
     │  - Cross-Validation   │
     │  - Test Ratchet Gate  │
     │  - Champion Promotion │
     └───────────────────────┘
```
