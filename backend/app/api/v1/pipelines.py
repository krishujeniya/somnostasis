"""Retraining pipeline execution and experiment tracking endpoints."""

import json
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.api.deps import require_user
from backend.app.core.pipeline import retraining_pipeline
from backend.app.database import get_db
from backend.app.models.db_models import PipelineRun, User
from backend.app.models.schemas import PipelineRunOut, RetrainRequest

router = APIRouter(prefix="/pipelines", tags=["MLOps Retraining Pipelines"])


@router.post("/retrain")
def trigger_retraining(
    payload: RetrainRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(require_user),
):
    """
    Trigger end-to-end retraining across all registered models with specified hyperparameters.
    Executes cross-validation, verifies the quality ratchet, and saves serialized artifacts.
    """
    res = retraining_pipeline.run(
        db=db,
        trigger_type="manual",
        test_size=payload.test_size,
        random_state=payload.random_state,
        rf_n_estimators=payload.rf_n_estimators,
        xgb_max_depth=payload.xgb_max_depth,
        mlp_epochs=payload.mlp_epochs,
    )
    return res


@router.get("/runs", response_model=list[PipelineRunOut])
def list_pipeline_runs(db: Session = Depends(get_db)):
    """List recent automated training pipeline runs and experiment outcomes."""
    runs = db.query(PipelineRun).order_by(PipelineRun.created_at.desc()).limit(20).all()
    results = []
    for r in runs:
        try:
            params = json.loads(r.parameters_json)
        except Exception:
            params = {}
        try:
            metrics = json.loads(r.metrics_json)
        except Exception:
            metrics = {}

        results.append({
            "id": r.id,
            "trigger_type": r.trigger_type,
            "status": r.status,
            "parameters": params,
            "train_samples": r.train_samples,
            "test_samples": r.test_samples,
            "metrics": metrics,
            "error_message": r.error_message,
            "created_at": r.created_at.isoformat(),
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        })
    return results


@router.get("/runs/{run_id}", response_model=PipelineRunOut)
def get_pipeline_run(run_id: int, db: Session = Depends(get_db)):
    """Get metrics and execution log for a specific pipeline run."""
    r = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Pipeline run {run_id} not found")

    try:
        params = json.loads(r.parameters_json)
    except Exception:
        params = {}
    try:
        metrics = json.loads(r.metrics_json)
    except Exception:
        metrics = {}

    return {
        "id": r.id,
        "trigger_type": r.trigger_type,
        "status": r.status,
        "parameters": params,
        "train_samples": r.train_samples,
        "test_samples": r.test_samples,
        "metrics": metrics,
        "error_message": r.error_message,
        "created_at": r.created_at.isoformat(),
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
    }
