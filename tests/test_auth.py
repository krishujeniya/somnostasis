"""Tests for SaaS tenant authentication, user management, and API keys."""

def test_register_and_login_success(client):
    # Arrange
    user_data = {
        "email": "engineer@mlops.test",
        "password": "ValidPassword99#",
        "full_name": "MLOps Tester",
    }

    # Act - Register
    reg_resp = client.post("/api/v1/auth/register", json=user_data)

    # Assert
    assert reg_resp.status_code == 200
    data = reg_resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == user_data["email"]

    # Act - Login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": user_data["email"], "password": user_data["password"]},
    )

    # Assert
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


def test_register_duplicate_email_fails(client):
    # Arrange
    user_data = {
        "email": "dup@mlops.test",
        "password": "Password123!",
    }
    client.post("/api/v1/auth/register", json=user_data)

    # Act
    second_resp = client.post("/api/v1/auth/register", json=user_data)

    # Assert
    assert second_resp.status_code == 400
    assert "already exists" in second_resp.json()["detail"]


def test_api_key_lifecycle(client, auth_headers):
    # Arrange
    key_name = "Production Edge Ingestion Key"

    # Act 1 - Create API Key
    create_resp = client.post(
        "/api/v1/auth/api-keys",
        json={"name": key_name},
        headers=auth_headers,
    )

    # Assert 1
    assert create_resp.status_code == 200
    key_info = create_resp.json()
    assert key_info["key"].startswith("sk_live_")
    assert key_info["name"] == key_name
    raw_key = key_info["key"]
    key_id = key_info["id"]

    # Act 2 - List API Keys
    list_resp = client.get("/api/v1/auth/api-keys", headers=auth_headers)
    assert list_resp.status_code == 200
    keys = list_resp.json()
    assert any(k["id"] == key_id for k in keys)

    # Act 3 - Revoke API Key
    delete_resp = client.delete(f"/api/v1/auth/api-keys/{key_id}", headers=auth_headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()["status"] == "success"
