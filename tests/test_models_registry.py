"""Tests for model catalog, versioning, and champion promotion."""

def test_list_models(client):
    # Act
    resp = client.get("/api/v1/models")

    # Assert
    assert resp.status_code == 200
    models = resp.json()
    assert len(models) >= 4
    champions = [m for m in models if m["is_champion"]]
    assert len(champions) == 1


def test_get_model_details(client):
    # Act
    resp = client.get("/api/v1/models/random_forest")

    # Assert
    assert resp.status_code == 200
    m = resp.json()
    assert m["key"] == "random_forest"
    assert m["test_accuracy"] >= 0.85
    assert m["test_f1"] >= 0.85


def test_promote_model_to_champion(client, auth_headers):
    # Arrange: promote svm_rbf to Production champion
    payload = {"stage": "Production"}

    # Act
    resp = client.post(
        "/api/v1/models/svm_rbf/promote",
        json=payload,
        headers=auth_headers,
    )

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert data["key"] == "svm_rbf"
    assert data["is_champion"] is True
    assert data["stage"] == "Production"

    # Verify previous champion was demoted
    list_resp = client.get("/api/v1/models")
    rf = next(m for m in list_resp.json() if m["key"] == "random_forest")
    assert rf["is_champion"] is False
    assert rf["stage"] == "Staging"
