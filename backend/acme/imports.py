"""Preview and commit share validation. The commit validates again under a write lock."""
import csv
import hashlib
import io

from pydantic import ValidationError

from .domain import DomainError, EmployeeInput
from .employees import insert_employee, serialize

CSV_FIELDS = ["employee_code", "name", "email", "country", "department", "job_title", "hired_on", "currency", "annual_salary", "status"]
MAX_ROWS = 10000


def validate_csv(connection, text):
    if "\x00" in text:
        raise DomainError("CSV contains a null character. Upload a UTF-8 text CSV.")
    reader = csv.DictReader(io.StringIO(text.lstrip("\ufeff")), strict=True)
    if not reader.fieldnames or len(reader.fieldnames) != len(CSV_FIELDS) or set(reader.fieldnames) != set(CSV_FIELDS):
        raise DomainError("CSV headers must match the template exactly.", columns=CSV_FIELDS)
    existing = connection.execute("SELECT employee_code,email FROM employees").fetchall()
    codes = {row["employee_code"].lower() for row in existing}
    emails = {row["email"].lower() for row in existing}
    entries, errors, total = [], [], 0
    try:
        for line, row in enumerate(reader, 2):
            total += 1
            if total > MAX_ROWS:
                raise DomainError(f"Import at most {MAX_ROWS:,} employees per file.")
            try:
                if None in row or any(value is None for value in row.values()):
                    raise DomainError("The number of columns does not match the header.")
                entry = EmployeeInput.model_validate(row)
                if entry.employee_code.lower() in codes:
                    raise DomainError("Employee ID already exists or is repeated in this file.")
                if entry.email in emails:
                    raise DomainError("Email already exists or is repeated in this file.")
                codes.add(entry.employee_code.lower())
                emails.add(entry.email)
                entries.append(entry)
            except (ValidationError, DomainError) as error:
                message = "; ".join(f"{'.'.join(map(str, item['loc']))}: {item['msg']}" for item in error.errors()) if isinstance(error, ValidationError) else error.message
                errors.append({"row": line, "message": message})
    except csv.Error as error:
        raise DomainError("CSV could not be parsed. Export it as UTF-8 CSV with standard quoting.") from error
    if total == 0:
        raise DomainError("The CSV has no employee rows.")
    return entries, errors, total


def preview_csv(db, text):
    with db.transaction(write=False) as connection:
        entries, errors, total = validate_csv(connection, text)
    return {"valid": not errors, "total_rows": total, "valid_rows": len(entries), "error_count": len(errors), "errors": errors[:30],
            "preview": [entry.model_dump(mode="json") for entry in entries[:5]], "checksum": hashlib.sha256(text.encode()).hexdigest()}


def import_csv(db, text, checksum):
    if hashlib.sha256(text.encode()).hexdigest() != checksum:
        raise DomainError("File changed since preview. Validate it again before importing.", 409)
    with db.transaction() as connection:
        entries, errors, _ = validate_csv(connection, text)
        if errors:
            raise DomainError("Import rejected. No employees were added.", errors=errors[:30], error_count=len(errors))
        for entry in entries:
            insert_employee(connection, entry, action="imported")
        return {"imported": len(entries)}


def spreadsheet_safe(value):
    text = str(value)
    # Spreadsheet formulas can start after leading whitespace too.
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) or text.startswith(("\t", "\r", "\n")) else text


def export_csv(db, filters):
    where, params = filters.where()
    with db.transaction(write=False) as connection:
        rows = connection.execute("SELECT * FROM employees" + where + filters.order(), params).fetchall()
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=CSV_FIELDS, lineterminator="\r\n")
    writer.writeheader()
    for row in rows:
        item = serialize(row)
        writer.writerow({key: spreadsheet_safe(item[key]) for key in CSV_FIELDS})
    return output.getvalue()


def csv_template():
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow(CSV_FIELDS)
    writer.writerow(["NEW-10001", "Sample Employee", "sample.employee@example.test", "IN", "Engineering", "Software Engineer", "2025-01-01", "INR", "1800000.00", "active"])
    return output.getvalue()
