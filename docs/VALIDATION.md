# Validation performed

## Automated checks

- 51 Python tests passed: money precision/invalid inputs; odd/even/empty statistics; salary history; transaction rollback when audit creation fails; two concurrent editors with exactly one success; inactive exclusions; currency/filter correctness; unique identities; literal substring search; stable pagination; reopening the database; immutable audit events; 10,000 deterministic seed records and preservation on rerun; sign-in requirements; CSRF/origin checks; failed-login throttling; production settings; full API create/edit/report flow; malformed CSV; all-or-nothing import; revalidation after preview; export escaping; request-size limit; no-op/employee-ID edit rejection.
- 5 frontend tests passed: exact large monetary display; empty statistics; decimal-string/version/reason submission; retained input on a 409 conflict; no implicit FX conversion when country changes.
- TypeScript checks and Vite production build passed.
- Python statement coverage reported 96% in the latest local run (485 of 505 statements). This is not branch coverage, and the seed CLI is excluded; seed semantics have explicit tests. Coverage is supplementary evidence, not a quality claim on its own.
- A third-party Starlette warning reports that its current TestClient prefers `httpx2` over `httpx`. The pinned tests pass; the warning is retained rather than suppressed.

## Local workload measurements

`python scripts/benchmark.py` creates an isolated 10,000-employee database, then performs 30 repetitions per operation. One observed run:

| Operation | Median | Maximum |
| --- | ---: | ---: |
| First directory page | 0.49 ms | 1.39 ms |
| Page 400 (last page) | 0.71 ms | 1.07 ms |
| Name substring search | 4.89 ms | 5.65 ms |
| INR department report | 2.38 ms | 3.13 ms |

These measure Python service/database functions on this development machine, not HTTP, network, browser rendering, sustained traffic or cloud-host performance. Warm filesystem caches and machine characteristics matter. They establish that the chosen queries are practical for the supplied dataset, not a production SLA.

## Deployed verification

Previously verified GitHub CI run for cd717c7:
https://github.com/RutvikJogdand/salary-manager/actions/runs/40030509632

Candidate-performed checks:
- Salary edits persisted after reopening, with audit history.
- A stale second-tab edit was rejected and proposed input retained.
- Invalid CSV rejected the whole batch.
- A valid two-record import succeeded.
- Repeating the import rejected duplicates.
- Saved data survived a server restart.

Direct browser checks in the previous session:
- Authenticated overview showed 10,002 employees:
  9,567 active and 435 inactive.
- Searching ACME-00239 returned Aarav Brown.
- The editor displayed CAD 133,750 and prior salary changes.
- Tab/Enter navigation reached Employees and opened the editor.
- Initial dialog focus was on Close; Escape dismissed the editor.
- No employee records were changed during these direct checks.

## Remaining verification limits

Full keyboard navigation, focus trapping and mobile layout remain
unverified. Basic keyboard checks do not establish full accessibility.
Some CSV errors expose technical validation messages.

No video has been recorded. Candidate code review and employer
clarifications remain outstanding. No hiring email has been sent.
These are previously observed results, not a new test run.
