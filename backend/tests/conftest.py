import pytest
from fastapi.testclient import TestClient

from acme.database import Database
from acme.domain import EmployeeInput
from acme.main import create_app
from acme.security import Settings


@pytest.fixture
def db(tmp_path):
    database = Database(str(tmp_path / "test.sqlite3"))
    database.initialize()
    return database


@pytest.fixture
def employee_data():
    return {"employee_code": "EMP-001", "name": "Maya Shah", "email": "maya@example.test", "country": "IN",
            "department": "Engineering", "job_title": "Software Engineer", "hired_on": "2024-01-01",
            "currency": "INR", "annual_salary": "1200000.10", "status": "active"}


@pytest.fixture
def employee(employee_data):
    return EmployeeInput(**employee_data)


@pytest.fixture
def client(tmp_path):
    app = create_app(Settings(database_path=str(tmp_path / "api.sqlite3")))
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def signed_in(client):
    response = client.post("/api/login", json={"password": "local-demo-only"})
    assert response.status_code == 200
    client.headers["x-csrf-token"] = response.json()["csrf_token"]
    return client
