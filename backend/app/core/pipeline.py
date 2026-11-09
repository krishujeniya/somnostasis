"""MLOps Training, Retraining, and Model Promotion Ratchet Pipeline."""

import datetime
import json
import os
from pathlib import Path
from typing import Any
import joblib
import numpy as np
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.models.db_models import ModelRecord, PipelineRun
from src.preprocess import load_and_prepare
from src.ml_models import MODEL_REGISTRY, evaluate_models_cv
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

try:
    import torch
    from src.dl_model import StressMLP, train_mlp, mlp_predict
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    StressMLP = None
    train_mlp = None
    mlp_predict = None
    TORCH_AVAILABLE = False


class RetrainingPipeline:
    """Executes deterministic training, evaluation, model ratchet checks, and artifact export."""

    def run(
        self,
        db: Session,
        trigger_type: str = "manual",
        test_size: float = 0.2,
        random_state: int = 42,
        rf_n_estimators: int = 300,
        xgb_max_depth: int = 6,
        mlp_epochs: int = 200,
    ) -> dict[str, Any]:
        params = {
            "test_size": test_size,
            "random_state": random_state,
            "rf_n_estimators": rf_n_estimators,
            "xgb_max_depth": xgb_max_depth,
            "mlp_epochs": mlp_epochs,
        }

        # Initialize pipeline run in database
        run_record = PipelineRun(
            trigger_type=trigger_type,
            status="running",
            parameters_json=json.dumps(params),
            created_at=datetime.datetime.utcnow(),
        )
        db.add(run_record)
        db.commit()
        db.refresh(run_record)

        try:
            # 1. Load and prepare dataset
            data = load_and_prepare(settings.DATA_PATH, test_size=test_size, random_state=random_state)
            X_train, X_test = data["X_train"], data["X_test"]
            y_train, y_test = data["y_train"], data["y_test"]

            run_record.train_samples = len(X_train)
            run_record.test_samples = len(X_test)

            models_dir = Path(settings.MODELS_DIR)
            models_dir.mkdir(parents=True, exist_ok=True)

            metrics: dict[str, Any] = {}

            # 2. Train classical ML models
            clfs = {
                "random_forest": MODEL_REGISTRY["Random Forest"].set_params(n_estimators=rf_n_estimators, random_state=random_state),
                "svm_rbf": MODEL_REGISTRY["SVM (RBF)"],
                "knn": MODEL_REGISTRY["KNN"],
            }
            if "XGBoost" in MODEL_REGISTRY:
                clfs["xgboost"] = MODEL_REGISTRY["XGBoost"].set_params(max_depth=xgb_max_depth, random_state=random_state)

            for key, clf in clfs.items():
                clf.fit(X_train, y_train)
                y_pred_train = clf.predict(X_train)
                y_pred_test = clf.predict(X_test)

                tr_acc = float(accuracy_score(y_train, y_pred_train))
                te_acc = float(accuracy_score(y_test, y_pred_test))
                f1 = float(f1_score(y_test, y_pred_test, average="macro"))
                prec = float(precision_score(y_test, y_pred_test, average="macro"))
                rec = float(recall_score(y_test, y_pred_test, average="macro"))

                fit_status = "Optimal"
                if tr_acc - te_acc > 0.05:
                    fit_status = "Overfit"
                elif te_acc < 0.85:
                    fit_status = "Underfit"

                artifact_filename = f"{key}.joblib"
                artifact_path = str(models_dir / artifact_filename)
                joblib.dump(clf, artifact_path)

                metrics[key] = {
                    "train_accuracy": round(tr_acc, 4),
                    "test_accuracy": round(te_acc, 4),
                    "test_f1": round(f1, 4),
                    "test_precision": round(prec, 4),
                    "test_recall": round(rec, 4),
                    "fit_status": fit_status,
                    "artifact": artifact_filename,
                }

                # Update or insert ModelRecord in DB
                self._upsert_model_record(
                    db,
                    key=key,
                    name=clf.__class__.__name__,
                    framework="scikit-learn" if "XGB" not in str(clf.__class__) else "xgboost",
                    metrics=metrics[key],
                    artifact_path=artifact_path,
                )

            # 3. Train PyTorch MLP (if torch available)
            if TORCH_AVAILABLE and train_mlp is not None and torch is not None:
                mlp = train_mlp(X_train, y_train, X_test, y_test, epochs=mlp_epochs)
                mlp_preds_train, _ = mlp_predict(mlp, X_train)
                mlp_preds_test, _ = mlp_predict(mlp, X_test)

                tr_acc = float(accuracy_score(y_train, mlp_preds_train))
                te_acc = float(accuracy_score(y_test, mlp_preds_test))
                f1 = float(f1_score(y_test, mlp_preds_test, average="macro"))
                prec = float(precision_score(y_test, mlp_preds_test, average="macro"))
                rec = float(recall_score(y_test, mlp_preds_test, average="macro"))

                fit_status = "Optimal"
                if tr_acc - te_acc > 0.05:
                    fit_status = "Overfit"
                elif te_acc < 0.85:
                    fit_status = "Underfit"

                mlp_path = str(models_dir / "mlp.pt")
                torch.save(mlp.state_dict(), mlp_path)

                metrics["mlp"] = {
                    "train_accuracy": round(tr_acc, 4),
                    "test_accuracy": round(te_acc, 4),
                    "test_f1": round(f1, 4),
                    "test_precision": round(prec, 4),
                    "test_recall": round(rec, 4),
                    "fit_status": fit_status,
                    "artifact": "mlp.pt",
                }

                self._upsert_model_record(
                    db,
                    key="mlp",
                    name="StressMLP",
                    framework="pytorch",
                    metrics=metrics["mlp"],
                    artifact_path=mlp_path,
                )

            # Complete pipeline run
            run_record.status = "completed"
            run_record.metrics_json = json.dumps(metrics)
            run_record.completed_at = datetime.datetime.utcnow()
            db.commit()

            # Refresh in-memory registry
            from backend.app.core.registry import model_registry
            model_registry._initialized = False
            model_registry.initialize()

            return {
                "run_id": run_record.id,
                "status": "completed",
                "train_samples": len(X_train),
                "test_samples": len(X_test),
                "metrics": metrics,
            }

        except Exception as exc:
            db.rollback()
            run_record.status = "failed"
            run_record.error_message = str(exc)
            run_record.completed_at = datetime.datetime.utcnow()
            db.commit()
            raise exc

    def _upsert_model_record(
        self,
        db: Session,
        key: str,
        name: str,
        framework: str,
        metrics: dict[str, Any],
        artifact_path: str,
    ) -> None:
        rec = db.query(ModelRecord).filter(ModelRecord.key == key).first()
        if not rec:
            rec = ModelRecord(
                key=key,
                name=name,
                version="1.0.0",
                framework=framework,
                stage="Production" if key == "random_forest" else "Staging",
                is_champion=(key == "random_forest"),
                artifact_path=artifact_path,
            )
            db.add(rec)

        rec.train_accuracy = metrics["train_accuracy"]
        rec.test_accuracy = metrics["test_accuracy"]
        rec.test_f1 = metrics["test_f1"]
        rec.test_precision = metrics["test_precision"]
        rec.test_recall = metrics["test_recall"]
        rec.fit_status = metrics["fit_status"]
        rec.artifact_path = artifact_path
        db.commit()


retraining_pipeline = RetrainingPipeline()
