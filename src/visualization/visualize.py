"""Exploratory data analysis, correlation, and SHAP visualization generators."""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from src.preprocess import FEATURE_COLS, FEATURE_DISPLAY


def plot_correlation_matrix(df: pd.DataFrame, output_path: str = "reports/figures/correlation_matrix.png") -> str:
    """Generate and save Pearson correlation matrix plot."""
    corr = df[FEATURE_COLS].corr()
    fig, ax = plt.subplots(figsize=(8, 6))
    cax = ax.matshow(corr, cmap="coolwarm", vmin=-1, vmax=1)
    fig.colorbar(cax)

    labels = [FEATURE_DISPLAY.get(c, c) for c in FEATURE_COLS]
    ax.set_xticks(range(len(labels)))
    ax.set_yticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="left", fontsize=9)
    ax.set_yticklabels(labels, fontsize=9)
    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    return output_path
