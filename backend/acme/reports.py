"""Aggregate one currency at a time; a currency is a unit, not a filter to omit."""

from .domain import COUNTRIES, statistics


def compensation_report(
    db, currency, group_by="department", country=None, department=None
):
    clauses, params = ["status='active'", "currency=?"], [currency]
    for column, value in (("country", country), ("department", department)):
        if value:
            clauses.append(column + "=?")
            params.append(value)
    with db.transaction(write=False) as connection:
        # At 10k employees this bounded in-process median avoids database-specific percentile extensions.
        rows = connection.execute(
            "SELECT salary_minor,country,department FROM employees WHERE "
            + " AND ".join(clauses),
            params,
        ).fetchall()
        organization = connection.execute(
            "SELECT status,count(*) AS total FROM employees GROUP BY status"
        ).fetchall()
        currencies = connection.execute(
            "SELECT currency,count(*) AS headcount FROM employees WHERE status='active' GROUP BY currency ORDER BY currency"
        ).fetchall()
    buckets = {}
    for row in rows:
        label = (
            COUNTRIES[row["country"]] if group_by == "country" else row["department"]
        )
        buckets.setdefault(label, []).append(row["salary_minor"])
    groups = [
        {"label": label, **statistics(values)} for label, values in buckets.items()
    ]
    groups.sort(
        key=lambda group: (-int(group["total"].replace(".", "")), group["label"])
    )
    counts = {row["status"]: row["total"] for row in organization}
    return {
        "currency": currency,
        "basis": "Annual gross base salary; active employees only",
        "group_by": group_by,
        "filters": {"country": country, "department": department},
        "summary": statistics([row["salary_minor"] for row in rows]),
        "groups": groups,
        "organization": {
            "active": counts.get("active", 0),
            "inactive": counts.get("inactive", 0),
        },
        "currencies": [dict(row) for row in currencies],
    }
