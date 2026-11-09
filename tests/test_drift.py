"""Tests for continuous data drift and distribution stability monitoring."""

def test_drift_analysis_endpoint(client):
    # Act
    resp = client.get("/api/v1/monitoring/drift")

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_drift_detected" in data
    assert "drift_score" in data
    assert len(data["features"]) == 8

    for feat in data["features"]:
        assert "ks_statistic" in feat
        assert "ks_pvalue" in feat
        assert "psi" in feat
        assert "baseline_mean" in feat


def test_drift_simulation_detects_shift(client):
    # Act - request with simulate_drift=true
    resp = client.get("/api/v1/monitoring/drift?simulate_drift=true")

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert data["overall_drift_detected"] is True
    assert data["alert_triggered"] is True
    assert data["drift_score"] > 0.0


def test_telemetry_summary_endpoint(client):
    # Act
    resp = client.get("/api/v1/monitoring/telemetry")

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert "total_predictions" in data
    assert "mean_latency_ms" in data
    assert "p95_latency_ms" in data
    assert "active_champion" in data
