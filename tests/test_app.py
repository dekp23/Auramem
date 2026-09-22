import pytest

import app as app_module


@pytest.fixture()
def client():
    app_module.app.config.update(TESTING=True, SECRET_KEY="test-secret")
    with app_module.app.test_client() as test_client:
        yield test_client


def test_index_renders(client):
    response = client.get("/")

    assert response.status_code == 200
    assert b"Aura" in response.data


@pytest.mark.parametrize("path", ["/patient", "/caregiver"])
def test_authenticated_views_redirect_to_login(client, path):
    response = client.get(path)

    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")


def test_chat_requires_authentication(client):
    response = client.post("/api/chat", json={"message": "Hello"})

    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_login_form_includes_csrf_token(client):
    response = client.get("/login")

    assert response.status_code == 200
    assert b'name="_csrf_token"' in response.data


def test_login_rejects_missing_csrf_token(client):
    response = client.post(
        "/login",
        data={"email": "caregiver@example.com", "password": "password"},
    )

    assert response.status_code == 400
    assert b"form expired" in response.data


def test_report_requires_authentication(client):
    response = client.get("/api/generate_report")

    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication required"}


def test_report_returns_data_coverage(client, monkeypatch):
    def fake_sb_api(endpoint, *args, **kwargs):
        if "activity_events" in endpoint:
            return [{"id": "activity"}]
        return [{"id": "memory"}]

    monkeypatch.setattr(app_module, "sb_api", fake_sb_api)
    with client.session_transaction() as session:
        session["user_id"] = "user-1"
    client.set_cookie("aura_access_token", "token")

    response = client.get("/api/generate_report")

    assert response.status_code == 200
    assert response.get_json()["data_coverage"] == {
        "saved_memories": 1,
        "activity_events": 1,
    }


def test_activity_requires_authentication(client):
    response = client.post("/api/activity", json={"event_type": "game_completed"})

    assert response.status_code == 401


def test_activity_records_structured_event(client, monkeypatch):
    calls = []

    def fake_sb_api(*args, **kwargs):
        calls.append((args, kwargs))
        return [{"id": "activity"}]

    monkeypatch.setattr(app_module, "sb_api", fake_sb_api)
    client.get("/login")
    with client.session_transaction() as session:
        session["user_id"] = "user-1"
        token = session["_csrf_token"]
    client.set_cookie("aura_access_token", "token")

    response = client.post(
        "/api/activity",
        json={"event_type": "game_completed", "metadata": {"correct": True}},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 201
    assert calls[0][0][0] == "rest/v1/activity_events"
    assert calls[0][0][2]["metadata"] == {"correct": True}


def test_privacy_policy_renders(client):
    response = client.get("/privacy")

    assert response.status_code == 200
    assert b"Privacy Policy" in response.data


def test_account_delete_requires_service_role_configuration(client):
    client.get("/login")
    with client.session_transaction() as session:
        session["user_id"] = "user-1"
        token = session["_csrf_token"]
    client.set_cookie("aura_access_token", "token")

    response = client.post(
        "/account/delete",
        data={"_csrf_token": token},
    )

    assert response.status_code == 503
    assert response.get_json() == {"error": "Account deletion is not configured"}


def test_account_delete_cleans_data_and_auth_user(client, monkeypatch):
    class Response:
        status_code = 204

        def raise_for_status(self):
            return None

    calls = []

    def fake_delete(url, **kwargs):
        calls.append(url)
        return Response()

    monkeypatch.setattr(app_module, "SUPABASE_SERVICE_ROLE_KEY", "service-role")
    monkeypatch.setattr(app_module, "SB_URL", None)
    monkeypatch.setattr(app_module.requests, "delete", fake_delete)
    client.get("/login")
    with client.session_transaction() as session:
        session["user_id"] = "user-1"
        token = session["_csrf_token"]
    client.set_cookie("aura_access_token", "token")

    response = client.post("/account/delete", data={"_csrf_token": token})

    assert response.status_code == 302
    assert calls == [
        "None/rest/v1/activity_events?user_id=eq.user-1",
        "None/rest/v1/memories?user_id=eq.user-1",
        "None/rest/v1/profiles?id=eq.user-1",
        "None/auth/v1/admin/users/user-1",
    ]


def test_chat_reports_missing_groq_configuration(client, monkeypatch):
    monkeypatch.setattr(app_module, "GROQ_KEY", None)
    client.get("/login")
    with client.session_transaction() as session:
        session["user_id"] = "user-1"
        token = session["_csrf_token"]
    client.set_cookie("aura_access_token", "token")

    response = client.post(
        "/api/chat",
        json={"message": "Hello"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 503


def test_chat_calls_groq_with_bearer_auth(client, monkeypatch):
    class Response:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"choices": [{"message": {"content": "Hello there."}}]}

    calls = []

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return Response()

    monkeypatch.setattr(app_module, "GROQ_KEY", "groq-test-key")
    monkeypatch.setattr(
        app_module, "get_profile", lambda *args: {"patient_name": "Sam"}
    )
    monkeypatch.setattr(app_module.requests, "post", fake_post)
    client.get("/login")
    with client.session_transaction() as session:
        session["user_id"] = "user-1"
        token = session["_csrf_token"]
    client.set_cookie("aura_access_token", "token")

    response = client.post(
        "/api/chat",
        json={"message": "Hello"},
        headers={"X-CSRF-Token": token},
    )

    assert response.status_code == 200
    assert response.get_json() == {"reply": "Hello there."}
    assert calls[0][1]["headers"]["Authorization"] == "Bearer groq-test-key"
