# Read and explain the application

This guide follows concrete tasks rather than listing every function. Open the referenced file alongside each part, finish that part, then move on.

## 1. First agree on what a salary means

Read `REQUIREMENTS.md`, then `backend/acme/domain.py`.

The proposed definition is annual gross base salary. If Maya earns INR 1,200,000.10 a year, the browser sends the string `"1200000.10"`. `to_minor` converts it to integer `120000010` paise. It rejects negative, zero, scientific-notation and over-precision values. That prevents a supposedly simple input like `1.234` from being silently rounded into a different contract amount.

Different countries do not automatically mean different currencies: an employee's country and salary currency are separate fields. The UI leaves the currency unchanged when the country changes.

**Interview point:** This is a documented product decision, not a universal meaning of salary. Monthly compensation, bonuses and currency conversion need clarified rules before implementation.

## 2. Understand one employee row

Read `backend/acme/migrations/001_initial.sql`.

One `employees` row means one person and their current salary. `employee_code` is the external stable identifier; database `id` links audit records. Unique code and email prevent duplicates, even with different letter case. `version` starts at 1 and increases after every accepted edit. `status` makes leavers inactive without deleting their records.

One `audit_events` row means one accepted change. It stores what the record was before, what it became, who made the change and why. Initial records have only an after snapshot. The current table answers “what do we pay now?”; history answers “how did this record change?”

**Interview point:** The demo actor is shared, so the audit trail does not distinguish two real people using the same password. Individual identity/SSO is required before real HR use.

## 3. Follow a salary edit from the screen to storage

Read `frontend/src/EmployeeEditor.tsx`, `backend/acme/main.py`, then `backend/acme/employees.py`.

Maya's record is version 4. HR changes annual pay to `"1400000.25"`, enters “Annual review”, and sends that plus `expected_version: 4`.

The route validates the session, CSRF token and payload. `update_employee` starts a write transaction, reads the stored row and checks its version. If it is still 4, the service updates salary and version 5, inserts the audit event, then commits. The React screen reloads relevant data after success.

If another HR session already saved version 5, the server returns 409. The second form keeps its input and explains how to reopen the latest record. It never silently replaces the first HR manager's change.

If audit insertion fails, the transaction rolls the salary update back. See `test_two_editors_cannot_silently_overwrite_each_other` and `test_audit_failure_rolls_back_salary` in `backend/tests/test_records.py`.

**Interview point:** A version number alone is not sufficient if the read/check/update can race. Here they run inside the same SQLite write transaction.

## 4. Answer a pay question without misleading totals

Read `backend/acme/reports.py` and `frontend/src/Insights.tsx`.

Suppose two active employees receive INR 100.01 and INR 200.02, while someone else receives USD 900,000. An INR report totals INR 300.03. It does not add the dollar amount. The mean/median is INR 150.015, displayed as INR 150.02 using explicit half-up rounding.

Filters control the rows used in the calculation. The entire selected set is aggregated on the server; the UI does not average the current 25-row page. No employees means `null` for mean/median, displayed as a dash, rather than claiming someone earns zero.

**Interview point:** All displayed reports are about annual base pay, not payroll payouts or complete employer cost. Currency comparisons need FX policy; pay equity needs more context than these aggregates.

## 5. Move an Excel workflow into the app

Read `backend/acme/imports.py` and `frontend/src/ImportView.tsx`.

HR downloads a CSV template, fills it, uploads it and clicks Validate. The server checks headers, each employee, duplicate IDs/emails and existing database records. Preview creates no employees.

If row 17 has an invalid salary, the whole import is rejected. After correction, HR confirms a valid preview. The server checks the file checksum and validates everything again inside its write transaction. This second validation matters: another HR session may have added the same employee after preview. The batch and its initial audit events commit together.

Export includes all matching records, not only the visible page. Text beginning with spreadsheet formula syntax is prefixed to prevent execution when opened in Excel. Imports add new records; they intentionally do not overwrite existing pay.

**Interview point:** Preview improves confidence; it is not a reservation or a substitute for validation at commit time.

## 6. Explain authentication honestly

Read `backend/acme/security.py`.

The configured demo password creates an eight-hour session. The browser receives a random HttpOnly cookie; the database stores a hash of its identifier. Mutations need the session's CSRF token. Incorrect login attempts are throttled. Production requires HTTPS and a non-default password of at least 16 characters.

**Interview point:** There is one authorized role in this assessment. Do not claim this is a complete enterprise identity, authorization, account recovery or security-monitoring solution.

## 7. Explain the 10,000-person scale and deployment

Read `backend/acme/seed.py`, `scripts/benchmark.py` and `DEPLOYMENT.md`.

Ten thousand records do not automatically require microservices, queues or a distributed database. The app paginates directory queries, indexes important lookups, bounds imports and computes reports only for a selected currency. Benchmark results are local workload measurements, not a promise about network latency or concurrent users.

SQLite is a file. If that file is on ephemeral hosting storage, employee edits disappear after restart. The deployment therefore needs one persistent volume and one service instance. Re-running the seed recognizes its marker and preserves HR changes. Scaling to multiple independently deployed instances would require shared relational storage such as Postgres.

## 8. Be precise about AI involvement

Read `AI_WORKFLOW.md` and `git log --reverse --oneline`.

AI generated substantial implementation and tests. The requirements commit precedes feature commits. The candidate still needs to run the app, review every rule and be able to explain the paths above before submitting. Do not present generated work or test coverage as proof of personal understanding. Demonstrate understanding with a real edit, a rejected stale edit, an invalid import and a currency-specific report.
