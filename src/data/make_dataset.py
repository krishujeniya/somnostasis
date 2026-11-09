"""Dataset acquisition, validation, and schema normalization module."""

import os
import urllib.request
import pandas as pd

FEATURE_COLS = ["sr", "rr", "t", "lm", "bo", "rem", "sh", "hr"]
TARGET_COL = "sl"

DATASET_URL = (
    "https://raw.githubusercontent.com/krishujeniya/"
    "stress-level-prediction/main/data/SaYoPillow.csv"
)


def ensure_dataset(path: str) -> None:
    """Download SaYoPillow.csv from primary repository if missing locally."""
    if os.path.exists(path):
        return
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    try:
        urllib.request.urlretrieve(DATASET_URL, path)
    except Exception as exc:
        raise RuntimeError(
            f"Dataset not found at {path} and remote fetch failed: {exc}"
        ) from exc


def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Standardise raw CSV headers into canonical short feature tokens."""
    df.columns = [c.strip().lower() for c in df.columns]
    rename_map = {
        "sr.1": "sh",
        "sleeping hours": "sh",
        "snoring rate": "sr",
        "respiration rate": "rr",
        "body temperature": "t",
        "limb movement": "lm",
        "blood oxygen": "bo",
        "eye movement": "rem",
        "heart rate": "hr",
        "stress level": "sl",
    }
    applied = {old: new for old, new in rename_map.items() if old in df.columns}
    if applied:
        df = df.rename(columns=applied)
    return df


def load_raw_dataset(path: str) -> pd.DataFrame:
    """Load, normalise, clean nulls and duplicate rows."""
    ensure_dataset(path)
    df = pd.read_csv(path)
    df = normalise_columns(df)

    missing = [c for c in FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing expected columns {missing}. Found: {list(df.columns)}")

    df = df[FEATURE_COLS + [TARGET_COL]].copy()
    df.dropna(inplace=True)
    df.drop_duplicates(inplace=True)
    df[TARGET_COL] = df[TARGET_COL].astype(int)
    return df
