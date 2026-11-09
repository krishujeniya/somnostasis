"""Model Registry and inference serving engine."""

import os
import time
from pathlib import Path
from typing import Any, Optional
import joblib
import numpy as np

try:
    import torch
    from src.dl_model import StressMLP, mlp_predict
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    StressMLP = None
    mlp_predict = None

from backend.app.config import settings
from src.preprocess import FEATURE_COLS, LABEL_MAP, load_and_prepare

MODEL_FILENAME_MAP = {
    "random_forest": "random_forest.joblib",
    "xgboost": "xgboost.joblib",
    "svm_rbf": "svm_rbf.joblib",
    "knn": "knn.joblib",
    "mlp": "mlp.pt",
}

DISPLAY_NAMES = {
    "random_forest": "Random Forest",
    "xgboost": "XGBoost",
    "svm_rbf": "SVM (RBF)",
    "knn": "K-Nearest Neighbors",
    "mlp": "MLP (PyTorch)",
}


class ModelRegistryService:
    """Manages loaded models, scaler, preprocessing, and active champion."""

    def __init__(self):
        self._models: dict[str, Any] = {}
        self._scaler = None
        self._baseline_data = None
        self._champion_key = settings.CHAMPION_MODEL_KEY
        self._initialized = False

    def initialize(self) -> None:
        """Load scaler, baseline training dataset, and models into memory."""
        if self._initialized:
            return

        # Load preparation pipeline and scaler
        data = load_and_prepare(settings.DATA_PATH)
        self._scaler = data["scaler"]
        self._baseline_data = data

        models_dir = Path(settings.MODELS_DIR)
        models_dir.mkdir(parents=True, exist_ok=True)

        # Load classical models
        for key, filename in MODEL_FILENAME_MAP.items():
            path = models_dir / filename
            if not path.exists():
                continue

            try:
                if key == "mlp":
                    if TORCH_AVAILABLE and StressMLP is not None:
                        mlp = StressMLP()
                        state = torch.load(str(path), map_location="cpu")
                        mlp.load_state_dict(state)
                        mlp.eval()
                        self._models[key] = mlp
                else:
                    self._models[key] = joblib.load(str(path))
            except Exception as e:
                print(f"Warning: Failed to load model {key} from {path}: {e}")

        # If champion not set or not in loaded models, default to first available
        if self._champion_key not in self._models and self._models:
            self._champion_key = list(self._models.keys())[0]

        self._initialized = True

    @property
    def champion_key(self) -> str:
        return self._champion_key

    def set_champion(self, key: str) -> None:
        if key not in self._models:
            raise ValueError(f"Model '{key}' is not loaded in registry.")
        self._champion_key = key

    def get_model(self, key: Optional[str] = None) -> tuple[str, Any]:
        self.initialize()
        target_key = key or self._champion_key
        if target_key not in self._models:
            # Fallback to champion or first available
            target_key = self._champion_key if self._champion_key in self._models else list(self._models.keys())[0]
        return target_key, self._models[target_key]

    def get_scaler(self):
        self.initialize()
        return self._scaler

    def get_baseline_data(self):
        self.initialize()
        return self._baseline_data

    def list_available_keys(self) -> list[str]:
        self.initialize()
        return list(self._models.keys())

    def transform_features(self, raw_features: dict[str, float] | list[float] | np.ndarray) -> np.ndarray:
        """Transform raw physiological inputs using the fitted StandardScaler."""
        self.initialize()
        if isinstance(raw_features, dict):
            vec = np.array([[raw_features[c] for c in FEATURE_COLS]], dtype=np.float32)
        elif isinstance(raw_features, list):
            vec = np.array(raw_features, dtype=np.float32)
            if vec.ndim == 1:
                vec = vec.reshape(1, -1)
        else:
            vec = raw_features
            if vec.ndim == 1:
                vec = vec.reshape(1, -1)

        return self._scaler.transform(vec)

    def predict_single(
        self,
        features: dict[str, float],
        model_key: Optional[str] = None,
    ) -> dict[str, Any]:
        """Execute single-sample inference with latency tracking and confidence scoring."""
        start_time = time.perf_counter()
        active_key, model = self.get_model(model_key)
        X_scaled = self.transform_features(features)

        if active_key == "mlp":
            preds, probs = mlp_predict(model, X_scaled)
            pred_class = int(preds[0])
            prob_dist = probs[0]
        else:
            pred_class = int(model.predict(X_scaled)[0])
            if hasattr(model, "predict_proba"):
                prob_dist = model.predict_proba(X_scaled)[0]
            else:
                prob_dist = np.zeros(5)
                prob_dist[pred_class] = 1.0

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        confidence = float(prob_dist[pred_class])

        probabilities = {
            f"Class {i} ({LABEL_MAP[i]})": round(float(p), 4)
            for i, p in enumerate(prob_dist)
        }

        return {
            "predicted_class": pred_class,
            "class_name": LABEL_MAP.get(pred_class, f"Level {pred_class}"),
            "confidence": round(confidence, 4),
            "probabilities": probabilities,
            "model_key": active_key,
            "model_version": "1.0.0",
            "latency_ms": round(elapsed_ms, 2),
        }

    def predict_batch(
        self,
        samples: list[dict[str, float]],
        model_key: Optional[str] = None,
    ) -> dict[str, Any]:
        """Execute high-throughput batch inference."""
        start_time = time.perf_counter()
        active_key, model = self.get_model(model_key)

        raw_matrix = np.array(
            [[s[c] for c in FEATURE_COLS] for s in samples],
            dtype=np.float32,
        )
        X_scaled = self._scaler.transform(raw_matrix)

        if active_key == "mlp":
            preds, probs = mlp_predict(model, X_scaled)
        else:
            preds = model.predict(X_scaled)
            if hasattr(model, "predict_proba"):
                probs = model.predict_proba(X_scaled)
            else:
                probs = np.zeros((len(preds), 5))
                for i, p in enumerate(preds):
                    probs[i, int(p)] = 1.0

        total_latency_ms = (time.perf_counter() - start_time) * 1000.0
        per_sample_latency = round(total_latency_ms / max(1, len(samples)), 2)

        predictions = []
        class_distribution: dict[str, int] = {LABEL_MAP[i]: 0 for i in range(5)}
        confidences = []

        for i, (pred, prob_dist) in enumerate(zip(preds, probs)):
            pred_class = int(pred)
            c_name = LABEL_MAP.get(pred_class, f"Level {pred_class}")
            class_distribution[c_name] += 1
            conf = float(prob_dist[pred_class])
            confidences.append(conf)

            prob_map = {
                f"Class {c} ({LABEL_MAP[c]})": round(float(p), 4)
                for c, p in enumerate(prob_dist)
            }

            predictions.append({
                "predicted_class": pred_class,
                "class_name": c_name,
                "confidence": round(conf, 4),
                "probabilities": prob_map,
                "model_key": active_key,
                "model_version": "1.0.0",
                "latency_ms": per_sample_latency,
            })

        mean_confidence = float(np.mean(confidences)) if confidences else 0.0

        return {
            "total_samples": len(samples),
            "predictions": predictions,
            "class_distribution": class_distribution,
            "mean_confidence": round(mean_confidence, 4),
            "total_latency_ms": round(total_latency_ms, 2),
        }


# Global registry singleton
model_registry = ModelRegistryService()
