"""Compensation rules. Money crosses the API as decimal strings, never floats."""
import re
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

COUNTRIES = {"IN": "India", "US": "United States", "GB": "United Kingdom", "DE": "Germany", "CA": "Canada", "SG": "Singapore"}
CURRENCIES = ("INR", "USD", "GBP", "EUR", "CAD", "SGD")
DEPARTMENTS = ("Engineering", "Product", "Design", "Sales", "Operations", "People")
Country = Literal["IN", "US", "GB", "DE", "CA", "SG"]
Currency = Literal["INR", "USD", "GBP", "EUR", "CAD", "SGD"]
Department = Literal["Engineering", "Product", "Design", "Sales", "Operations", "People"]
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Money = Annotated[str, StringConstraints(pattern=r"^(0|[1-9]\d{0,9})(\.\d{1,2})?$")]


class DomainError(Exception):
    def __init__(self, message: str, status: int = 422, **details):
        super().__init__(message)
        self.status = status
        self.message = message
        self.details = details


def to_minor(value: str) -> int:
    if not re.fullmatch(r"(0|[1-9]\d{0,9})(\.\d{1,2})?", value):
        raise DomainError("Salary must be a decimal amount with at most two decimal places.")
    minor = int(Decimal(value) * 100)
    if minor <= 0:
        raise DomainError("Annual base salary must be greater than zero.")
    return minor


def amount(minor: int | Decimal) -> str:
    return str((Decimal(minor) / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def statistics(values: list[int]) -> dict:
    ordered = sorted(values)
    count = len(ordered)
    if not count:
        return {"headcount": 0, "total": "0.00", "mean": None, "median": None, "minimum": None, "maximum": None}
    middle = count // 2
    median = Decimal(ordered[middle]) if count % 2 else Decimal(ordered[middle - 1] + ordered[middle]) / 2
    return {"headcount": count, "total": amount(sum(values)), "mean": amount(Decimal(sum(values)) / count),
            "median": amount(median), "minimum": amount(ordered[0]), "maximum": amount(ordered[-1])}


class EmployeeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    employee_code: Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{1,31}$")]
    name: Text
    email: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=254)]
    country: Country
    department: Department
    job_title: Text
    hired_on: date
    currency: Currency
    annual_salary: Money
    status: Literal["active", "inactive"] = "active"

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value):
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value.lower()

    @field_validator("annual_salary")
    @classmethod
    def positive_salary(cls, value):
        to_minor(value)
        return value

    @field_validator("hired_on")
    @classmethod
    def no_future_hire(cls, value):
        if value > date.today():
            raise ValueError("Future hires are outside this version's scope.")
        return value


class EmployeeChange(EmployeeInput):
    expected_version: int = Field(ge=1)
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=500)]


class DirectoryFilter(BaseModel):
    q: str = Field(default="", max_length=120)
    country: Country | None = None
    department: Department | None = None
    currency: Currency | None = None
    status: Literal["active", "inactive"] | None = None
    sort: Literal["name", "salary", "code", "updated"] = "name"
    direction: Literal["asc", "desc"] = "asc"
    page: int = Field(default=1, ge=1, le=100000)
    page_size: int = Field(default=25, ge=1, le=100)

    def where(self) -> tuple[str, list]:
        clauses, params = [], []
        if self.q.strip():
            # Treat LIKE wildcards as literal search text.
            escaped = self.q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            clauses.append("(name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR employee_code LIKE ? ESCAPE '\\')")
            params.extend([f"%{escaped}%"] * 3)
        for key in ("country", "department", "currency", "status"):
            value = getattr(self, key)
            if value:
                clauses.append(f"{key} = ?")  # key is from this fixed allowlist.
                params.append(value)
        return (" WHERE " + " AND ".join(clauses) if clauses else ""), params

    def order(self) -> str:
        column = {"name": "name COLLATE NOCASE", "salary": "currency, salary_minor", "code": "employee_code", "updated": "updated_at"}[self.sort]
        # Currency is the first grouping key for salary order; amounts in unlike units are not ranked together.
        return f" ORDER BY {column} {self.direction}, id ASC"
