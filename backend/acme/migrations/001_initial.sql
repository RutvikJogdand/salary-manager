BEGIN IMMEDIATE;
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    employee_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    country TEXT NOT NULL CHECK(country IN ('IN','US','GB','DE','CA','SG')),
    department TEXT NOT NULL CHECK(department IN ('Engineering','Product','Design','Sales','Operations','People')),
    job_title TEXT NOT NULL,
    hired_on TEXT NOT NULL,
    currency TEXT NOT NULL CHECK(currency IN ('INR','USD','GBP','EUR','CAD','SGD')),
    salary_minor INTEGER NOT NULL CHECK(typeof(salary_minor) = 'integer' AND salary_minor > 0 AND salary_minor < 1000000000000),
    status TEXT NOT NULL CHECK(status IN ('active','inactive')),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX employees_name ON employees(name COLLATE NOCASE, id);
CREATE INDEX employees_reports ON employees(status, currency, country, department, salary_minor);
CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    reason TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX audit_employee ON audit_events(employee_id, id DESC);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'Audit events cannot be updated'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'Audit events cannot be deleted'); END;
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE login_attempts (client_hash TEXT NOT NULL, attempted_at INTEGER NOT NULL);
CREATE INDEX login_window ON login_attempts(client_hash, attempted_at);
CREATE TABLE seed_runs (name TEXT PRIMARY KEY, employee_count INTEGER NOT NULL);
PRAGMA user_version = 1;
COMMIT;
