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

    assert response.status_code == 200
    assert response.get_json() == {"reply": "Expired"}
