"""Tests for single-sample, batch, and CSV prediction endpoints."""

import io


def test_predict_single_sample_default_champion(client, sample_biosignals):
    # Arrange
    payload = {"features": sample_biosignals}

    # Act
    resp = client.post("/api/v1/predict", json=payload)

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert "prediction_id" in data
    assert data["predicted_class"] in [0, 1, 2, 3, 4]
    assert isinstance(data["confidence"], float)
    assert 0.0 <= data["confidence"] <= 1.0
    assert "latency_ms" in data
    assert len(data["probabilities"]) == 5


def test_predict_single_sample_explicit_models(client, sample_biosignals):
    # Test all registered models: random_forest, xgboost, svm_rbf, knn, mlp
    for model_key in ["random_forest", "xgboost", "svm_rbf", "knn", "mlp"]:
        # Arrange
        payload = {"features": sample_biosignals, "model_key": model_key}

        # Act
        resp = client.post("/api/v1/predict", json=payload)

        # Assert
        assert resp.status_code == 200, f"Failed for model {model_key}: {resp.text}"
        data = resp.json()
        assert data["model_key"] == model_key
        assert data["predicted_class"] in [0, 1, 2, 3, 4]


def test_predict_validation_error_out_of_range(client, sample_biosignals):
    # Arrange: invalid heart rate out of bounds
    invalid_features = sample_biosignals.copy()
    invalid_features["hr"] = 250.0  # limit is 130

    # Act
    resp = client.post("/api/v1/predict", json={"features": invalid_features})

    # Assert
    assert resp.status_code == 422


def test_predict_batch_samples(client, sample_biosignals):
    # Arrange
    batch_payload = {
        "samples": [
            sample_biosignals,
            {**sample_biosignals, "sr": 95.0, "bo": 82.0, "hr": 88.0, "sh": 2.0},
        ],
        "model_key": "random_forest",
    }

    # Act
    resp = client.post("/api/v1/predict/batch", json=batch_payload)

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_samples"] == 2
    assert len(data["predictions"]) == 2
    assert "class_distribution" in data
    assert data["mean_confidence"] > 0.0


def test_predict_csv_upload(client):
    # Arrange
    csv_data = """sr,rr,t,lm,bo,rem,sh,hr
65.0,20.0,98.0,8.0,96.0,80.0,7.0,70.0
92.0,26.0,91.0,16.0,88.0,98.0,2.0,76.0
"""
    files = {"file": ("test_biosignals.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}

    # Act
    resp = client.post("/api/v1/predict/csv", files=files)

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_samples"] == 2
    assert len(data["predictions"]) == 2
