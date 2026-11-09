"""Model training orchestration across scikit-learn, XGBoost, and PyTorch architectures."""

import os
from pathlib import Path
import joblib
import numpy as np
import torch
from src.features.build_features import build_features
from src.ml_models import MODEL_REGISTRY, train_all_ml_models
from src.dl_model import StressMLP, train_mlp


def train_and_export_all(
    data_path: str = "data/raw/SaYoPillow.csv",
    output_dir: str = "models",
    test_size: float = 0.2,
    random_state: int = 42,
) -> dict:
    """Train all models on dataset and serialize artifacts to target directory."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    data = build_features(data_path, test_size=test_size, random_state=random_state)

    trained_models = train_all_ml_models(data["X_train"], data["y_train"])
    name_map = {
        "Random Forest": "random_forest.joblib",
        "XGBoost": "xgboost.joblib",
        "SVM (RBF)": "svm_rbf.joblib",
        "KNN": "knn.joblib",
    }

    saved_paths = {}
    for name, clf in trained_models.items():
        fname = name_map[name]
        p = os.path.join(output_dir, fname)
        joblib.dump(clf, p)
        saved_paths[fname] = p

    mlp = train_mlp(data["X_train"], data["y_train"], data["X_test"], data["y_test"])
    mlp_path = os.path.join(output_dir, "mlp.pt")
    torch.save(mlp.state_dict(), mlp_path)
    saved_paths["mlp.pt"] = mlp_path

    return saved_paths


if __name__ == "__main__":
    paths = train_and_export_all()
    print("Training finished. Artifacts saved:")
    for k, v in paths.items():
        print(f"  {k}: {v}")
