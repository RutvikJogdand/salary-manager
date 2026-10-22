"""Reproducible local workload measurement, not a load-test or hosting SLA."""

import json
import statistics
import sys
import tempfile
from pathlib import Path
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from acme.database import Database
from acme.domain import DirectoryFilter
from acme.employees import list_employees
from acme.reports import compensation_report
from acme.seed import seed


def measure(function):
    samples = []
    for _ in range(30):
        start = perf_counter()
        function()
        samples.append((perf_counter() - start) * 1000)
    return {
        "median_ms": round(statistics.median(samples), 2),
        "max_ms": round(max(samples), 2),
        "runs": len(samples),
    }


with tempfile.TemporaryDirectory() as temp:
    db = Database(str(Path(temp) / "benchmark.sqlite3"))
    db.initialize()
    seed(db)
    results = {
        "employees": 10000,
        "first_page": measure(lambda: list_employees(db, DirectoryFilter())),
        "last_page": measure(lambda: list_employees(db, DirectoryFilter(page=400))),
        "name_search": measure(lambda: list_employees(db, DirectoryFilter(q="Maya"))),
        "INR_department_report": measure(lambda: compensation_report(db, "INR")),
    }
    print(json.dumps(results, indent=2))
