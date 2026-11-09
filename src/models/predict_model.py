"""Inference utilities for loading artifacts and scoring vectors."""

import os
from typing import Any
import joblib
import numpy as np
import torch
from src.dl_model import StressMLP, mlp_predict
from src.preprocess import LABEL_MAP


def load_model_artifact(artifact_path: str) -> Any:
    """Load serialized model artifact (.joblib or .pt)."""
    if artifact_path.endswith(".pt"):
        model = StressMLP()
        model.load_state_dict(torch.load(artifact_path, map_location="cpu"))
        model.eval()
        return model
    return joblib.load(artifact_path)


def predict_sample(model: Any, X_scaled: np.ndarray) -> tuple[int, str, float]:
    """Execute prediction returning predicted class index, label name, and confidence."""
    if isinstance(model, StressMLP):
        preds, probs = mlp_predict(model, X_scaled)
        pred_idx = int(preds[0])
        conf = float(probs[0][pred_idx])
    else:
        pred_idx = int(model.predict(X_scaled)[0])
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_scaled)[0]
            conf = float(probs[pred_idx])
        else:
            conf = 1.0

    return pred_idx, LABEL_MAP.get(pred_idx, f"Level {pred_idx}"), round(conf, 4)
