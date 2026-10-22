from decimal import Decimal

import pytest

from acme.domain import DomainError, amount, statistics, to_minor


@pytest.mark.parametrize("value,minor", [("0.01", 1), ("1200000.10", 120000010), ("9999999999.99", 999999999999)])
def test_money_is_exact(value, minor):
    assert to_minor(value) == minor
    assert amount(minor) == value


@pytest.mark.parametrize("value", ["0", "-1", "1.234", "NaN", "1e5", "1,000", "10000000000", "01", " 1"])
def test_invalid_money_cannot_enter_the_system(value):
    with pytest.raises(DomainError):
        to_minor(value)


def test_statistics_even_median_and_explicit_rounding():
    assert statistics([100, 101]) == {"headcount": 2, "total": "2.01", "mean": "1.01", "median": "1.01", "minimum": "1.00", "maximum": "1.01"}
    assert amount(Decimal("100.5")) == "1.01"


def test_statistics_odd_median_is_not_the_mean():
    result = statistics([100, 200, 900])
    assert result["median"] == "2.00"
    assert result["mean"] == "4.00"


def test_empty_report_is_not_a_zero_salary_claim():
    assert statistics([])["mean"] is None
    assert statistics([])["total"] == "0.00"
