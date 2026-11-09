"""Tests for ground truth feedback and delayed outcome collection."""

def test_record_feedback_cycle(client, sample_biosignals):
    # Arrange 1: Generate prediction first
    pred_resp = client.post("/api/v1/predict", json={"features": sample_biosignals})
    pred_id = pred_resp.json()["prediction_id"]

    # Act 2: Submit ground-truth clinical feedback
    feedback_payload = {
        "prediction_id": pred_id,
        "actual_class": 1,
        "notes": "Clinically confirmed medium-low physiological arousal via polysomnography.",
    }
    fb_resp = client.post("/api/v1/feedback", json=feedback_payload)

    # Assert
    assert fb_resp.status_code == 200
    assert fb_resp.json()["status"] == "created"
    assert "id" in fb_resp.json()
