"""Continuous Data Drift and Distribution Monitoring Engine."""

from typing import Any
import numpy as np
import pandas as pd
from scipy import stats
from backend.app.config import settings
from src.preprocess import FEATURE_COLS, FEATURE_DESC, FEATURE_DISPLAY


def compute_psi(expected: np.ndarray, actual: np.ndarray, num_bins: int = 10) -> float:
    """
    Calculate Population Stability Index (PSI) between baseline (expected)
    and production inference (actual) feature distributions.
    """
    if len(actual) < 5 or len(expected) < 5:
        return 0.0

    # Create quantile bins from expected baseline
    quantiles = np.linspace(0, 100, num_bins + 1)
    bin_edges = np.percentile(expected, quantiles)
    bin_edges = np.unique(bin_edges)  # handle tied quantiles

    if len(bin_edges) < 2:
        return 0.0

    # Ensure range covers all actual and expected values
    bin_edges[0] = min(bin_edges[0], np.min(actual) - 1e-4)
    bin_edges[-1] = max(bin_edges[-1], np.max(actual) + 1e-4)

    expected_counts, _ = np.histogram(expected, bins=bin_edges)
    actual_counts, _ = np.histogram(actual, bins=bin_edges)

    # Add small epsilon to prevent division by zero
    eps = 1e-4
    expected_pct = (expected_counts + eps) / (np.sum(expected_counts) + eps * len(expected_counts))
    actual_pct = (actual_counts + eps) / (np.sum(actual_counts) + eps * len(actual_counts))

    psi_val = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(max(0.0, psi_val))


class DriftDetector:
    """Profiles baseline dataset and detects covariate shift in incoming inference payloads."""

    def __init__(self):
        self._baseline_df: pd.DataFrame | None = None
        self._baseline_stats: dict[str, dict[str, float]] = {}

    def fit_baseline(self, df: pd.DataFrame) -> None:
        """Cache baseline physiological statistics."""
        self._baseline_df = df[FEATURE_COLS].copy()
        for col in FEATURE_COLS:
            vals = self._baseline_df[col].values
            self._baseline_stats[col] = {
                "mean": float(np.mean(vals)),
                "std": float(np.std(vals)),
                "min": float(np.min(vals)),
                "max": float(np.max(vals)),
            }

    def analyze(self, production_samples: list[dict[str, float]]) -> dict[str, Any]:
        """
        Evaluate production samples against baseline distributions using
        Kolmogorov-Smirnov two-sample test and Population Stability Index.
        """
        if self._baseline_df is None:
            # Fallback fit
            from backend.app.core.registry import model_registry
            data = model_registry.get_baseline_data()
            self.fit_baseline(data["df"])

        prod_df = pd.DataFrame(production_samples)
        feature_results = []
        drift_count = 0

        for col in FEATURE_COLS:
            baseline_vals = self._baseline_df[col].values
            curr_vals = prod_df[col].values if col in prod_df.columns else baseline_vals

            # 2-sample Kolmogorov-Smirnov test
            ks_res = stats.ks_2samp(baseline_vals, curr_vals)
            ks_stat = float(ks_res.statistic)
            ks_pval = float(ks_res.pvalue)
            ks_drift = bool(ks_pval < settings.DRIFT_KS_ALPHA and len(curr_vals) >= 10)

            # PSI calculation
            psi = compute_psi(baseline_vals, curr_vals)
            psi_drift = bool(psi >= settings.DRIFT_PSI_THRESHOLD)

            if ks_drift or psi_drift:
                drift_count += 1

            feature_results.append({
                "feature": col,
                "display_name": FEATURE_DISPLAY.get(col, col),
                "ks_statistic": round(ks_stat, 4),
                "ks_pvalue": round(ks_pval, 4),
                "ks_drift": ks_drift,
                "psi": round(psi, 4),
                "psi_drift": psi_drift,
                "baseline_mean": round(float(np.mean(baseline_vals)), 2),
                "current_mean": round(float(np.mean(curr_vals)), 2),
                "baseline_std": round(float(np.std(baseline_vals)), 2),
                "current_std": round(float(np.std(curr_vals)), 2),
            })

        drift_ratio = drift_count / max(1, len(FEATURE_COLS))
        overall_drift = drift_count >= 2

        return {
            "overall_drift_detected": overall_drift,
            "drift_score": round(drift_ratio, 4),
            "sample_size": len(production_samples),
            "features": feature_results,
            "alert_triggered": overall_drift,
        }


# Global drift detector singleton
drift_detector = DriftDetector()
