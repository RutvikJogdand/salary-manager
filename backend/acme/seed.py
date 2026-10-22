"""Explicit, deterministic seed. Never reseed automatically during web startup."""

import argparse
import os
import random
from datetime import date, timedelta

from .database import Database
from .domain import DEPARTMENTS, DomainError, EmployeeInput
from .employees import insert_employee

FIRST = [
    "Aarav",
    "Maya",
    "Oliver",
    "Amelia",
    "Ishaan",
    "Sophia",
    "Noah",
    "Zara",
    "Ethan",
    "Anika",
    "Leo",
    "Ava",
    "Arjun",
    "Freya",
    "Lucas",
    "Mia",
    "Kabir",
    "Isla",
    "Liam",
    "Leah",
]
LAST = [
    "Shah",
    "Chen",
    "Williams",
    "Patel",
    "Wilson",
    "Singh",
    "Martin",
    "Kumar",
    "Taylor",
    "Meyer",
    "Lee",
    "Brown",
    "Ng",
    "Roy",
    "Scott",
    "Das",
    "Walker",
    "Weber",
    "Wong",
    "Garcia",
]
MARKETS = [
    ("IN", "INR", 2400000),
    ("US", "USD", 125000),
    ("GB", "GBP", 78000),
    ("DE", "EUR", 85000),
    ("CA", "CAD", 115000),
    ("SG", "SGD", 115000),
]
TITLES = {
    "Engineering": "Software Engineer",
    "Product": "Product Manager",
    "Design": "Product Designer",
    "Sales": "Account Executive",
    "Operations": "Operations Analyst",
    "People": "People Partner",
}


def seed(db, count=10000):
    if not 1 <= count <= 10000:
        raise DomainError("Seed count must be between 1 and 10000.")
    rng = random.Random(20261023)
    with db.transaction() as connection:
        previous = connection.execute(
            "SELECT employee_count FROM seed_runs WHERE name='demo-v1'"
        ).fetchone()
        if previous:
            return {
                "seeded": 0,
                "previous_seed_count": previous[0],
                "message": "Already seeded; existing records and edits preserved.",
            }
        if connection.execute("SELECT count(*) FROM employees").fetchone()[0]:
            raise DomainError(
                "Refusing to seed a nonempty database without a seed marker."
            )
        for index in range(count):
            country, currency, base = MARKETS[index % len(MARKETS)]
            department = rng.choice(DEPARTMENTS)
            name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
            salary = base * rng.randint(60, 175) // 100
            employee = EmployeeInput(
                employee_code=f"ACME-{index + 1:05}",
                name=name,
                email=f"employee{index + 1:05}@acme.example.test",
                country=country,
                department=department,
                job_title=TITLES[department],
                hired_on=date(2015, 1, 1) + timedelta(days=rng.randint(0, 3900)),
                currency=currency,
                annual_salary=f"{salary}.00",
                status="inactive" if index % 23 == 0 else "active",
            )
            insert_employee(
                connection,
                employee,
                actor="Deterministic seed",
                action="seeded",
                now="2026-01-01T00:00:00.000000+00:00",
            )
        connection.execute("INSERT INTO seed_runs VALUES('demo-v1',?)", (count,))
    return {"seeded": count}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database", default=os.getenv("DATABASE_PATH", "data/acme.sqlite3")
    )
    args = parser.parse_args()
    db = Database(args.database)
    db.initialize()
    print(seed(db))


if __name__ == "__main__":
    main()
