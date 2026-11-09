"""Pydantic data contracts for request validation, model predictions, telemetry, and MLOps lifecycle."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class BiosignalInput(BaseModel):
    """Physiological biosignals captured during sleep."""
    sr: float = Field(..., ge=30.0, le=110.0, description="Snoring Rate (acoustic frequency)")
    rr: float = Field(..., ge=10.0, le=40.0, description="Respiration Rate (breaths/min)")
    t: float = Field(..., ge=80.0, le=106.0, description="Body Temperature (°F)")
    lm: float = Field(..., ge=0.0, le=30.0, description="Limb Movement Rate (twitches/min)")
    bo: float = Field(..., ge=70.0, le=100.0, description="Blood Oxygen Saturation (%)")
    rem: float = Field(..., ge=30.0, le=150.0, description="Rapid Eye Movement duration")
    sh: float = Field(..., ge=0.0, le=16.0, description="Hours of Sleep")
    hr: float = Field(..., ge=40.0, le=130.0, description="Heart Rate (BPM)")

    class Config:
        json_schema_extra = {
            "example": {
                "sr": 65.0,
                "rr": 20.0,
                "t": 98.0,
                "lm": 8.0,
                "bo": 96.0,
                "rem": 80.0,
                "sh": 7.0,
                "hr": 70.0,
            }
        }


class SinglePredictRequest(BaseModel):
    features: BiosignalInput
    model_key: Optional[str] = Field(None, description="Model key to use. Defaults to champion.")


class PredictionResponse(BaseModel):
    prediction_id: Optional[int] = None
    predicted_class: int
    class_name: str
    confidence: float
    probabilities: dict[str, float]
    model_key: str
    model_version: str
    latency_ms: float


class BatchPredictRequest(BaseModel):
    samples: list[BiosignalInput]
    model_key: Optional[str] = None


class BatchPredictResponse(BaseModel):
    total_samples: int
    predictions: list[PredictionResponse]
    class_distribution: dict[str, int]
    mean_confidence: float
    total_latency_ms: float


class SHAPContribution(BaseModel):
    feature: str
    display_name: str
    value: float
    shap_value: float
    description: str


class ExplainRequest(BaseModel):
    features: BiosignalInput
    model_key: Optional[str] = None


class ExplainResponse(BaseModel):
    predicted_class: int
    class_name: str
    model_key: str
    base_value: float
    contributions: list[SHAPContribution]


class ModelRecordOut(BaseModel):
    id: int
    key: str
    name: str
    version: str
    framework: str
    stage: str
    is_champion: bool
    train_accuracy: float
    test_accuracy: float
    test_f1: float
    test_precision: float
    test_recall: float
    fit_status: str


class PromoteModelRequest(BaseModel):
    stage: str = Field("Production", description="Target stage: Production, Staging, or Archived")


class RetrainRequest(BaseModel):
    test_size: float = Field(0.2, ge=0.1, le=0.5)
    random_state: int = Field(42, ge=1)
    rf_n_estimators: int = Field(300, ge=10, le=1000)
    xgb_max_depth: int = Field(6, ge=2, le=12)
    mlp_epochs: int = Field(200, ge=10, le=500)


class PipelineRunOut(BaseModel):
    id: int
    trigger_type: str
    status: str
    parameters: dict[str, Any]
    train_samples: int
    test_samples: int
    metrics: dict[str, Any]
    error_message: Optional[str]
    created_at: str
    completed_at: Optional[str]


class FeatureDriftOut(BaseModel):
    feature: str
    display_name: str
    ks_statistic: float
    ks_pvalue: float
    ks_drift: bool
    psi: float
    psi_drift: bool
    baseline_mean: float
    current_mean: float
    baseline_std: float
    current_std: float


class DriftResponse(BaseModel):
    overall_drift_detected: bool
    drift_score: float
    sample_size: int
    features: list[FeatureDriftOut]
    alert_triggered: bool


class FeedbackCreate(BaseModel):
    prediction_id: int
    actual_class: int = Field(..., ge=0, le=4)
    notes: Optional[str] = None


class TelemetrySummary(BaseModel):
    total_predictions: int
    today_predictions: int
    mean_latency_ms: float
    p95_latency_ms: float
    active_champion: str
    active_champion_version: str
    drift_status: str
    accuracy_estimate: float


# Auth schemas
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = ""


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class APIKeyCreate(BaseModel):
    name: str = "Production API Key"


class APIKeyCreated(BaseModel):
    id: int
    name: str
    key: str  # Plain text key shown once
    key_prefix: str
    created_at: str


class APIKeyOut(BaseModel):
    id: int
    name: str
    key_prefix: str
    is_active: bool
    created_at: str
    last_used_at: Optional[str]
