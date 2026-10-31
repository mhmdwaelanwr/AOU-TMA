from pathlib import Path

from fastapi.testclient import TestClient

from app import main


def client_for(tmp_path: Path) -> TestClient:
    main.DB_PATH = tmp_path / "orders.db"
    return TestClient(main.app)


def test_health_and_catalog(tmp_path: Path):
    with client_for(tmp_path) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["courses"] == len(main.COURSES) > 0

        search = client.get("/api/courses", params={"q": "TM105", "faculty": "all"})
        assert search.status_code == 200
        assert search.json()["count"] == 1
        assert search.json()["items"][0]["code"] == "TM105"
        item = search.json()["items"][0]
        assert item["title"] == "Introduction to Programming"
        assert item["descriptionStatus"] == "verified"
        assert "programming" in item["description"].lower()
        assert item["icon"] == "code-2"

        title_search = client.get("/api/courses", params={"q": "Python Programming", "faculty": "all"})
        assert title_search.status_code == 200
        assert any(item["code"] == "M110" for item in title_search.json()["items"])


def test_payment_methods_are_exposed_without_fake_destinations(tmp_path: Path):
    with client_for(tmp_path) as client:
        response = client.get("/api/payment-methods")
        assert response.status_code == 200
        methods = response.json()["items"]
        assert any(item["id"] == "instapay" for item in methods)
        assert any(item["id"] == "usdt_trc20" for item in methods)
        assert all(item["destination"] is None for item in methods if not item["configured"])


def test_missing_course_is_404(tmp_path: Path):
    with client_for(tmp_path) as client:
        assert client.get("/api/courses/DOES-NOT-EXIST").status_code == 404


def test_order_is_persisted_and_validated(tmp_path: Path):
    with client_for(tmp_path) as client:
        response = client.post(
            "/api/orders",
            json={
                "course_code": "TM105",
                "customer_name": "Test User",
                "contact": "01000000000",
                "currency": "EGP",
                "payment_method": "instapay",
                "payment_reference": "TEST-REF",
            },
        )
        assert response.status_code == 201
        payload = response.json()
        assert payload["ok"] is True
        assert payload["order_id"].startswith("AOU-")

        invalid = client.post(
            "/api/orders",
            json={
                "course_code": "TM105",
                "customer_name": "Test User",
                "contact": "01000000000",
                "currency": "USD",
            },
        )
        assert invalid.status_code == 422


def test_non_admin_cannot_access_private_admin_data(tmp_path: Path):
    with client_for(tmp_path) as client:
        signup = client.post("/api/auth/register", json={
            "name": "Regular Student", "email": "student@example.com",
            "password": "correct-horse-battery-staple",
        })
        assert signup.status_code == 200
        assert signup.json()["user"]["is_admin"] is False
        token = signup.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        assert client.get("/api/admin/stats", headers=headers).status_code == 403
        assert client.get("/api/admin/orders", headers=headers).status_code == 403


def test_google_mock_token_and_lms_password_are_rejected(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(main, "GOOGLE_CLIENT_ID", "")
    with client_for(tmp_path) as client:
        response = client.post("/api/auth/google", json={
            "token": "mock-google-token-123", "email": "admin@example.com",
        })
        assert response.status_code == 503
        request = client.post("/api/orders", json={
            "course_code": "TM105", "customer_name": "Student",
            "contact": "01000000000", "lms_password": "do-not-store-me",
        })
        assert request.status_code == 422
        assert request.json()["detail"] == "lms_credentials_not_accepted"

def test_fx_binding_is_required(tmp_path: Path, monkeypatch):
    monkeypatch.delenv("FX_INTERNAL_URL", raising=False)
    with client_for(tmp_path) as client:
        res = client.get("/api/fx", params={"currency": "KWD"})
        assert res.status_code == 503
        assert res.json()["detail"] == "fx_service_binding_missing"


def test_fx_requests_use_the_private_service_binding(tmp_path: Path, monkeypatch):
    seen = []
    original_client = main.httpx.AsyncClient

    def handler(request):
        seen.append((request.url.path, request.url.params.get("currency")))
        if request.url.path == "/api/currencies":
            return main.httpx.Response(200, json={"base": "EGP", "currencies": ["EGP", "KWD"]})
        return main.httpx.Response(200, json={"base": "EGP", "currency": "KWD", "rate": 0.006})

    monkeypatch.setenv("FX_INTERNAL_URL", "https://private-fx.internal")
    monkeypatch.setattr(main.httpx, "AsyncClient", lambda **kw: original_client(
        transport=main.httpx.MockTransport(handler), **kw
    ))

    with client_for(tmp_path) as client:
        fx = client.get("/api/fx?currency=kwd")
        assert fx.status_code == 200
        assert fx.json()["currency"] == "KWD"
        currencies = client.get("/api/currencies")
        assert currencies.status_code == 200
        assert currencies.json()["currencies"] == ["EGP", "KWD"]
    assert seen == [("/api/fx", "KWD"), ("/api/currencies", None)]


def test_vercel_does_not_accept_ephemeral_database_writes(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    with client_for(tmp_path) as client:
        assert client.get("/api/courses?q=TM105").status_code == 200
        result = client.post("/api/orders", json={
            "course_code": "TM105", "customer_name": "Student",
            "contact": "01000000000",
        })
        assert result.status_code == 503
        assert result.json()["detail"] == "durable_storage_required"
        signup = client.post("/api/auth/register", json={
            "name": "New Student", "email": "new@example.com",
            "password": "a-long-unique-password",
        })
        assert signup.status_code == 503


def test_capabilities_follow_storage_guard(tmp_path: Path, monkeypatch):
    monkeypatch.delenv("VERCEL", raising=False)
    with client_for(tmp_path) as client:
        response = client.get("/api/capabilities")
        assert response.status_code == 200
        assert response.headers["cache-control"] == "no-store"
        assert response.json()["mode"] == "full_local"
        assert all(response.json()["features"].values())

    monkeypatch.setenv("VERCEL", "1")
    with client_for(tmp_path) as client:
        response = client.get("/api/capabilities")
        assert response.status_code == 200
        assert response.json()["mode"] == "catalog_only"
        assert response.json()["reason"] == "durable_storage_required"
        assert not any(response.json()["features"].values())
        assert response.headers["cache-control"] == "no-store"
        assert client.get("/api/courses?q=TM105").status_code == 200
        assert client.post("/api/auth/login", json={"email": "a@example.com", "password": "x"}).status_code == 503
