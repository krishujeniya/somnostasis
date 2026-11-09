"""Biosignal inference endpoints for online real-time and batch scoring."""

import io
import json
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.api.deps import authenticate_api_or_token
from backend.app.core.registry import model_registry
from backend.app.database import get_db
from backend.app.models.db_models import PredictionLog, User
from backend.app.models.schemas import BatchPredictRequest, BatchPredictResponse, PredictionResponse, SinglePredictRequest
from src.preprocess import FEATURE_COLS, _normalise_columns

router = APIRouter(prefix="/predict", tags=["Inference Serving"])


@router.post("", response_model=PredictionResponse)
def predict_single_sample(
    payload: SinglePredictRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(authenticate_api_or_token),
):
    """
    Execute real-time stress classification on physiological sleep biosignals.
    Logs inference telemetry, latency, and inputs for drift monitoring.
    """
    feature_dict = payload.features.dict()
    res = model_registry.predict_single(feature_dict, model_key=payload.model_key)

    client_ip = request.client.host if request.client else "127.0.0.1"

    # Persist prediction log for observability and drift tracking
    log_entry = PredictionLog(
        model_key=res["model_key"],
        model_version=res["model_version"],
        inputs_json=json.dumps(feature_dict),
        predicted_class=res["predicted_class"],
        class_name=res["class_name"],
        confidence=res["confidence"],
        probabilities_json=json.dumps(res["probabilities"]),
        latency_ms=res["latency_ms"],
        ip_address=client_ip,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    res["prediction_id"] = log_entry.id
    return res


@router.post("/batch", response_model=BatchPredictResponse)
def predict_batch_samples(
    payload: BatchPredictRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(authenticate_api_or_token),
):
    """
    Execute high-throughput batch inference across multiple patient records.
    """
    if not payload.samples:
        raise HTTPException(status_code=400, detail="Samples list cannot be empty")

    samples_dicts = [s.dict() for s in payload.samples]
    res = model_registry.predict_batch(samples_dicts, model_key=payload.model_key)
    return res


@router.post("/csv", response_model=BatchPredictResponse)
async def predict_from_csv(
    file: UploadFile = File(...),
    model_key: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(authenticate_api_or_token),
):
    """
    Upload a CSV file containing physiological biosignals for automated batch inference.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a .csv file")

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
        df = _normalise_columns(df)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(exc)}")

    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"CSV missing required biosignal columns: {missing}. Present: {list(df.columns)}",
        )

    samples = df[FEATURE_COLS].to_dict(orient="records")
    res = model_registry.predict_batch(samples, model_key=model_key)
    return res
