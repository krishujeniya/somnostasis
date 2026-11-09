"""Feature engineering and standard scaling pipeline."""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from src.data.make_dataset import FEATURE_COLS, TARGET_COL, load_raw_dataset


def build_features(
    data_path: str,
    test_size: float = 0.2,
    random_state: int = 42,
) -> dict:
    """
    Extract feature matrix and labels, fit standard scaler, and perform
    stratified split across the 5 stress levels.
    """
    df = load_raw_dataset(data_path)

    X = df[FEATURE_COLS].values
    y = df[TARGET_COL].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )

    return {
        "df": df,
        "X_scaled": X_scaled,
        "y": y,
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "scaler": scaler,
    }
