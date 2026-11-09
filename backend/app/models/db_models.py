"""SQLAlchemy database models for multi-tenancy, model registry, telemetry, and audit logs."""

import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="")
    role = Column(String(50), default="engineer")  # admin, engineer, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), default="Default Key")
    key_prefix = Column(String(16), index=True, nullable=False)
    hashed_key = Column(String(255), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="api_keys")


class ModelRecord(Base):
    __tablename__ = "model_records"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    version = Column(String(50), default="1.0.0")
    framework = Column(String(50), default="scikit-learn")  # scikit-learn, xgboost, pytorch
    stage = Column(String(50), default="Development")  # Production, Staging, Development, Archived
    is_champion = Column(Boolean, default=False)
    train_accuracy = Column(Float, default=0.0)
    test_accuracy = Column(Float, default=0.0)
    test_f1 = Column(Float, default=0.0)
    test_precision = Column(Float, default=0.0)
    test_recall = Column(Float, default=0.0)
    fit_status = Column(String(50), default="Optimal")
    artifact_path = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id = Column(Integer, primary_key=True, index=True)
    trigger_type = Column(String(50), default="manual")  # manual, automated, drift_triggered
    status = Column(String(50), default="running")  # running, completed, failed
    parameters_json = Column(Text, default="{}")
    train_samples = Column(Integer, default=0)
    test_samples = Column(Integer, default=0)
    metrics_json = Column(Text, default="{}")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    model_key = Column(String(100), index=True, nullable=False)
    model_version = Column(String(50), default="1.0.0")
    inputs_json = Column(Text, nullable=False)
    predicted_class = Column(Integer, nullable=False)
    class_name = Column(String(100), nullable=False)
    confidence = Column(Float, nullable=False)
    probabilities_json = Column(Text, nullable=False)
    latency_ms = Column(Float, default=0.0)
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    feedback = relationship("FeedbackLog", back_populates="prediction", uselist=False)


class FeedbackLog(Base):
    __tablename__ = "feedback_logs"

    id = Column(Integer, primary_key=True, index=True)
    prediction_id = Column(Integer, ForeignKey("prediction_logs.id"), nullable=False)
    actual_class = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    prediction = relationship("PredictionLog", back_populates="feedback")


class DriftRecord(Base):
    __tablename__ = "drift_records"

    id = Column(Integer, primary_key=True, index=True)
    sample_size = Column(Integer, default=0)
    drift_score = Column(Float, default=0.0)
    ks_drift_detected = Column(Boolean, default=False)
    psi_drift_detected = Column(Boolean, default=False)
    details_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
