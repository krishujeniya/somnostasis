"""Tests for SHAP feature attribution explainability service."""

def test_explain_features_success(client, sample_biosignals):
    # Arrange
    payload = {
        "features": sample_biosignals,
        "model_key": "random_forest",
    }

    # Act
    resp = client.post("/api/v1/explain", json=payload)

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_class"] in [0, 1, 2, 3, 4]
    assert "base_value" in data
    assert len(data["contributions"]) == 8

    # Verify contribution structure
    for contrib in data["contributions"]:
        assert "feature" in contrib
        assert "display_name" in contrib
        assert "shap_value" in contrib
        assert "value" in contrib
        assert "description" in contrib
