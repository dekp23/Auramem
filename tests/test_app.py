import pytest

from app import app


@pytest.fixture()
def client():
    app.config.update(TESTING=True, SECRET_KEY="test-secret")
    with app.test_client() as test_client:
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
