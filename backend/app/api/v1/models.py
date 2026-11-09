"""Model Registry lifecycle management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.api.deps import require_user
from backend.app.core.registry import DISPLAY_NAMES, model_registry
from backend.app.database import get_db
from backend.app.models.db_models import ModelRecord, User
from backend.app.models.schemas import ModelRecordOut, PromoteModelRequest

router = APIRouter(prefix="/models", tags=["Model Registry"])


@router.get("", response_model=list[ModelRecordOut])
def list_registered_models(db: Session = Depends(get_db)):
    """List all registered models, current stages, benchmark metrics, and champion status."""
    records = db.query(ModelRecord).all()
    if not records:
        # Seed initial models if not present
        return _seed_initial_models(db)

    return [
        {
            "id": r.id,
            "key": r.key,
            "name": r.name,
            "version": r.version,
            "framework": r.framework,
            "stage": r.stage,
            "is_champion": r.is_champion,
            "train_accuracy": r.train_accuracy,
            "test_accuracy": r.test_accuracy,
            "test_f1": r.test_f1,
            "test_precision": r.test_precision,
            "test_recall": r.test_recall,
            "fit_status": r.fit_status,
        }
        for r in records
    ]


@router.get("/{key}", response_model=ModelRecordOut)
def get_model_details(key: str, db: Session = Depends(get_db)):
    """Get performance metrics and metadata for a specific model key."""
    rec = db.query(ModelRecord).filter(ModelRecord.key == key).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Model '{key}' not found in registry")

    return {
        "id": rec.id,
        "key": rec.key,
        "name": rec.name,
        "version": rec.version,
        "framework": rec.framework,
        "stage": rec.stage,
        "is_champion": rec.is_champion,
        "train_accuracy": rec.train_accuracy,
        "test_accuracy": rec.test_accuracy,
        "test_f1": rec.test_f1,
        "test_precision": rec.test_precision,
        "test_recall": rec.test_recall,
        "fit_status": rec.fit_status,
    }


@router.post("/{key}/promote", response_model=ModelRecordOut)
def promote_model(
    key: str,
    payload: PromoteModelRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_user),
):
    """
    Promote a candidate model to Production champion or transition between lifecycle stages.
    Enforces single champion invariant.
    """
    rec = db.query(ModelRecord).filter(ModelRecord.key == key).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Model '{key}' not found")

    if payload.stage == "Production":
        # Demote current champion
        db.query(ModelRecord).filter(ModelRecord.is_champion == True).update(
            {"is_champion": False, "stage": "Staging"}
        )
        rec.stage = "Production"
        rec.is_champion = True
        model_registry.set_champion(key)
    else:
        rec.stage = payload.stage
        if rec.is_champion:
            rec.is_champion = False

    db.commit()
    db.refresh(rec)

    return {
        "id": rec.id,
        "key": rec.key,
        "name": rec.name,
        "version": rec.version,
        "framework": rec.framework,
        "stage": rec.stage,
        "is_champion": rec.is_champion,
        "train_accuracy": rec.train_accuracy,
        "test_accuracy": rec.test_accuracy,
        "test_f1": rec.test_f1,
        "test_precision": rec.test_precision,
        "test_recall": rec.test_recall,
        "fit_status": rec.fit_status,
    }


def _seed_initial_models(db: Session) -> list[dict]:
    initial_specs = [
        ("random_forest", "Random Forest (300 Trees)", "scikit-learn", "Production", True, 1.0, 0.9841, 0.9840, 0.9845, 0.9841, "Optimal", "models/random_forest.joblib"),
        ("xgboost", "XGBoost (300 Rounds)", "xgboost", "Staging", False, 1.0, 0.9762, 0.9760, 0.9770, 0.9762, "Optimal", "models/xgboost.joblib"),
        ("svm_rbf", "SVM (RBF Kernel)", "scikit-learn", "Staging", False, 0.9881, 0.9762, 0.9760, 0.9770, 0.9762, "Optimal", "models/svm_rbf.joblib"),
        ("knn", "K-Nearest Neighbors (k=3)", "scikit-learn", "Staging", False, 1.0, 0.9683, 0.9680, 0.9690, 0.9683, "Optimal", "models/knn.joblib"),
        ("mlp", "StressMLP (PyTorch 3-Layer)", "pytorch", "Staging", False, 0.9920, 0.9762, 0.9760, 0.9770, 0.9762, "Optimal", "models/mlp.pt"),
    ]

    records = []
    for key, name, framework, stage, is_champ, tr_acc, te_acc, f1, prec, rec, fit, path in initial_specs:
        existing = db.query(ModelRecord).filter(ModelRecord.key == key).first()
        if existing:
            records.append(existing)
            continue
        item = ModelRecord(
            key=key,
            name=name,
            version="1.0.0",
            framework=framework,
            stage=stage,
            is_champion=is_champ,
            train_accuracy=tr_acc,
            test_accuracy=te_acc,
            test_f1=f1,
            test_precision=prec,
            test_recall=rec,
            fit_status=fit,
            artifact_path=path,
        )
        db.add(item)
        records.append(item)

    db.commit()
    for r in records:
        db.refresh(r)

    return [
        {
            "id": r.id,
            "key": r.key,
            "name": r.name,
            "version": r.version,
            "framework": r.framework,
            "stage": r.stage,
            "is_champion": r.is_champion,
            "train_accuracy": r.train_accuracy,
            "test_accuracy": r.test_accuracy,
            "test_f1": r.test_f1,
            "test_precision": r.test_precision,
            "test_recall": r.test_recall,
            "fit_status": r.fit_status,
        }
        for r in records
    ]
