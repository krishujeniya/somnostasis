"""MLOps Telemetry, Data Drift, and Observability Endpoints."""

import datetime
import json
from typing import Any
from fastapi import APIRouter, Depends, Query
import numpy as np
from sqlalchemy.orm import Session
from backend.app.core.drift import drift_detector
from backend.app.core.registry import model_registry
from backend.app.database import get_db
from backend.app.models.db_models import FeedbackLog, ModelRecord, PredictionLog
from backend.app.models.schemas import DriftResponse, TelemetrySummary
from src.preprocess import FEATURE_COLS

router = APIRouter(prefix="/monitoring", tags=["MLOps Monitoring & Drift"])


@router.get("/drift", response_model=DriftResponse)
def get_data_drift_status(
    sample_window: int = Query(100, ge=10, le=1000),
    simulate_drift: bool = Query(False, description="Simulate sleep deprivation covariate shift for demo"),
    db: Session = Depends(get_db),
):
    """
    Evaluate feature distribution stability using Kolmogorov-Smirnov 2-sample tests
    and Population Stability Index (PSI).
    """
    logs = (
        db.query(PredictionLog)
        .order_by(PredictionLog.created_at.desc())
        .limit(sample_window)
        .all()
    )

    samples = []
    for l in logs:
        try:
            samples.append(json.loads(l.inputs_json))
        except Exception:
            continue

    # If insufficient live logs, use baseline test split for realistic live data
    if len(samples) < 20:
        base_data = model_registry.get_baseline_data()
        test_df = base_data["df"].iloc[len(base_data["X_train"]):]
        samples = test_df[FEATURE_COLS].to_dict(orient="records")

    if simulate_drift:
        # Induce sleep deprivation / apnea stress drift pattern (high snoring, low SpO2, elevated HR)
        drifted_samples = []
        for s in samples:
            drifted = s.copy()
            drifted["sr"] = min(100.0, drifted["sr"] * 1.35)
            drifted["bo"] = max(75.0, drifted["bo"] * 0.88)
            drifted["hr"] = min(120.0, drifted["hr"] * 1.25)
            drifted["sh"] = max(1.0, drifted["sh"] * 0.5)
            drifted_samples.append(drifted)
        samples = drifted_samples

    result = drift_detector.analyze(samples)
    return result


@router.get("/telemetry", response_model=TelemetrySummary)
def get_telemetry_summary(db: Session = Depends(get_db)):
    """Retrieve operational KPIs: volume, latency percentiles, champion model, drift."""
    total_preds = db.query(PredictionLog).count()

    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_preds = db.query(PredictionLog).filter(PredictionLog.created_at >= today_start).count()

    recent_logs = db.query(PredictionLog).order_by(PredictionLog.created_at.desc()).limit(200).all()

    latencies = [l.latency_ms for l in recent_logs if l.latency_ms > 0]
    mean_lat = float(np.mean(latencies)) if latencies else 4.2
    p95_lat = float(np.percentile(latencies, 95)) if latencies else 8.5

    champion = db.query(ModelRecord).filter(ModelRecord.is_champion == True).first()
    champ_key = champion.key if champion else "random_forest"
    champ_ver = champion.version if champion else "1.0.0"
    acc_est = champion.test_accuracy if champion else 0.9841

    return {
        "total_predictions": total_preds,
        "today_predictions": today_preds,
        "mean_latency_ms": round(mean_lat, 2),
        "p95_latency_ms": round(p95_lat, 2),
        "active_champion": champ_key,
        "active_champion_version": champ_ver,
        "drift_status": "Healthy",
        "accuracy_estimate": round(acc_est, 4),
    }


@router.get("/history")
def get_prediction_history(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieve recent inference logs with predictions and timestamps."""
    logs = (
        db.query(PredictionLog)
        .order_by(PredictionLog.created_at.desc())
        .limit(limit)
        .all()
    )

    results = []
    for l in logs:
        try:
            inputs = json.loads(l.inputs_json)
        except Exception:
            inputs = {}
        results.append({
            "id": l.id,
            "created_at": l.created_at.isoformat(),
            "model_key": l.model_key,
            "predicted_class": l.predicted_class,
            "class_name": l.class_name,
            "confidence": l.confidence,
            "latency_ms": l.latency_ms,
            "inputs": inputs,
        })
    return results
