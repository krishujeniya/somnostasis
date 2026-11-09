"""Tests for automated model retraining pipeline."""

def test_pipeline_runs_list(client):
    # Act
    resp = client.get("/api/v1/pipelines/runs")

    # Assert
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_retraining_execution(client, auth_headers):
    # Arrange: small quick training parameters for integration test
    payload = {
        "test_size": 0.2,
        "random_state": 42,
        "rf_n_estimators": 20,
        "xgb_max_depth": 3,
        "mlp_epochs": 15,
    }

    # Act
    resp = client.post("/api/v1/pipelines/retrain", json=payload, headers=auth_headers)

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert "metrics" in data
    assert "random_forest" in data["metrics"]
    assert "svm_rbf" in data["metrics"]
    assert data["metrics"]["random_forest"]["test_accuracy"] >= 0.85

    # Verify run appears in run history
    history_resp = client.get("/api/v1/pipelines/runs")
    assert history_resp.status_code == 200
    assert len(history_resp.json()) >= 1
