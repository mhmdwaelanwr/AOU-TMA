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
        assert health.json()["courses"] == 217

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
