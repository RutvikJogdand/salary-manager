import csv
import io

from acme.imports import CSV_FIELDS, csv_template
from acme.security import Settings
import pytest


def test_private_data_requires_sign_in(client):
    for endpoint in [
        "/api/employees",
        "/api/employees/export",
        "/api/reports?currency=INR",
        "/api/activity",
        "/api/import/template",
    ]:
        assert client.get(endpoint).status_code == 401


def test_session_cookie_csrf_origin_and_logout(signed_in, employee_data):
    assert signed_in.get("/api/session").status_code == 200
    assert (
        signed_in.post(
            "/api/employees", json=employee_data, headers={"x-csrf-token": "wrong"}
        ).status_code
        == 403
    )
    assert (
        signed_in.post(
            "/api/employees",
            json=employee_data,
            headers={"origin": "https://attacker.test"},
        ).status_code
        == 403
    )
    assert signed_in.post("/api/logout").status_code == 200
    assert signed_in.get("/api/employees").status_code == 401


def test_invalid_password_is_throttled(client):
    for _ in range(10):
        assert (
            client.post("/api/login", json={"password": "incorrect"}).status_code == 401
        )
    assert client.post("/api/login", json={"password": "incorrect"}).status_code == 429


def test_production_requires_explicit_secret_and_https():
    with pytest.raises(RuntimeError):
        Settings(production=True)
    with pytest.raises(RuntimeError):
        Settings(production=True, admin_password="not-a-real-test-secret")


def test_end_to_end_create_edit_query_and_history(signed_in, employee_data):
    response = signed_in.post("/api/employees", json=employee_data)
    assert response.status_code == 201
    person = response.json()
    changed = signed_in.put(
        f"/api/employees/{person['id']}",
        json={
            **employee_data,
            "annual_salary": "1600000.25",
            "expected_version": 1,
            "reason": "Promotion",
        },
    )
    assert changed.status_code == 200
    assert signed_in.get("/api/employees?q=Maya&currency=INR").json()["total"] == 1
    detail = signed_in.get(f"/api/employees/{person['id']}").json()
    assert detail["history"][0]["reason"] == "Promotion"
    assert (
        signed_in.get("/api/reports?currency=INR").json()["summary"]["total"]
        == "1600000.25"
    )
    assert signed_in.get("/api/activity").json()["total"] == 2


@pytest.mark.parametrize(
    "change",
    [
        {"annual_salary": "1.234"},
        {"annual_salary": "0"},
        {"annual_salary": 123.45},
        {"currency": "ZZZ"},
        {"email": "invalid"},
        {"hired_on": "9999-01-01"},
        {"name": " "},
    ],
)
def test_api_rejects_invalid_employee_values(signed_in, employee_data, change):
    assert (
        signed_in.post("/api/employees", json={**employee_data, **change}).status_code
        == 422
    )
    assert signed_in.get("/api/employees").json()["total"] == 0


def test_filters_and_sort_are_validated(signed_in):
    for query in [
        "page_size=5000",
        "page=0",
        "sort=name;DROP TABLE employees",
        "currency=ZZZ",
    ]:
        assert signed_in.get("/api/employees?" + query).status_code == 422
    assert signed_in.get("/health").json()["status"] == "ok"


def test_csv_preview_then_commit_and_reimport_rejection(signed_in):
    text = csv_template()
    preview = signed_in.post("/api/import/preview", json={"csv_text": text}).json()
    assert preview["valid"] and preview["total_rows"] == 1
    assert signed_in.get("/api/employees").json()["total"] == 0
    commit = signed_in.post(
        "/api/import/commit", json={"csv_text": text, "checksum": preview["checksum"]}
    )
    assert commit.status_code == 201 and commit.json()["imported"] == 1
    assert (
        signed_in.post(
            "/api/import/commit",
            json={"csv_text": text, "checksum": preview["checksum"]},
        ).status_code
        == 422
    )


def test_invalid_csv_is_all_or_nothing_and_preview_does_not_mutate(
    signed_in, employee_data
):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_FIELDS)
    writer.writeheader()
    writer.writerow(employee_data)
    writer.writerow(
        {
            **employee_data,
            "employee_code": "EMP-002",
            "email": "new@example.test",
            "annual_salary": "-10",
        }
    )
    text = output.getvalue()
    preview = signed_in.post("/api/import/preview", json={"csv_text": text}).json()
    assert not preview["valid"] and preview["errors"][0]["row"] == 3
    assert (
        signed_in.post(
            "/api/import/commit",
            json={"csv_text": text, "checksum": preview["checksum"]},
        ).status_code
        == 422
    )
    assert signed_in.get("/api/employees").json()["total"] == 0


def test_csv_revalidated_if_employee_added_after_preview(signed_in):
    text = csv_template()
    preview = signed_in.post("/api/import/preview", json={"csv_text": text}).json()
    data = list(csv.DictReader(io.StringIO(text)))[0]
    signed_in.post("/api/employees", json=data)
    response = signed_in.post(
        "/api/import/commit", json={"csv_text": text, "checksum": preview["checksum"]}
    )
    assert response.status_code == 422
    assert signed_in.get("/api/employees").json()["total"] == 1


def test_csv_changed_after_preview_is_rejected(signed_in):
    assert (
        signed_in.post(
            "/api/import/commit",
            json={"csv_text": csv_template(), "checksum": "0" * 64},
        ).status_code
        == 409
    )


def test_export_applies_filters_and_neutralizes_spreadsheet_formulas(
    signed_in, employee_data
):
    signed_in.post(
        "/api/employees", json={**employee_data, "name": '=HYPERLINK("evil")'}
    )
    response = signed_in.get("/api/employees/export?currency=INR")
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert rows[0]["name"].startswith("'=")
    assert (
        list(
            csv.DictReader(
                io.StringIO(signed_in.get("/api/employees/export?currency=USD").text)
            )
        )
        == []
    )


def test_noop_and_identity_rewrite_are_rejected(signed_in, employee_data):
    person = signed_in.post("/api/employees", json=employee_data).json()
    payload = {**employee_data, "expected_version": 1, "reason": "Testing changes"}
    assert (
        signed_in.put(f"/api/employees/{person['id']}", json=payload).status_code == 422
    )
    assert (
        signed_in.put(
            f"/api/employees/{person['id']}",
            json={**payload, "employee_code": "CHANGED"},
        ).status_code
        == 422
    )


def test_sensitive_api_responses_are_not_cached(signed_in):
    response = signed_in.get("/api/employees")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-frame-options"] == "DENY"


@pytest.mark.parametrize(
    "text", ['"unclosed header', "bad,columns\n1,2", "\x00binary", ",".join(CSV_FIELDS)]
)
def test_malformed_or_empty_import_returns_actionable_error(signed_in, text):
    response = signed_in.post("/api/import/preview", json={"csv_text": text})
    assert response.status_code == 422
    assert "message" in response.json()


def test_streamed_request_cannot_bypass_body_size_limit(client):
    def chunks():
        yield b"x" * 2_100_000
        yield b"x" * 2_100_000

    assert (
        client.post(
            "/api/login", content=chunks(), headers={"Content-Type": "application/json"}
        ).status_code
        == 413
    )
