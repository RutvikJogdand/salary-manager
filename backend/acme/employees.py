"""Employee operations and their audit records share one transaction."""

import json
import sqlite3
from datetime import datetime, timezone

from .domain import (
    DirectoryFilter,
    DomainError,
    EmployeeChange,
    EmployeeInput,
    amount,
    to_minor,
)


def timestamp():
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def serialize(row):
    item = dict(row)
    item["annual_salary"] = amount(item.pop("salary_minor"))
    return item


def get_employee(connection, employee_id):
    row = connection.execute(
        "SELECT * FROM employees WHERE id = ?", (employee_id,)
    ).fetchone()
    if not row:
        raise DomainError("Employee was not found.", 404)
    return serialize(row)


def audit(connection, employee_id, action, actor, reason, before, after, now):
    connection.execute(
        "INSERT INTO audit_events(employee_id,action,actor,reason,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)",
        (
            employee_id,
            action,
            actor,
            reason,
            json.dumps(before) if before else None,
            json.dumps(after),
            now,
        ),
    )


def insert_employee(
    connection,
    data: EmployeeInput,
    actor="HR Manager (demo)",
    action="created",
    now=None,
):
    now = now or timestamp()
    values = data.model_dump(mode="json")
    values["salary_minor"] = to_minor(values.pop("annual_salary"))
    values.update(created_at=now, updated_at=now)
    columns = list(values)
    try:
        cursor = connection.execute(
            f"INSERT INTO employees({','.join(columns)}) VALUES({','.join('?' for _ in columns)})",
            list(values.values()),
        )
    except sqlite3.IntegrityError as error:
        raise DomainError(
            "An employee with that ID or email already exists.", 409
        ) from error
    result = get_employee(connection, cursor.lastrowid)
    audit(connection, result["id"], action, actor, "Initial record", None, result, now)
    return result


def create_employee(db, data):
    with db.transaction() as connection:
        return insert_employee(connection, data)


def update_employee(db, employee_id: int, data: EmployeeChange):
    with db.transaction() as connection:
        before = get_employee(connection, employee_id)
        if before["version"] != data.expected_version:
            raise DomainError(
                "This record changed since you opened it. Close and reopen it to review the latest version before saving.",
                409,
            )
        if data.employee_code != before["employee_code"]:
            raise DomainError(
                "Employee IDs cannot be changed. They identify the same person across imports and history."
            )
        values = data.model_dump(mode="json", exclude={"expected_version", "reason"})
        values["annual_salary"] = amount(to_minor(values["annual_salary"]))
        if all(before[key] == value for key, value in values.items()):
            raise DomainError("No values changed. Make a change before saving.")
        now = timestamp()
        values["salary_minor"] = to_minor(values.pop("annual_salary"))
        values.update(version=before["version"] + 1, updated_at=now)
        try:
            connection.execute(
                f"UPDATE employees SET {','.join(key + '=?' for key in values)} WHERE id=?",
                [*values.values(), employee_id],
            )
        except sqlite3.IntegrityError as error:
            raise DomainError(
                "An employee with that email already exists.", 409
            ) from error
        after = get_employee(connection, employee_id)
        action = (
            "salary_changed"
            if before["annual_salary"] != after["annual_salary"]
            or before["currency"] != after["currency"]
            else "profile_updated"
        )
        if before["status"] != after["status"]:
            action = "reactivated" if after["status"] == "active" else "deactivated"
        audit(
            connection,
            employee_id,
            action,
            "HR Manager (demo)",
            data.reason,
            before,
            after,
            now,
        )
        return after


def list_employees(db, filters: DirectoryFilter):
    where, params = filters.where()
    with db.transaction(write=False) as connection:
        count = connection.execute(
            "SELECT count(*) FROM employees" + where, params
        ).fetchone()[0]
        rows = connection.execute(
            "SELECT * FROM employees" + where + filters.order() + " LIMIT ? OFFSET ?",
            [*params, filters.page_size, (filters.page - 1) * filters.page_size],
        ).fetchall()
        return {
            "items": [serialize(row) for row in rows],
            "total": count,
            "page": filters.page,
            "page_size": filters.page_size,
        }


def event_dict(row):
    event = dict(row)
    event["before"] = json.loads(event.pop("before_json") or "null")
    event["after"] = json.loads(event.pop("after_json"))
    return event


def employee_detail(db, employee_id):
    with db.transaction(write=False) as connection:
        employee = get_employee(connection, employee_id)
        events = connection.execute(
            "SELECT * FROM audit_events WHERE employee_id=? ORDER BY id DESC LIMIT 100",
            (employee_id,),
        ).fetchall()
        return {"employee": employee, "history": [event_dict(row) for row in events]}


def activity(db, page=1):
    with db.transaction(write=False) as connection:
        total = connection.execute(
            "SELECT count(*) FROM audit_events WHERE action <> 'seeded'"
        ).fetchone()[0]
        events = connection.execute(
            "SELECT * FROM audit_events WHERE action <> 'seeded' ORDER BY id DESC LIMIT 25 OFFSET ?",
            ((page - 1) * 25,),
        ).fetchall()
        return {
            "items": [event_dict(row) for row in events],
            "total": total,
            "page": page,
        }
