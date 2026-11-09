"""SHAP-based feature attribution explainability service."""

from typing import Any, Optional
import numpy as np
import shap
from backend.app.core.registry import model_registry
from src.preprocess import FEATURE_COLS, FEATURE_DESC, FEATURE_DISPLAY, LABEL_MAP


class ExplainabilityEngine:
    """Computes real-time SHAP feature attribution for model transparency."""

    def __init__(self):
        self._explainers: dict[str, Any] = {}
        self._bg_data: np.ndarray | None = None

    def _get_background(self) -> np.ndarray:
        if self._bg_data is None:
            data = model_registry.get_baseline_data()
            rng = np.random.default_rng(42)
            idx = rng.choice(len(data["X_train"]), size=min(40, len(data["X_train"])), replace=False)
            self._bg_data = data["X_train"][idx]
        return self._bg_data

    def explain(
        self,
        features: dict[str, float],
        model_key: Optional[str] = None,
    ) -> dict[str, Any]:
        """Compute local SHAP attribution scores for a single prediction."""
        active_key, model = model_registry.get_model(model_key)
        X_scaled = model_registry.transform_features(features)
        pred_res = model_registry.predict_single(features, model_key=active_key)
        pred_class = pred_res["predicted_class"]

        # TreeExplainer is lightning fast for Random Forest & XGBoost
        if active_key in ("random_forest", "xgboost"):
            if active_key not in self._explainers:
                self._explainers[active_key] = shap.TreeExplainer(model)
            explainer = self._explainers[active_key]
            shap_values = explainer.shap_values(X_scaled)

            # Format differs between binary/multi-class & XGBoost/scikit-learn
            if isinstance(shap_values, list):
                # list of arrays per class: shap_values[class_idx]
                class_shap = shap_values[pred_class][0]
            elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
                # shape: (n_samples, n_features, n_classes)
                class_shap = shap_values[0, :, pred_class]
            elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 2:
                class_shap = shap_values[0]
            else:
                class_shap = np.array(shap_values).flatten()[:len(FEATURE_COLS)]

            expected_value = explainer.expected_value
            if isinstance(expected_value, (list, np.ndarray)):
                base_val = float(expected_value[pred_class])
            else:
                base_val = float(expected_value)

        else:
            # Model agnostic approximation
            bg = self._get_background()
            if active_key not in self._explainers:
                predict_fn = getattr(model, "predict_proba", None)
                if predict_fn is None:
                    # Fallback for MLP or models without predict_proba
                    predict_fn = lambda x: np.eye(5)[model.predict(x).astype(int)]
                self._explainers[active_key] = shap.KernelExplainer(predict_fn, bg)

            explainer = self._explainers[active_key]
            sv = explainer.shap_values(X_scaled, nsamples=40, silent=True)
            if isinstance(sv, list):
                class_shap = sv[pred_class][0]
            elif isinstance(sv, np.ndarray) and sv.ndim == 3:
                class_shap = sv[0, :, pred_class]
            else:
                class_shap = np.array(sv).flatten()[:len(FEATURE_COLS)]

            base_val = float(explainer.expected_value[pred_class]) if hasattr(explainer, "expected_value") else 0.2

        contributions = []
        for i, col in enumerate(FEATURE_COLS):
            val = float(features[col])
            s_val = float(class_shap[i]) if i < len(class_shap) else 0.0
            contributions.append({
                "feature": col,
                "display_name": FEATURE_DISPLAY.get(col, col),
                "value": round(val, 2),
                "shap_value": round(s_val, 4),
                "description": FEATURE_DESC.get(col, ""),
            })

        # Sort by absolute SHAP attribution
        contributions.sort(key=lambda item: abs(item["shap_value"]), reverse=True)

        return {
            "predicted_class": pred_class,
            "class_name": LABEL_MAP.get(pred_class, f"Level {pred_class}"),
            "model_key": active_key,
            "base_value": round(base_val, 4),
            "contributions": contributions,
        }


# Global explainability engine singleton
explainability_engine = ExplainabilityEngine()
