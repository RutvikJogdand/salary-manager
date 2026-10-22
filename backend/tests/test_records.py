from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import sqlite3

import pytest

from acme.database import Database
from acme.domain import DirectoryFilter, DomainError, EmployeeChange, EmployeeInput
from acme.employees import create_employee, employee_detail, list_employees, update_employee
from acme.reports import compensation_report
from acme.seed import seed


def test_salary_change_preserves_original_and_reason(db, employee, employee_data):
    original = create_employee(db, employee)
    saved = update_employee(db, original["id"], EmployeeChange(**{**employee_data, "annual_salary": "1400000.20"}, expected_version=1, reason="Annual review"))
    assert saved["version"] == 2
    event = employee_detail(db, original["id"])["history"][0]
    assert event["before"]["annual_salary"] == "1200000.10"
    assert event["after"]["annual_salary"] == "1400000.20"
    assert event["reason"] == "Annual review"


def test_two_editors_cannot_silently_overwrite_each_other(db, employee, employee_data):
    person = create_employee(db, employee)
    barrier = Barrier(2)
    def edit(salary):
        barrier.wait()
        try:
            return update_employee(db, person["id"], EmployeeChange(**{**employee_data, "annual_salary": salary}, expected_version=1, reason="Competing edits"))["version"]
        except DomainError as error:
            return error.status
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(edit, ["1300000.00", "1500000.00"]))
    assert sorted(results) == [2, 409]
    assert len(employee_detail(db, person["id"])["history"]) == 2


def test_audit_failure_rolls_back_salary(db, employee, employee_data, monkeypatch):
    person = create_employee(db, employee)
    def fail(*args):
        raise RuntimeError("simulated audit failure")
    monkeypatch.setattr("acme.employees.audit", fail)
    with pytest.raises(RuntimeError):
        update_employee(db, person["id"], EmployeeChange(**{**employee_data, "annual_salary": "1500000"}, expected_version=1, reason="Annual review"))
    assert employee_detail(db, person["id"])["employee"]["annual_salary"] == "1200000.10"


def test_deactivation_excludes_pay_from_reports_without_erasing_history(db, employee, employee_data):
    person = create_employee(db, employee)
    update_employee(db, person["id"], EmployeeChange(**{**employee_data, "status": "inactive"}, expected_version=1, reason="Employee left"))
    assert compensation_report(db, "INR")["summary"]["headcount"] == 0
    assert employee_detail(db, person["id"])["employee"]["annual_salary"] == "1200000.10"
    assert len(employee_detail(db, person["id"])["history"]) == 2


def test_reports_keep_currencies_separate_and_apply_filters(db, employee_data):
    for index, (currency, salary, department) in enumerate([("INR", "100.01", "Engineering"), ("INR", "200.02", "People"), ("USD", "900000", "Engineering")]):
        create_employee(db, EmployeeInput(**{**employee_data, "employee_code": f"EMP-{index}", "email": f"person{index}@example.test", "currency": currency, "annual_salary": salary, "department": department}))
    report = compensation_report(db, "INR")
    assert report["summary"]["total"] == "300.03"
    assert report["summary"]["median"] == "150.02"
    assert report["organization"]["active"] == 3
    assert compensation_report(db, "INR", department="People")["summary"]["total"] == "200.02"


def test_duplicate_email_is_case_insensitive(db, employee, employee_data):
    create_employee(db, employee)
    with pytest.raises(DomainError, match="already exists"):
        create_employee(db, EmployeeInput(**{**employee_data, "employee_code": "EMP-002", "email": "MAYA@EXAMPLE.TEST"}))


def test_search_wildcards_are_literal_and_pagination_is_stable(db, employee_data):
    for index in range(3):
        create_employee(db, EmployeeInput(**{**employee_data, "employee_code": f"EMP-{index}", "email": f"maya{index}@example.test"}))
    assert list_employees(db, DirectoryFilter(q="%"))["total"] == 0
    first = list_employees(db, DirectoryFilter(page_size=2))
    second = list_employees(db, DirectoryFilter(page_size=2, page=2))
    assert first["total"] == 3
    assert not {x["id"] for x in first["items"]}.intersection(x["id"] for x in second["items"])


def test_data_survives_new_database_instance(db, employee):
    person = create_employee(db, employee)
    reopened = Database(db.path)
    reopened.initialize()
    assert employee_detail(reopened, person["id"])["employee"] == person


def test_audit_is_append_only(db, employee):
    create_employee(db, employee)
    with pytest.raises(sqlite3.IntegrityError, match="cannot be deleted"):
        with db.transaction() as connection:
            connection.execute("DELETE FROM audit_events")


def test_seed_has_exactly_10000_and_rerun_preserves_edits(db, employee_data):
    assert seed(db)["seeded"] == 10000
    original = employee_detail(db, 1)["employee"]
    payload = {key: original[key] for key in employee_data}
    update_employee(db, 1, EmployeeChange(**{**payload, "annual_salary": "1234567.89"}, expected_version=1, reason="Preserve this change"))
    assert seed(db)["seeded"] == 0
    assert list_employees(db, DirectoryFilter())["total"] == 10000
    assert employee_detail(db, 1)["employee"]["annual_salary"] == "1234567.89"


def test_seed_is_deterministic_and_refuses_unmarked_existing_data(db, tmp_path, employee):
    other = Database(str(tmp_path / "other.sqlite3"))
    other.initialize()
    seed(db, 12)
    seed(other, 12)
    assert list_employees(db, DirectoryFilter()) == list_employees(other, DirectoryFilter())
    third = Database(str(tmp_path / "third.sqlite3"))
    third.initialize()
    create_employee(third, employee)
    with pytest.raises(DomainError, match="nonempty"):
        seed(third)
